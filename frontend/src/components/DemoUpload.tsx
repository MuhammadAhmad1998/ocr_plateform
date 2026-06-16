"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";

interface DemoUploadProps {
  documentName: string | null;
  onUpload: (file: File) => Promise<void>;
  onProcess: () => void;
  uploading?: boolean;
}

export function DemoUpload({
  documentName,
  onUpload,
  onProcess,
  uploading = false,
}: DemoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Only PDF, PNG, and JPG files are supported");
        return;
      }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload a sample document</CardTitle>
        <CardDescription>
          Choose a PDF or image to see how OCR performs on your actual content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {documentName ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <FileText className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{documentName}</p>
              <p className="text-xs text-muted-foreground">Ready to process</p>
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
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading ? "Uploading…" : "Drop your file here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, or JPG · max 10 MB</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          disabled={uploading || !!documentName}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {documentName && (
          <Button onClick={onProcess} className="w-full gap-2" disabled={uploading}>
            Process document
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
