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
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-md shadow-fuchsia-500/30">
          <Upload className="size-4" />
        </div>
        <h3 className="text-base font-bold text-foreground">Upload a sample document</h3>
      </div>

      {documentName ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 to-rose-500/5 p-4 shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-fuchsia-400/30 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/30">
              <FileText className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{documentName}</p>
              <p className="text-xs text-muted-foreground">
                {lastFileMeta ? `${formatBytes(lastFileMeta.size)} · ` : ""}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Ready to process
                </span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={replaceFile}
              disabled={uploading}
              className="shrink-0 gap-1.5 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
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
            dragOver
              ? "scale-[1.01] border-fuchsia-400 bg-gradient-to-br from-fuchsia-500/15 to-rose-500/10 shadow-lg"
              : "border-border bg-gradient-to-br from-muted/40 to-muted/10 hover:border-fuchsia-400/50 hover:from-fuchsia-500/8 hover:to-rose-500/5"
          )}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-fuchsia-400/15 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-rose-400/15 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-14">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl shadow-lg transition-all group-hover:scale-110",
                dragOver
                  ? "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-fuchsia-500/40"
                  : "bg-background text-muted-foreground group-hover:bg-gradient-to-br group-hover:from-fuchsia-500 group-hover:to-rose-500 group-hover:text-white"
              )}
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin" />
              ) : (
                <Upload className="size-8" />
              )}
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground">
                {uploading
                  ? "Uploading…"
                  : dragOver
                    ? "Drop to upload"
                    : "Drag & drop or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, or JPG · max 10 MB</p>
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
          className="h-12 w-full gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:scale-[1.01] hover:shadow-xl"
        >
          <Zap className="size-4" />
          Run live OCR
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );
}
