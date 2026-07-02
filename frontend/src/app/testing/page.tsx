"use client";

import {
  Bot,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Infinity,
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
import { AppSidebar } from "@/components/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, type TestingModel, type TestingResult } from "@/lib/api";
import {
  formatOutputFormatLabel,
  OCR_OUTPUT_FORMATS,
  SUPPORTED_TESTING_MODEL_TYPES,
  type OcrOutputFormat,
} from "@/lib/ocr-formats";
import { cn } from "@/lib/utils";

type ProcessStatus = "idle" | "running" | "completed" | "failed";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

type ModelTypeMeta = {
  label: string; short: string; description: string; icon: LucideIcon;
};

const MODEL_TYPE_META: Record<string, ModelTypeMeta> = {
  paddle_ocr:       { label: "PaddleOCR",    short: "Paddle",   description: "Multi-task OCR with table, chart, formula and seal recognition.",           icon: Layers },
  got_ocr:          { label: "GOT-OCR",      short: "GOT",      description: "Unified end-to-end OCR with format-preserving output.",                      icon: FileText },
  qianfan_ocr:      { label: "Qianfan OCR",  short: "Qianfan",  description: "Cloud document parsing to clean Markdown.",                                  icon: Sparkles },
  vlm:              { label: "Vision LLM",   short: "VLM",      description: "Ask any question of your document with a vision-language model.",            icon: Bot },
  infinity_parser:  { label: "Infinity",     short: "Infinity", description: "Fast document parsing with layout, tables, charts and Markdown output.",     icon: Infinity },
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

/* Shared style tokens */
const border = { border: "0.5px solid rgb(var(--border))" } as const;
const card = { background: "rgb(var(--surface-1))", ...border, borderRadius: "12px" } as const;

export default function TestingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<TestingModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [vlmQuestion, setVlmQuestion] = useState("Extract all text from this document.");
  const [paddleTask, setPaddleTask] = useState("ocr");
  const [qianfanPrompt, setQianfanPrompt] = useState("Parse this document to Markdown.");
  const [gotOcrType, setGotOcrType] = useState("ocr");
  const [outputFormat, setOutputFormat] = useState<OcrOutputFormat>("markdown");
  const [customInstruction, setCustomInstruction] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [result, setResult] = useState<TestingResult | null>(null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.getTestingModels()
      .then((data) => {
        const filtered = data.models.filter((m) => SUPPORTED_TESTING_MODEL_TYPES.has(m.type));
        setModels(filtered);
        if (filtered.length > 0) setSelectedModel(filtered[0].slug);
      })
      .catch(() => { toast.error("Failed to load models"); router.push("/login"); })
      .finally(() => setLoadingModels(false));
  }, [router]);

  const selectedModelInfo = models.find((m) => m.slug === selectedModel);
  const isVlm = selectedModelInfo?.type === "vlm";
  const isPaddleOcr = selectedModelInfo?.type === "paddle_ocr";
  const isQianfanOcr = selectedModelInfo?.type === "qianfan_ocr";
  const isGotOcr = selectedModelInfo?.type === "got_ocr";
  const isInfinityParser = selectedModelInfo?.type === "infinity_parser";
  const supportsThinking = isVlm || isInfinityParser;

  const modelsByType = useMemo(() => {
    const order = ["paddle_ocr", "got_ocr", "qianfan_ocr", "infinity_parser", "vlm"] as const;
    const map: Record<string, TestingModel[]> = {};
    for (const m of models) (map[m.type] ??= []).push(m);
    return order.filter((k) => map[k]?.length).map((k) => ({ type: k, items: map[k] }));
  }, [models]);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const handleFileSelect = useCallback((selected: File) => {
    if (!ACCEPTED_TYPES.includes(selected.type)) { toast.error("Only PDF, PNG, JPG, or WEBP files are supported"); return; }
    if (selected.size > MAX_BYTES) { toast.error("File is too large — max 10 MB"); return; }
    setFile(selected); setResult(null); setStatus("idle"); setActivePageIdx(0);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  function clearFile() {
    setFile(null); setResult(null); setStatus("idle"); setActivePageIdx(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  const handleProcess = useCallback(async () => {
    if (!file || !selectedModel) return;
    setStatus("running"); setResult(null);
    try {
      const response = await api.runTesting(file, selectedModel, {
        question: isVlm ? vlmQuestion : undefined,
        prompt: isQianfanOcr ? qianfanPrompt : isInfinityParser ? customInstruction.trim() || undefined : undefined,
        task: isPaddleOcr ? paddleTask : undefined,
        ocrType: isGotOcr ? gotOcrType : undefined,
        outputFormat: isInfinityParser ? outputFormat : undefined,
        enableThinking: supportsThinking ? enableThinking : undefined,
      });
      setResult(response); setStatus("completed"); setActivePageIdx(0); toast.success("Processing complete");
    } catch (err) {
      setStatus("failed"); toast.error(err instanceof Error ? err.message : "Processing failed");
    }
  }, [file, selectedModel, isVlm, isQianfanOcr, isPaddleOcr, isGotOcr, isInfinityParser, supportsThinking, vlmQuestion, qianfanPrompt, paddleTask, gotOcrType, outputFormat, customInstruction, enableThinking]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && file && selectedModel && status !== "running") {
        e.preventDefault(); handleProcess();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, selectedModel, status, handleProcess]);

  const pages = result?.result?.pages;
  const activeText = pages?.length ? pages[activePageIdx]?.text ?? "" : result?.result?.text ?? "";
  const stats = useMemo(() => {
    const trimmed = activeText.trim();
    return { chars: activeText.length, words: trimmed ? trimmed.split(/\s+/).length : 0, lines: activeText ? activeText.split("\n").length : 0 };
  }, [activeText]);

  function copyOutput() {
    if (!activeText) return;
    navigator.clipboard.writeText(activeText); setCopied(true); toast.success("Output copied");
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadOutput() {
    if (!activeText) return;
    const blob = new Blob([activeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, "") ?? "ocr-result"}-${selectedModelInfo?.slug ?? "result"}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loadingModels) {
    return (
      <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
        <AppSidebar />
        <main className="space-y-5 px-4 py-6 lg:px-8">
          <Skeleton className="h-32 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
            <Skeleton className="h-96 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
      <AppSidebar />
      <main className="px-4 py-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <div className="font-mono text-[11px] uppercase tracking-[1px] mb-1.5" style={{ color: "rgb(var(--teal))" }}>
            Testing Lab
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
            Benchmark any model on any document.
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgb(var(--text-2))" }}>
            Upload a sample, pick an engine, and instantly see how each OCR model handles your content.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* ========= LEFT: CONFIG ========= */}
          <div style={card} className="overflow-hidden">
            <SectionHead number={1} title="Upload & configure" subtitle="PDF, PNG, JPG, WEBP · max 10 MB" />
            <div className="space-y-5 p-5">
              {/* Drop zone */}
              {!file ? (
                <div
                  role="button" tabIndex={0}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className="cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all"
                  style={{
                    borderColor: dragOver ? "rgb(var(--teal))" : "rgb(var(--border-strong))",
                    background: dragOver ? "rgb(var(--teal-bg))" : "rgb(var(--surface-2))",
                  }}
                >
                  <Upload className="mx-auto mb-3 size-8" style={{ color: dragOver ? "rgb(var(--teal))" : "rgb(var(--text-3))" }} />
                  <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>
                    {dragOver ? "Drop to upload" : "Drag & drop or click to browse"}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "rgb(var(--text-2))" }}>PDF, PNG, JPG, or WEBP · max 10 MB</p>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))" }}
                >
                  <div className="flex items-center gap-4">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={file.name} className="size-14 shrink-0 rounded-lg object-cover" style={{ border: "0.5px solid rgb(var(--teal-border))" }} />
                    ) : (
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}>
                        {file.type.startsWith("image/") ? <ImageIcon className="size-6" /> : <FileText className="size-6" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>{file.name}</p>
                      <p className="mt-0.5 font-mono text-xs" style={{ color: "rgb(var(--text-2))" }}>{formatBytes(file.size)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgb(var(--surface-2))]" style={{ color: "rgb(var(--text-2))" }}>
                        <RotateCcw className="size-3.5" />
                      </button>
                      <button type="button" onClick={clearFile} className="rounded-md px-2.5 py-1.5 text-xs transition-colors hover:text-[rgb(var(--coral))]" style={{ color: "rgb(var(--text-3))" }}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

              {/* Engine picker */}
              <div>
                <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Choose an engine</div>
                <div className="grid grid-cols-2 gap-2">
                  {modelsByType.map(({ type, items }) => {
                    const meta = MODEL_TYPE_META[type];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const isActive = items.some((m) => m.slug === selectedModel);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedModel(items[0].slug)}
                        className="relative rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
                        style={{
                          background: isActive ? "rgb(var(--teal-bg))" : "rgb(var(--surface-2))",
                          border: isActive ? "0.5px solid rgb(var(--teal))" : "0.5px solid rgb(var(--border))",
                        }}
                      >
                        {isActive && (
                          <div
                            className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full"
                            style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
                          >
                            <Check className="size-2.5" />
                          </div>
                        )}
                        <Icon className="mb-2 size-5" style={{ color: isActive ? "rgb(var(--teal))" : "rgb(var(--text-2))" }} />
                        <p className="text-sm font-semibold" style={{ color: isActive ? "rgb(var(--teal))" : "rgb(var(--text-1))" }}>{meta.short}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug" style={{ color: "rgb(var(--text-3))" }}>{meta.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Model variant selector */}
                {(() => {
                  const group = modelsByType.find((g) => g.type === selectedModelInfo?.type);
                  if (!group || group.items.length < 2) return null;
                  return (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.items.map((m) => (
                        <button
                          key={m.slug}
                          type="button"
                          onClick={() => setSelectedModel(m.slug)}
                          className="rounded-full border px-3 py-1 text-xs transition-all"
                          style={{
                            background: m.slug === selectedModel ? "rgb(var(--teal))" : "rgb(var(--surface-1))",
                            borderColor: m.slug === selectedModel ? "rgb(var(--teal))" : "rgb(var(--border-strong))",
                            color: m.slug === selectedModel ? "rgb(var(--primary-foreground))" : "rgb(var(--text-2))",
                          }}
                        >
                          {m.display_name}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Model-specific params */}
              {isVlm && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>VLM prompt</label>
                  <Textarea value={vlmQuestion} onChange={(e) => setVlmQuestion(e.target.value)} rows={3} placeholder="Question or instruction…" className="resize-y rounded-lg border text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }} />
                </div>
              )}
              {isQianfanOcr && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Qianfan prompt</label>
                  <Textarea value={qianfanPrompt} onChange={(e) => setQianfanPrompt(e.target.value)} rows={3} placeholder="Instruction for document parsing…" className="resize-y rounded-lg border text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }} />
                </div>
              )}
              {isGotOcr && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Recognition type</label>
                  <select value={gotOcrType} onChange={(e) => setGotOcrType(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}>
                    <option value="ocr">Plain text OCR</option>
                    <option value="format">Format OCR (preserves layout)</option>
                  </select>
                </div>
              )}
              {isPaddleOcr && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Recognition task</label>
                  <select value={paddleTask} onChange={(e) => setPaddleTask(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}>
                    <option value="ocr">OCR (text extraction)</option>
                    <option value="table">Table recognition</option>
                    <option value="chart">Chart recognition</option>
                    <option value="formula">Formula recognition</option>
                    <option value="spotting">Text spotting</option>
                    <option value="seal">Seal recognition</option>
                  </select>
                </div>
              )}
              {isInfinityParser && (
                <>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Output format</label>
                    <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OcrOutputFormat)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}>
                      {OCR_OUTPUT_FORMATS.map((f) => (<option key={f.value} value={f.value}>{f.label} — {f.description}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Custom instruction (optional)</label>
                    <Textarea value={customInstruction} onChange={(e) => setCustomInstruction(e.target.value)} rows={3} placeholder="Override the default prompt…" className="resize-y rounded-lg border text-sm" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }} />
                  </div>
                </>
              )}
              {supportsThinking && (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3" style={{ borderColor: "rgb(var(--border-strong))", background: "rgb(var(--surface-2))" }}>
                  <input type="checkbox" checked={enableThinking} onChange={(e) => setEnableThinking(e.target.checked)} className="size-4" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>Enable thinking mode</p>
                    <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>Slower but may improve complex document reasoning</p>
                  </div>
                </label>
              )}

              {/* Run button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={!file || !selectedModel || status === "running"}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
              >
                {status === "running" ? (
                  <><Loader2 className="size-4 animate-spin" /> Processing…</>
                ) : (
                  <><Zap className="size-4" /> Run OCR Processing <Play className="size-4" /></>
                )}
              </button>
              <p className="text-center font-mono text-[11px]" style={{ color: "rgb(var(--text-3))" }}>
                Press <kbd className="rounded border px-1" style={{ borderColor: "rgb(var(--border-strong))" }}>⌘</kbd> + <kbd className="rounded border px-1" style={{ borderColor: "rgb(var(--border-strong))" }}>Enter</kbd> to run
              </p>
            </div>
          </div>

          {/* ========= RIGHT: RESULTS ========= */}
          <div style={card} className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: "rgb(var(--border))" }}>
              <div>
                <SectionHead number={2} title="Results" subtitle={result ? `Processed with ${result.model_name}` : "Output will appear here"} inline />
              </div>
              {status === "completed" && (
                <div className="flex gap-1.5">
                  <button type="button" onClick={copyOutput} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgb(var(--surface-2))]" style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button type="button" onClick={downloadOutput} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgb(var(--surface-2))]" style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}>
                    <Download className="size-3.5" /> .txt
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {status === "idle" && (
                <div className="flex h-[28rem] flex-col items-center justify-center rounded-xl text-center" style={{ border: "1.5px dashed rgb(var(--border))", background: "rgb(var(--surface-2))" }}>
                  <Eye className="mx-auto mb-3 size-10" style={{ color: "rgb(var(--text-3))" }} />
                  <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>No results yet</p>
                  <p className="mt-1.5 max-w-xs text-xs" style={{ color: "rgb(var(--text-2))" }}>Upload a document, choose an engine and click Run.</p>
                </div>
              )}

              {status === "running" && (
                <div className="space-y-3 rounded-xl p-5" style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))" }}>
                  <div className="flex items-center gap-3">
                    <Loader2 className="size-5 animate-spin" style={{ color: "rgb(var(--teal))" }} />
                    <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>Processing with {selectedModelInfo?.display_name}…</p>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-3 rounded" style={{ background: "rgb(var(--border-strong))" }} />)}
                  </div>
                </div>
              )}

              {status === "failed" && (
                <div className="flex h-[28rem] flex-col items-center justify-center rounded-xl text-center" style={{ background: "rgb(var(--coral-bg))", border: "0.5px solid rgb(var(--coral-border))" }}>
                  <X className="mx-auto mb-3 size-10" style={{ color: "rgb(var(--coral))" }} />
                  <p className="font-medium" style={{ color: "rgb(var(--coral))" }}>Processing failed</p>
                  <p className="mt-1.5 max-w-xs text-sm" style={{ color: "rgb(var(--text-2))" }}>Check your file and model selection, then try again.</p>
                  <button type="button" onClick={handleProcess} disabled={!file} className="mt-4 flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-[rgb(var(--surface-2))] disabled:opacity-40" style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}>
                    <RotateCcw className="size-3.5" /> Retry
                  </button>
                </div>
              )}

              {status === "completed" && result && (
                <div className="space-y-4">
                  {/* Stats tiles */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Engine", value: result.model_type.toUpperCase() },
                      result.result.output_format ? { label: "Format", value: formatOutputFormatLabel(result.result.output_format) } : null,
                      result.result.confidence != null ? { label: "Confidence", value: `${(result.result.confidence * 100).toFixed(0)}%` } : { label: "Words", value: stats.words.toLocaleString() },
                      result.result.timing_ms != null ? { label: "Time", value: formatDuration(result.result.timing_ms) } : null,
                      { label: pages?.length ? "Pages" : "Chars", value: pages?.length ? `${pages.length}` : stats.chars.toLocaleString() },
                    ].filter(Boolean).map((t) => t && (
                      <div key={t.label} className="rounded-lg p-3" style={{ background: "rgb(var(--surface-2))", border: "0.5px solid rgb(var(--border))" }}>
                        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "rgb(var(--text-3))" }}>{t.label}</p>
                        <p className="mt-0.5 font-mono text-lg font-semibold" style={{ color: "rgb(var(--teal))" }}>{t.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Page tabs */}
                  {pages && pages.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pages.map((p, idx) => (
                        <button key={p.page_number} type="button" onClick={() => setActivePageIdx(idx)} className="rounded-full border px-3 py-1.5 text-xs transition-all" style={{ background: activePageIdx === idx ? "rgb(var(--teal))" : "rgb(var(--surface-1))", borderColor: activePageIdx === idx ? "rgb(var(--teal))" : "rgb(var(--border-strong))", color: activePageIdx === idx ? "rgb(var(--primary-foreground))" : "rgb(var(--text-2))" }}>
                          Page {p.page_number}
                          <span className="ml-1.5 opacity-70">· {formatDuration(p.processing_time_ms)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* IDE output */}
                  {activeText ? (
                    <div className="overflow-hidden rounded-xl" style={{ background: "#0D1117", border: "0.5px solid #30363d" }}>
                      <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: "#21262d", background: "#161b22" }}>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" />
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: "#8b949e" }}>{file?.name?.replace(/\.[^.]+$/, "") ?? "output"}.txt</span>
                        <span className="font-mono text-[10px]" style={{ color: "#6e7681" }}>{stats.lines.toLocaleString()} lines</span>
                      </div>
                      <ScrollArea className="h-[28rem]">
                        <pre className="whitespace-pre-wrap p-5 font-mono text-sm leading-relaxed" style={{ color: "rgb(var(--green))" }}>
                          {activeText}
                        </pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="rounded-xl border p-5 text-center text-sm" style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--text-3))" }}>No text returned for this page.</div>
                  )}

                  <div className="flex items-center justify-between font-mono text-xs" style={{ color: "rgb(var(--text-3))" }}>
                    <span>{stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines</span>
                    {pages?.length ? <span>Page {activePageIdx + 1} of {pages.length}</span> : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHead({ number, title, subtitle, inline }: { number: number; title: string; subtitle: string; inline?: boolean }) {
  if (inline) {
    return (
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "rgb(var(--text-1))" }}>{title}</h2>
        <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>{subtitle}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1))" }}>
      <span
        className="flex size-7 items-center justify-center rounded-full font-mono text-sm font-bold"
        style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
      >
        {number}
      </span>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "rgb(var(--text-1))" }}>{title}</h2>
        <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>{subtitle}</p>
      </div>
    </div>
  );
}
