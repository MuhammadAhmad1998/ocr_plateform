"use client";

import {
  Bot,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, type TestingModel, type TestingResult } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProcessStatus = "idle" | "running" | "completed" | "failed";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

type ModelTypeMeta = {
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  bg: string;
  iconBg: string;
  border: string;
  text: string;
};

const MODEL_TYPE_META: Record<string, ModelTypeMeta> = {
  paddle_ocr: {
    label: "PaddleOCR",
    short: "Paddle",
    description: "Multi-task OCR with table, chart, formula and seal recognition.",
    icon: Layers,
    bg: "from-indigo-500/15 via-violet-500/8 to-indigo-500/5",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
    border: "border-indigo-500/40",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  got_ocr: {
    label: "GOT-OCR",
    short: "GOT",
    description: "Unified end-to-end OCR with format-preserving output.",
    icon: FileText,
    bg: "from-emerald-500/15 via-teal-500/8 to-emerald-500/5",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
    border: "border-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  qianfan_ocr: {
    label: "Qianfan OCR",
    short: "Qianfan",
    description: "Cloud document parsing to clean Markdown.",
    icon: Sparkles,
    bg: "from-fuchsia-500/15 via-pink-500/8 to-fuchsia-500/5",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/30",
    border: "border-fuchsia-500/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  vlm: {
    label: "Vision LLM",
    short: "VLM",
    description: "Ask any question of your document with a vision-language model.",
    icon: Bot,
    bg: "from-amber-500/15 via-orange-500/8 to-amber-500/5",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
    border: "border-amber-500/40",
    text: "text-amber-700 dark:text-amber-300",
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function TestingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [models, setModels] = useState<TestingModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [vlmQuestion, setVlmQuestion] = useState(
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
  );
  const [paddleTask, setPaddleTask] = useState("ocr");
  const [qianfanPrompt, setQianfanPrompt] = useState("Parse this document to Markdown.");
  const [gotOcrType, setGotOcrType] = useState("ocr");
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [result, setResult] = useState<TestingResult | null>(null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .getTestingModels()
      .then((data) => {
        const filteredModels = data.models.filter(
          (m) =>
            m.type === "paddle_ocr" ||
            m.type === "got_ocr" ||
            m.type === "qianfan_ocr" ||
            m.type === "vlm"
        );
        setModels(filteredModels);
        if (filteredModels.length > 0) setSelectedModel(filteredModels[0].slug);
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

  const modelsByType = useMemo(() => {
    const order = ["paddle_ocr", "got_ocr", "qianfan_ocr", "vlm"] as const;
    const map: Record<string, TestingModel[]> = {};
    for (const m of models) (map[m.type] ??= []).push(m);
    return order.filter((k) => map[k]?.length).map((k) => ({ type: k, items: map[k] }));
  }, [models]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const handleFileSelect = useCallback((selected: File) => {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Only PDF, PNG, JPG, or WEBP files are supported");
      return;
    }
    if (selected.size > MAX_BYTES) {
      toast.error("File is too large — max 10 MB");
      return;
    }
    setFile(selected);
    setResult(null);
    setStatus("idle");
    setActivePageIdx(0);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  function clearFile() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setActivePageIdx(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  const handleProcess = useCallback(async () => {
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
      setActivePageIdx(0);
      toast.success("Processing complete");
    } catch (err) {
      setStatus("failed");
      toast.error(err instanceof Error ? err.message : "Processing failed");
    }
  }, [
    file,
    selectedModel,
    isVlm,
    isQianfanOcr,
    isPaddleOcr,
    isGotOcr,
    vlmQuestion,
    qianfanPrompt,
    paddleTask,
    gotOcrType,
  ]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (file && selectedModel && status !== "running") {
          e.preventDefault();
          handleProcess();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, selectedModel, status, handleProcess]);

  const pages = result?.result?.pages;
  const activeText = pages?.length
    ? pages[activePageIdx]?.text ?? ""
    : result?.result?.text ?? "";

  const stats = useMemo(() => {
    const text = activeText;
    const trimmed = text.trim();
    return {
      chars: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      lines: text ? text.split("\n").length : 0,
    };
  }, [activeText]);

  function copyOutput() {
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    toast.success("Output copied");
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadOutput() {
    if (!activeText) return;
    const blob = new Blob([activeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = file?.name?.replace(/\.[^.]+$/, "") ?? "ocr-result";
    a.download = `${base}-${selectedModelInfo?.slug ?? "result"}${
      pages?.length ? `-p${activePageIdx + 1}` : ""
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loadingModels) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BgOrbs />
        <Navbar />
        <main className="relative z-10 space-y-8 px-4 py-8 lg:px-8">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />
      <Navbar />

      <main className="relative z-10 space-y-8 px-4 py-8 lg:px-8">
        {/* ========== HERO ========== */}
        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-fuchsia-500/10 via-amber-500/5 to-emerald-500/10 p-6 shadow-xl sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-amber-500/15 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
                  <FlaskConical className="size-3 text-fuchsia-500" />
                  Testing Lab
                </div>
                <h1 className="bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-500 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-fuchsia-300 dark:via-rose-300 dark:to-amber-300 sm:text-5xl">
                  Benchmark any model
                  <br className="hidden sm:block" />
                  on any document.
                </h1>
                <p className="max-w-xl text-base text-muted-foreground">
                  Upload a sample, pick an engine, and instantly see how each OCR model handles
                  your content.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <Sparkles className="size-4 text-amber-500" />
                <span>
                  <span className="font-extrabold text-foreground">{models.length}</span> engines
                  ready
                </span>
              </div>
            </div>
          </section>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ========== LEFT: CONFIG ========== */}
          <FadeIn delay={0.05}>
            <div className="space-y-6 rounded-3xl border border-border/60 bg-card shadow-md">
              {/* Step header */}
              <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-fuchsia-500/8 to-amber-500/8 px-6 py-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-md shadow-fuchsia-500/30">
                  <span className="text-base font-extrabold">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Upload &amp; configure</h2>
                  <p className="text-xs text-muted-foreground">
                    PDF, PNG, JPG, WEBP · max 10 MB
                  </p>
                </div>
              </div>

              <div className="space-y-6 px-6 pb-6">
                {/* ========= DROP ZONE ========= */}
                {!file ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 transition-all",
                      dragOver
                        ? "scale-[1.01] border-fuchsia-400 bg-gradient-to-br from-fuchsia-500/15 to-rose-500/10 shadow-lg"
                        : "border-border bg-gradient-to-br from-muted/40 to-muted/10 hover:border-fuchsia-400/50 hover:from-fuchsia-500/8 hover:to-rose-500/5"
                    )}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-fuchsia-400/15 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative flex flex-col items-center gap-4">
                      <div
                        className={cn(
                          "flex size-16 items-center justify-center rounded-2xl shadow-lg transition-all group-hover:scale-110",
                          dragOver
                            ? "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-fuchsia-500/40"
                            : "bg-background text-muted-foreground group-hover:bg-gradient-to-br group-hover:from-fuchsia-500 group-hover:to-rose-500 group-hover:text-white"
                        )}
                      >
                        <Upload className="size-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-foreground">
                          {dragOver ? "Drop to upload" : "Drag & drop or click to browse"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          PDF, PNG, JPG, or WEBP · max 10 MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/8 to-rose-500/5 p-4 shadow-md">
                    <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-fuchsia-400/30 blur-2xl" />
                    <div className="relative flex items-center gap-4">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="size-16 shrink-0 rounded-xl border-2 border-fuchsia-500/30 object-cover shadow-md"
                        />
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/30">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="size-7" />
                          ) : (
                            <FileText className="size-7" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {file.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full bg-background/70 px-2 py-0.5 font-bold uppercase tracking-wider">
                            {file.type.split("/")[1] ?? "file"}
                          </span>
                          <span>{formatBytes(file.size)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fileRef.current?.click()}
                          className="h-7 gap-1.5 rounded-full text-[11px]"
                          title="Replace file"
                        >
                          <RotateCcw className="size-3" />
                          Replace
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFile}
                          className="h-7 gap-1.5 rounded-full text-[11px] text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <X className="size-3" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                  }
                />

                {/* ========= MODEL PICKER (VISUAL CARDS) ========= */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-xs font-extrabold text-white shadow-md shadow-fuchsia-500/30">
                      2
                    </div>
                    <Label className="text-sm font-bold text-foreground">Choose an engine</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {modelsByType.map(({ type, items }) => {
                      const meta = MODEL_TYPE_META[type];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      const isActive = items.some((m) => m.slug === selectedModel);
                      const firstSlug = items[0].slug;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedModel(firstSlug)}
                          className={cn(
                            "group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-4 text-left transition-all",
                            meta.bg,
                            isActive
                              ? cn(meta.border, "shadow-lg scale-[1.02]")
                              : "border-border/60 hover:scale-[1.01] hover:border-border"
                          )}
                        >
                          {isActive && (
                            <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-md">
                              <Check className="size-3" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "mb-3 inline-flex size-10 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                              meta.iconBg
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <p className={cn("text-sm font-extrabold", meta.text)}>
                            {meta.short}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {meta.description}
                          </p>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {items.length} {items.length === 1 ? "model" : "models"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* If the active engine type has multiple models, show a pill selector */}
                  {(() => {
                    const activeType = selectedModelInfo?.type;
                    const group = modelsByType.find((g) => g.type === activeType);
                    if (!group || group.items.length < 2) return null;
                    return (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Choose variant
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((m) => {
                            const isSel = m.slug === selectedModel;
                            return (
                              <button
                                key={m.slug}
                                type="button"
                                onClick={() => setSelectedModel(m.slug)}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                                  isSel
                                    ? "border-transparent bg-foreground text-background shadow-md"
                                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                )}
                              >
                                {m.display_name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedModelInfo && selectedModelInfo.capability_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedModelInfo.capability_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                        >
                          {tag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========= MODEL-SPECIFIC ========= */}
                {isVlm && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="question"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      VLM prompt
                    </Label>
                    <Textarea
                      id="question"
                      value={vlmQuestion}
                      onChange={(e) => setVlmQuestion(e.target.value)}
                      rows={3}
                      placeholder="Question or instruction for the vision model…"
                      className="resize-y rounded-xl border-2 focus-visible:ring-amber-500/20"
                    />
                  </div>
                )}

                {isQianfanOcr && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="qianfan-prompt"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Qianfan prompt
                    </Label>
                    <Textarea
                      id="qianfan-prompt"
                      value={qianfanPrompt}
                      onChange={(e) => setQianfanPrompt(e.target.value)}
                      rows={3}
                      placeholder="Instruction for document parsing…"
                      className="resize-y rounded-xl border-2 focus-visible:ring-fuchsia-500/20"
                    />
                  </div>
                )}

                {isGotOcr && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="got-ocr-type"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Recognition type
                    </Label>
                    <select
                      id="got-ocr-type"
                      value={gotOcrType}
                      onChange={(e) => setGotOcrType(e.target.value)}
                      className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20"
                    >
                      <option value="ocr">Plain text OCR</option>
                      <option value="format">Format OCR (preserves layout)</option>
                    </select>
                  </div>
                )}

                {isPaddleOcr && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="task"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Recognition task
                    </Label>
                    <select
                      id="task"
                      value={paddleTask}
                      onChange={(e) => setPaddleTask(e.target.value)}
                      className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
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

                {/* ========= RUN BUTTON ========= */}
                <div className="space-y-2">
                  <Button
                    onClick={handleProcess}
                    disabled={!file || !selectedModel || status === "running"}
                    className="h-14 w-full gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 text-base font-extrabold text-white shadow-xl shadow-fuchsia-500/30 transition-all hover:scale-[1.01] hover:shadow-2xl disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                  >
                    {status === "running" ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Zap className="size-5" />
                        Run OCR Processing
                        <Play className="size-5" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Press{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>{" "}
                    +{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
                    to run
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* ========== RIGHT: RESULTS ========== */}
          <FadeIn delay={0.1}>
            <div className="rounded-3xl border border-border/60 bg-card shadow-md">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
                    <span className="text-base font-extrabold">2</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Results</h2>
                    <p className="text-xs text-muted-foreground">
                      {result
                        ? `Processed with ${result.model_name}`
                        : "Output will appear here"}
                    </p>
                  </div>
                </div>
                {status === "completed" && (
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyOutput}
                      className="h-8 gap-1.5 rounded-full text-xs"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadOutput}
                      className="h-8 gap-1.5 rounded-full text-xs"
                    >
                      <Download className="size-3.5" />
                      .txt
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {status === "idle" && (
                  <div className="flex h-[28rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-muted/30 to-transparent text-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-emerald-500/20 blur-2xl" />
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/30">
                        <Eye className="size-7" />
                      </div>
                    </div>
                    <p className="text-base font-bold text-foreground">No results yet</p>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                      Upload a document, choose an engine and click{" "}
                      <span className="font-bold text-foreground">Run</span> to see results.
                    </p>
                  </div>
                )}

                {status === "running" && (
                  <div className="space-y-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-cyan-500/5 p-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
                        <div className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30">
                          <Loader2 className="size-5 animate-spin" />
                        </div>
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground">
                          Processing with {selectedModelInfo?.display_name}…
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This may take a few seconds.
                        </p>
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                  </div>
                )}

                {status === "failed" && (
                  <div className="flex h-[28rem] flex-col items-center justify-center rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-6 text-center">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-xl shadow-rose-500/30">
                      <X className="size-7" />
                    </div>
                    <p className="text-base font-bold text-rose-700 dark:text-rose-300">
                      Processing failed
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      Check your file and model selection, then try again.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleProcess}
                      disabled={!file}
                      className="mt-4 gap-1.5 rounded-full border-2"
                    >
                      <RotateCcw className="size-3.5" />
                      Retry
                    </Button>
                  </div>
                )}

                {status === "completed" && result && (
                  <div className="space-y-4">
                    {/* STATS */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Tile
                        label="Engine"
                        value={result.model_type.toUpperCase()}
                        accent="fuchsia"
                      />
                      {result.result.confidence != null ? (
                        <Tile
                          label="Confidence"
                          value={`${(result.result.confidence * 100).toFixed(0)}%`}
                          accent="emerald"
                        />
                      ) : (
                        <Tile label="Words" value={stats.words.toLocaleString()} accent="emerald" />
                      )}
                      {result.result.timing_ms != null && (
                        <Tile
                          label="Time"
                          value={formatDuration(result.result.timing_ms)}
                          accent="cyan"
                        />
                      )}
                      <Tile
                        label={pages?.length ? "Pages" : "Chars"}
                        value={
                          pages?.length
                            ? `${pages.length}`
                            : stats.chars.toLocaleString()
                        }
                        accent="indigo"
                      />
                    </div>

                    {/* Page tabs */}
                    {pages && pages.length > 1 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pages.map((p, idx) => (
                          <button
                            key={p.page_number}
                            type="button"
                            onClick={() => setActivePageIdx(idx)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                              activePageIdx === idx
                                ? "border-transparent bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30"
                                : "border-border bg-background text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"
                            )}
                          >
                            Page {p.page_number}
                            <span className="ml-1.5 opacity-70">
                              · {formatDuration(p.processing_time_ms)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* IDE-style output */}
                    {activeText ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-rose-400" />
                            <span className="size-2.5 rounded-full bg-amber-400" />
                            <span className="size-2.5 rounded-full bg-emerald-400" />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {file?.name?.replace(/\.[^.]+$/, "") ?? "output"}.txt
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {stats.lines.toLocaleString()} lines
                          </span>
                        </div>
                        <ScrollArea className="h-[30rem]">
                          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-emerald-300 p-5">
                            {activeText}
                          </pre>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        No text returned for this page.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
                        · {stats.lines.toLocaleString()} lines
                      </span>
                      {pages?.length ? (
                        <span>
                          Page {activePageIdx + 1} of {pages.length}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}

/* ========== COMPONENTS ========== */

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-10 size-96 rounded-full bg-fuchsia-500/8 blur-3xl dark:bg-fuchsia-500/12" />
      <div className="absolute right-0 top-1/3 size-96 rounded-full bg-amber-500/8 blur-3xl dark:bg-amber-500/12" />
      <div className="absolute -bottom-20 left-1/3 size-96 rounded-full bg-emerald-500/8 blur-3xl dark:bg-emerald-500/12" />
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "fuchsia" | "emerald" | "cyan" | "indigo";
}) {
  const palette = {
    fuchsia:
      "from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300",
    emerald:
      "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
    indigo:
      "from-indigo-500/15 to-indigo-500/5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
  } as const;
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br px-3 py-2.5 shadow-sm",
        palette[accent]
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
