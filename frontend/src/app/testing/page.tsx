"use client";

import { Copy, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, type TestingModel, type TestingResult } from "@/lib/api";
import {
  formatOutputFormatLabel,
  OCR_OUTPUT_FORMATS,
  SUPPORTED_TESTING_MODEL_TYPES,
  tryFormatJson,
  type OcrOutputFormat,
} from "@/lib/ocr-formats";
import { cn } from "@/lib/utils";

type ProcessStatus = "idle" | "running" | "completed" | "failed";

const selectClassName = cn(
  "flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm",
  "ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
);

function ResultViewer({ text, outputFormat }: { text: string; outputFormat?: string }) {
  const { formatted, isJson } = useMemo(() => tryFormatJson(text), [text]);
  const showPretty = isJson || outputFormat === "json";

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => copyText(formatted)}>
          <Copy className="size-4" />
          Copy output
        </Button>
      </div>

      {showPretty ? (
        <Tabs defaultValue="pretty">
          <TabsList>
            <TabsTrigger value="pretty">Pretty</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <TabsContent value="pretty">
            <ScrollArea className="h-[32rem] rounded-xl border-2 border-border bg-slate-950 p-6 shadow-inner">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-green-400">
                {formatted}
              </pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="raw">
            <ScrollArea className="h-[32rem] rounded-xl border-2 border-border bg-slate-950 p-6 shadow-inner">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-green-400">
                {text}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      ) : (
        <ScrollArea className="h-[32rem] rounded-xl border-2 border-border bg-slate-950 p-6 shadow-inner">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-green-400">
            {text}
          </pre>
        </ScrollArea>
      )}
    </div>
  );
}

