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
            className="flex size-7 items-center justify-center rounded-lg"
            style={{
              background:
                status === "completed"
                  ? "rgb(var(--green-bg))"
                  : status === "failed"
                    ? "rgb(var(--coral-bg))"
                    : "rgb(var(--teal-bg))",
              border:
                status === "completed"
                  ? "0.5px solid rgb(var(--green-border))"
                  : status === "failed"
                    ? "0.5px solid rgb(var(--coral-border))"
                    : "0.5px solid rgb(var(--teal-border))",
              color:
                status === "completed"
                  ? "rgb(var(--green))"
                  : status === "failed"
                    ? "rgb(var(--coral))"
                    : "rgb(var(--teal))",
            }}
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
            <h3 className="text-base font-bold" style={{ color: "rgb(var(--text-1))" }}>
              Live OCR demo
            </h3>
            {engineName ? (
              <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>
                {tierName ? `${tierName} · ` : ""}
                {engineName}
              </p>
            ) : (
              tierName && <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>{tierName} engine</p>
            )}
          </div>
        </div>
        {status === "running" && (
          <Loader2 className="size-4 animate-spin" style={{ color: "rgb(var(--teal))" }} />
        )}
      </div>

      {status === "running" && (
        <div
          className="space-y-3 rounded-2xl p-5"
          style={{
            border: "0.5px solid rgb(var(--teal-border))",
            background: "rgb(var(--teal-bg))",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-8 items-center justify-center rounded-full"
              style={{
                background: "rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
              }}
            >
              <Sparkles className="size-4 animate-pulse" />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>
              Processing your document…
            </p>
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
            />
            <StatTile label="Words" value={stats.words.toLocaleString()} />
            <StatTile label="Chars" value={stats.chars.toLocaleString()} />
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
          <div
            className="overflow-hidden rounded-2xl shadow-xl"
            style={{
              background: "rgb(var(--surface-1))",
              border: "0.5px solid rgb(var(--border))",
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-2"
              style={{
                borderBottom: "0.5px solid rgb(var(--border))",
                background: "rgb(var(--surface-2))",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: "rgb(var(--coral))" }}
                />
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: "rgb(var(--amber))" }}
                />
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: "rgb(var(--green))" }}
                />
              </div>
              <span className="font-mono text-[10px]" style={{ color: "rgb(var(--text-3))" }}>
                output.txt
              </span>
              <div className="size-4" />
            </div>
            <ScrollArea className="h-64 p-4">
              <pre
                className="whitespace-pre-wrap font-mono text-xs leading-relaxed"
                style={{ color: "rgb(var(--text-1))" }}
              >
                {result.text}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div
          className="rounded-2xl p-5 text-sm"
          style={{
            border: "1px solid rgb(var(--coral-border))",
            background: "rgb(var(--coral-bg))",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "rgb(var(--coral))",
                color: "rgb(var(--primary-foreground))",
              }}
            >
              <XCircle className="size-4" />
            </div>
            <div>
              <p className="font-bold" style={{ color: "rgb(var(--coral))" }}>
                Demo processing failed
              </p>
              <p className="mt-1" style={{ color: "rgb(var(--text-2))" }}>
                Try again or upload a different document. If this persists, contact support.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        border: "0.5px solid rgb(var(--border))",
        background: "rgb(var(--surface-1))",
      }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-wider"
        style={{ color: "rgb(var(--text-3))" }}
      >
        {label}
      </p>
      <p
        className="mt-0.5 text-lg font-extrabold tracking-tight"
        style={{ color: "rgb(var(--text-1))" }}
      >
        {value}
      </p>
    </div>
  );
}
