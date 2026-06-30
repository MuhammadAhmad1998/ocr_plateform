"use client";

import { FileText, Loader2, Play, RotateCcw, Upload, Zap } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { iconBox, rh } from "@/lib/remote-hub";
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
        <div className={iconBox("sm")}>
          <Upload className="size-4" />
        </div>
        <h3 className={cn(rh.h2, "text-base")}>Upload a sample document</h3>
      </div>

      {documentName ? (
        <div className={cn(rh.card, "border-2 border-border p-4")}>
          <div className="flex items-center gap-4">
            <div className={iconBox("md")}>
              <FileText className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{documentName}</p>
              <p className="text-xs text-muted-foreground">
                {lastFileMeta ? `${formatBytes(lastFileMeta.size)} · ` : ""}
                <span className="font-medium text-foreground">Ready to process</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={replaceFile}
              disabled={uploading}
              className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
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
            "cursor-pointer rounded-[20px] border-2 border-dashed transition-colors",
            dragOver
              ? "border-foreground/30 bg-muted"
              : "border-border bg-muted/40 hover:border-foreground/20 hover:bg-muted/60"
          )}
        >
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14">
            <div
              className={cn(
                iconBox("lg"),
                dragOver && "bg-foreground"
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
          className="w-full gap-2"
        >
          <Zap className="size-4" />
          Run live OCR
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );
}
