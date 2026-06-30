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
import { iconBox, rh } from "@/lib/remote-hub";
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
          <div className={iconBox("sm")}>
            {status === "completed" ? (
              <CheckCircle2 className="size-4" />
            ) : status === "failed" ? (
              <XCircle className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </div>
          <div>
            <h3 className={cn(rh.h2, "text-base")}>Live OCR demo</h3>
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
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {status === "running" && (
        <div className={cn(rh.card, "space-y-3 p-5")}>
          <div className="flex items-center gap-3">
            <div className={iconBox("sm")}>
              <Sparkles className="size-4" />
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
              className="h-8 gap-1.5 text-xs"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              .txt
            </Button>
          </div>

          {/* OUTPUT IDE-STYLE */}
          <div className="overflow-hidden rounded-[20px] border border-border bg-muted">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/80 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">output.txt</span>
              <div className="size-4" />
            </div>
            <ScrollArea className="h-64 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                {result.text}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className={cn(rh.card, "border-2 border-destructive/30 p-5 text-sm")}>
          <div className="flex items-start gap-3">
            <div className={iconBox("sm")}>
              <XCircle className="size-4" />
            </div>
            <div>
              <p className="font-bold text-foreground">Demo processing failed</p>
              <p className="mt-1 text-muted-foreground">
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
  accent: _accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "cyan" | "indigo" | "fuchsia";
}) {
  return (
    <div className={cn(rh.card, "px-3 py-2.5")}>
      <p className={rh.label}>{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
