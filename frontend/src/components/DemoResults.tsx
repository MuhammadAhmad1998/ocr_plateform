"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DemoResultsProps {
  status: "idle" | "running" | "completed" | "failed";
  result: { text?: string; confidence?: number; timing_ms?: number } | null;
  tierName?: string;
  engineName?: string;
}

export function DemoResults({ status, result, tierName, engineName }: DemoResultsProps) {
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const text = result?.text ?? "";
    const trimmed = text.trim();
    return {
      chars: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      lines: text ? text.split("\n").length : 0,
    };
  }, [result?.text]);

  function handleCopy() {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    toast.success("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-result-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-white shadow-md",
              status === "completed"
                ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-emerald-500/30"
                : status === "failed"
                  ? "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/30"
                  : "bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-fuchsia-500/30"
            )}
          >
            {status === "completed" ? (
              <CheckCircle2 className="size-4" />
            ) : status === "failed" ? (
              <XCircle className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Live OCR demo</h3>
            {engineName ? (
              <p className="text-xs text-muted-foreground">
                {tierName ? `${tierName} · ` : ""}
                {engineName}
              </p>
            ) : (
              tierName && <p className="text-xs text-muted-foreground">{tierName} engine</p>
            )}
          </div>
        </div>
        {status === "running" && (
          <Loader2 className="size-4 animate-spin text-fuchsia-500" />
        )}
      </div>

      {status === "running" && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-gradient-to-br from-fuchsia-500/8 to-rose-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/40" />
              <div className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-md">
                <Sparkles className="size-4" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">Processing your document…</p>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {status === "completed" && result?.text && (
        <div className="space-y-3">
          {/* STATS */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Confidence"
              value={result.confidence != null ? `${(result.confidence * 100).toFixed(0)}%` : "—"}
              accent="emerald"
            />
            <StatTile
              label="Time"
              value={
                result.timing_ms != null
                  ? result.timing_ms < 1000
                    ? `${Math.round(result.timing_ms)}ms`
                    : `${(result.timing_ms / 1000).toFixed(2)}s`
                  : "—"
              }
              accent="cyan"
            />
            <StatTile label="Words" value={stats.words.toLocaleString()} accent="indigo" />
            <StatTile label="Chars" value={stats.chars.toLocaleString()} accent="fuchsia" />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 rounded-full text-xs"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1.5 rounded-full text-xs"
            >
              <Download className="size-3.5" />
              .txt
            </Button>
          </div>

          {/* OUTPUT IDE-STYLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="font-mono text-[10px] text-slate-400">output.txt</span>
              <div className="size-4" />
            </div>
            <ScrollArea className="h-64 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-300">
                {result.text}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-5 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md">
              <XCircle className="size-4" />
            </div>
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-300">Demo processing failed</p>
              <p className="mt-1 text-rose-700/80 dark:text-rose-300/80">
                Try again or upload a different document. If this persists, contact support.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "cyan" | "indigo" | "fuchsia";
}) {
  const colors = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-700 dark:text-cyan-300",
    indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-700 dark:text-indigo-300",
    fuchsia: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-300",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-br px-3 py-2.5 shadow-sm",
        colors[accent]
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
