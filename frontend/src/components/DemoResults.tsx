import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface DemoResultsProps {
  status: "idle" | "running" | "completed" | "failed";
  result: { text?: string; confidence?: number; timing_ms?: number } | null;
  tierName?: string;
  engineName?: string;
}

export function DemoResults({ status, result, tierName, engineName }: DemoResultsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Live OCR demo</CardTitle>
          {engineName ? (
            <CardDescription>
              Running on {tierName ? `${tierName} — ` : ""}
              {engineName}
            </CardDescription>
          ) : (
            tierName && <CardDescription>Running on {tierName} engine</CardDescription>
          )}
        </div>
        {status === "running" && <Loader2 className="size-4 animate-spin text-primary" />}
        {status === "completed" && <CheckCircle2 className="size-4 text-primary" />}
        {status === "failed" && <XCircle className="size-4 text-destructive" />}
      </CardHeader>
      <CardContent>
        {status === "running" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Processing your document…
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {status === "completed" && result?.text && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {result.confidence != null && (
                <Badge variant="secondary">{(result.confidence * 100).toFixed(0)}% confidence</Badge>
              )}
              {result.timing_ms != null && (
                <Badge variant="outline">{result.timing_ms}ms</Badge>
              )}
            </div>
            <ScrollArea className="h-64 rounded-lg border border-border bg-klarix-jet p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-klarix-cyan">
                {result.text}
              </pre>
            </ScrollArea>
          </div>
        )}

        {status === "failed" && (
          <p className="text-sm text-destructive">
            Demo processing failed. Try again or contact support if this persists.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
