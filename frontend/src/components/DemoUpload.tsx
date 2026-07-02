"use client";

import { FileText, Loader2, Play, RotateCcw, Upload, Zap } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";
const MAX_BYTES = 10 * 1024 * 1024;

interface DemoUploadProps {
  documentName: string | null;
  onUpload: (file: File) => Promise<void>;
  onProcess: () => void;
  uploading?: boolean;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DemoUpload({
  documentName,
  onUpload,
  onProcess,
  uploading = false,
}: DemoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lastFileMeta, setLastFileMeta] = useState<{ size: number; type: string } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Only PDF, PNG, and JPG files are supported");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File is too large — max 10 MB");
        return;
      }
      setLastFileMeta({ size: file.size, type: file.type });
      try {
        await onUpload(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const replaceFile = useCallback(() => {
    setLastFileMeta(null);
    inputRef.current?.click();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{
            background: "rgb(var(--teal-bg))",
            border: "0.5px solid rgb(var(--teal-border))",
            color: "rgb(var(--teal))",
          }}
        >
          <Upload className="size-4" />
        </div>
        <h3 className="text-base font-bold" style={{ color: "rgb(var(--text-1))" }}>
          Upload a sample document
        </h3>
      </div>

      {documentName ? (
        <div
          className="relative overflow-hidden rounded-2xl p-4"
          style={{
            border: "1px solid rgb(var(--teal-border))",
            background: "rgb(var(--teal-bg))",
          }}
        >
          <div className="relative flex items-center gap-4">
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{
                background: "rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
              }}
            >
              <FileText className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold" style={{ color: "rgb(var(--text-1))" }}>
                {documentName}
              </p>
              <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>
                {lastFileMeta ? `${formatBytes(lastFileMeta.size)} · ` : ""}
                <span style={{ color: "rgb(var(--green))" }}>Ready to process</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={replaceFile}
              disabled={uploading}
              className="shrink-0 gap-1.5 rounded-full"
            >
              <RotateCcw className="size-3.5" />
              Replace
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all",
            dragOver ? "scale-[1.01]" : ""
          )}
          style={{
            borderColor: dragOver ? "rgb(var(--teal))" : "rgb(var(--border-strong))",
            background: dragOver ? "rgb(var(--teal-bg))" : "rgb(var(--surface-1))",
          }}
        >
          <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-14">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl transition-all group-hover:scale-110"
              )}
              style={{
                background: dragOver ? "rgb(var(--teal))" : "rgb(var(--surface-2))",
                color: dragOver ? "rgb(var(--primary-foreground))" : "rgb(var(--text-2))",
                border: `0.5px solid ${dragOver ? "rgb(var(--teal))" : "rgb(var(--border-strong))"}`,
              }}
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin" />
              ) : (
                <Upload className="size-8" />
              )}
            </div>
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: "rgb(var(--text-1))" }}>
                {uploading
                  ? "Uploading…"
                  : dragOver
                    ? "Drop to upload"
                    : "Drag & drop or click to browse"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "rgb(var(--text-2))" }}>
                PDF, PNG, or JPG · max 10 MB
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {documentName && (
        <Button
          onClick={onProcess}
          size="lg"
          disabled={uploading}
          className="h-12 w-full gap-2 rounded-full transition-all hover:brightness-110"
          style={{
            background: "rgb(var(--teal))",
            color: "rgb(var(--primary-foreground))",
          }}
        >
          <Zap className="size-4" />
          Run live OCR
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );
}
