"use client";

import { FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, type TestingModel, type TestingResult } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProcessStatus = "idle" | "running" | "completed" | "failed";

export default function TestingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [models, setModels] = useState<TestingModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [vlmQuestion, setVlmQuestion] = useState(
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
  );
  const [paddleTask, setPaddleTask] = useState("ocr");
  const [qianfanPrompt, setQianfanPrompt] = useState("Parse this document to Markdown.");
  const [gotOcrType, setGotOcrType] = useState("ocr");
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
        // Filter to only show paddle_ocr, got_ocr, qianfan, and vlm models
        const filteredModels = data.models.filter((model) => 
          model.type === "paddle_ocr" ||
          model.type === "got_ocr" || 
          model.type === "qianfan_ocr" || 
          model.type === "vlm"
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
  const isVlm = selectedModelInfo?.type === "vlm";
  const isPaddleOcr = selectedModelInfo?.type === "paddle_ocr";
  const isQianfanOcr = selectedModelInfo?.type === "qianfan_ocr";
  const isGotOcr = selectedModelInfo?.type === "got_ocr";

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
        question: isVlm ? vlmQuestion : undefined,
        prompt: isQianfanOcr ? qianfanPrompt : undefined,
        task: isPaddleOcr ? paddleTask : undefined,
        ocrType: isGotOcr ? gotOcrType : undefined,
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
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-4 w-96" />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Testing</h1>
            <p className="mt-1 text-muted-foreground">
              Upload a document and run OCR with any configured model.
            </p>
          </div>
        </FadeIn>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <FadeIn delay={0.05}>
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">1. Upload document</CardTitle>
                <CardDescription>PDF, PNG, JPG, or WEBP · max 10MB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!file ? (
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-center rounded-xl border-2 border-dashed border-border",
                      "bg-muted/30 px-8 py-12 transition-colors hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-10 text-muted-foreground" />
                    <p className="mt-4 font-medium">Drop your document here</p>
                    <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <FileText className="size-8 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearFile}>
                      <X className="size-4" />
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

                <div className="space-y-2">
                  <Label htmlFor="model">2. Select model</Label>
                  <select
                    id="model"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    {models.map((model) => (
                      <option key={model.slug} value={model.slug}>
                        {model.display_name} ({model.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  {selectedModelInfo && selectedModelInfo.capability_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedModelInfo.capability_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {isVlm && (
                  <div className="space-y-2">
                    <Label htmlFor="question">VLM prompt (optional)</Label>
                    <Textarea
                      id="question"
                      value={vlmQuestion}
                      onChange={(e) => setVlmQuestion(e.target.value)}
                      rows={3}
                      placeholder="Question or instruction for the vision model…"
                    />
                  </div>
                )}

                {isQianfanOcr && (
                  <div className="space-y-2">
                    <Label htmlFor="qianfan-prompt">Qianfan-OCR prompt (optional)</Label>
                    <Textarea
                      id="qianfan-prompt"
                      value={qianfanPrompt}
                      onChange={(e) => setQianfanPrompt(e.target.value)}
                      rows={3}
                      placeholder="Instruction for document parsing…"
                    />
                  </div>
                )}

                {isGotOcr && (
                  <div className="space-y-2">
                    <Label htmlFor="got-ocr-type">GOT-OCR recognition type</Label>
                    <select
                      id="got-ocr-type"
                      value={gotOcrType}
                      onChange={(e) => setGotOcrType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="ocr">Plain text OCR</option>
                      <option value="format">Format OCR (preserves layout &amp; structure)</option>
                    </select>
                  </div>
                )}

                {isPaddleOcr && (
                  <div className="space-y-2">
                    <Label htmlFor="task">Recognition task</Label>
                    <select
                      id="task"
                      value={paddleTask}
                      onChange={(e) => setPaddleTask(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="ocr">OCR (text extraction)</option>
                      <option value="table">Table recognition</option>
                      <option value="chart">Chart recognition</option>
                      <option value="formula">Formula recognition</option>
                      <option value="spotting">Text spotting</option>
                      <option value="seal">Seal recognition</option>
                    </select>
                  </div>
                )}

                <Button
                  onClick={handleProcess}
                  disabled={!file || !selectedModel || status === "running"}
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {status === "running" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      Process document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">3. Results</CardTitle>
                <CardDescription>
                  {result
                    ? `Processed with ${result.model_name}`
                    : "Output will appear here after processing"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status === "idle" && (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                      Upload a document and click Process to see results
                    </p>
                  </div>
                )}

                {status === "running" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Running {selectedModelInfo?.display_name}…
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}

                {status === "failed" && (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5">
                    <p className="text-sm text-destructive">
                      Processing failed. Check your file and model selection, then try again.
                    </p>
                  </div>
                )}

                {status === "completed" && result?.result?.text && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{result.model_type.toUpperCase()}</Badge>
                      {result.result.confidence != null && (
                        <Badge variant="outline">
                          {(result.result.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                      {result.result.timing_ms != null && (
                        <Badge variant="outline">{Math.round(result.result.timing_ms)}ms</Badge>
                      )}
                      {result.result.pages && (
                        <Badge variant="outline">{result.result.pages.length} pages</Badge>
                      )}
                    </div>
                    <ScrollArea className="h-[28rem] rounded-lg border border-border bg-klarix-jet p-4">
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-klarix-cyan">
                        {result.result.text}
                      </pre>
                    </ScrollArea>
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