export default function TestingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [models, setModels] = useState<TestingModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [outputFormat, setOutputFormat] = useState<OcrOutputFormat>("markdown");
  const [customInstruction, setCustomInstruction] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [result, setResult] = useState<TestingResult | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .getTestingModels()
      .then((data) => {
        const filteredModels = data.models.filter((model) =>
          SUPPORTED_TESTING_MODEL_TYPES.has(model.type)
        );
        setModels(filteredModels);
        if (filteredModels.length > 0) {
          setSelectedModel(filteredModels[0].slug);
        }
      })
      .catch(() => {
        toast.error("Failed to load models");
        router.push("/login");
      })
      .finally(() => setLoadingModels(false));
  }, [router]);

  const selectedModelInfo = models.find((m) => m.slug === selectedModel);
  const supportsThinking =
    selectedModelInfo?.type === "vlm" || selectedModelInfo?.type === "infinity_parser";

  function handleFileSelect(selected: File) {
    setFile(selected);
    setResult(null);
    setStatus("idle");
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleProcess() {
    if (!file || !selectedModel) return;

    setStatus("running");
    setResult(null);

    try {
      const response = await api.runTesting(file, selectedModel, {
        outputFormat,
        prompt: customInstruction.trim() || undefined,
        enableThinking: supportsThinking ? enableThinking : undefined,
      });
      setResult(response);
      setStatus("completed");
      toast.success("Processing complete");
    } catch (err) {
      setStatus("failed");
      toast.error(err instanceof Error ? err.message : "Processing failed");
    }
  }

  if (loadingModels) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="space-y-8 px-4 py-8 lg:px-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="space-y-10 px-4 py-8 lg:px-8">
        <FadeIn>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">OCR Testing Lab</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Upload a document, pick a model and output format, then compare OCR results.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-8 lg:grid-cols-2">
          <FadeIn delay={0.05}>
            <Card className="overflow-hidden border-border shadow-lg">
              <CardHeader className="space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    1
                  </div>
                  <CardTitle className="text-xl">Upload Document</CardTitle>
                </div>
                <CardDescription>PDF, PNG, JPG, or WEBP · max 10MB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!file ? (
                  <button
                    type="button"
                    className={cn(
                      "group flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-border",
                      "bg-muted/30 px-8 py-16 transition-all hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.02]"
                    )}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-14 text-muted-foreground transition-transform group-hover:scale-110" />
                    <p className="mt-6 text-base font-semibold text-foreground">Drop your document here</p>
                    <p className="mt-2 text-sm text-muted-foreground">or click to browse files</p>
                  </button>
                ) : (
                  <div className="flex items-center gap-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 shadow-sm">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <FileText className="size-8 shrink-0 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearFile}
                      className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-5" />
                    </Button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      2
                    </div>
                    <Label htmlFor="model" className="text-base font-semibold text-foreground">
                      Select OCR Model
                    </Label>
                  </div>
                  <select
                    id="model"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={selectClassName}
                  >
                    {models.map((model) => (
                      <option key={model.slug} value={model.slug}>
                        {model.display_name}
                      </option>
                    ))}
                  </select>
                  {selectedModelInfo && selectedModelInfo.capability_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedModelInfo.capability_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-3 py-1 text-xs font-semibold shadow-sm">
                          {tag.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="output-format" className="text-base font-semibold text-foreground">
                    Output Format
                  </Label>
                  <select
                    id="output-format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as OcrOutputFormat)}
                    className={selectClassName}
                  >
                    {OCR_OUTPUT_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label} — {format.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Format is mapped automatically per model (e.g. JSON uses layout extraction on
                    Infinity-Parser2-Flash, table mode on PaddleOCR).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-instruction">Custom instruction (optional)</Label>
                  <Textarea
                    id="custom-instruction"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    rows={3}
                    placeholder="Override the default prompt for this output format…"
                  />
                </div>

                {supportsThinking && (
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={enableThinking}
                      onChange={(e) => setEnableThinking(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable thinking mode</p>
                      <p className="text-xs text-muted-foreground">
                        Slower but may improve complex document reasoning
                      </p>
                    </div>
                  </label>
                )}

                <Button
                  onClick={handleProcess}
                  disabled={!file || !selectedModel || status === "running"}
                  className="h-14 w-full gap-2 bg-primary text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {status === "running" ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Processing Document...
                    </>
                  ) : (
                    <>
                      <Play className="size-5" />
                      Run OCR Processing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="overflow-hidden border-border shadow-lg">
              <CardHeader className="space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    3
                  </div>
                  <CardTitle className="text-xl">Results</CardTitle>
                </div>
                <CardDescription>
                  {result
                    ? `Processed with ${result.model_name}`
                    : "Output will appear here after processing"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {status === "idle" && (
                  <div className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20">
                    <div className="text-center">
                      <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-4">
                        <FileText className="size-10 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">No results yet</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload a document and click Process to see OCR results
                      </p>
                    </div>
                  </div>
                )}

                {status === "running" && (
                  <div className="space-y-4 rounded-xl bg-muted/30 p-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-base font-semibold text-foreground">
                        Processing with {selectedModelInfo?.display_name}…
                      </span>
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  </div>
                )}

                {status === "failed" && (
                  <div className="flex h-96 items-center justify-center rounded-xl border-2 border-destructive/30 bg-destructive/5">
                    <div className="text-center">
                      <X className="mx-auto mb-4 size-12 text-destructive" />
                      <p className="font-semibold text-destructive">Processing Failed</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Check your file and model selection, then try again
                      </p>
                    </div>
                  </div>
                )}

                {status === "completed" && result?.result?.text && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary px-3 py-1 text-xs font-bold shadow-sm">
                        {result.model_type.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      {result.result.output_format && (
                        <Badge variant="outline" className="px-3 py-1 shadow-sm">
                          {formatOutputFormatLabel(result.result.output_format)}
                        </Badge>
                      )}
                      {result.result.confidence != null && (
                        <Badge variant="secondary" className="px-3 py-1 shadow-sm">
                          {(result.result.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                      {result.result.timing_ms != null && (
                        <Badge variant="secondary" className="px-3 py-1 shadow-sm">
                          {Math.round(result.result.timing_ms)}ms
                        </Badge>
                      )}
                      {result.result.pages && (
                        <Badge variant="secondary" className="px-3 py-1 shadow-sm">
                          {result.result.pages.length} pages
                        </Badge>
                      )}
                    </div>
                    <ResultViewer
                      text={result.result.text}
                      outputFormat={result.result.output_format}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
