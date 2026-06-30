import { AlertTriangle, Bot, Database } from "lucide-react";
import type { AdvisorCapabilities } from "@/lib/api";
import { rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

interface AdvisorSystemStatusProps {
  capabilities: AdvisorCapabilities | null;
  className?: string;
}

export function AdvisorSystemStatus({ capabilities, className }: AdvisorSystemStatusProps) {
  if (!capabilities) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground",
          className
        )}
      >
        Loading advisor mode…
      </div>
    );
  }

  const ragReady = capabilities.rag_mode === "vector" && capabilities.indexed_chunks > 0;
  const llmReady = capabilities.llm_mode === "llm";

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Database className="size-3.5" />
          Knowledge base
        </span>
        <span className={cn(rh.badge, "rounded-md px-2 py-0.5 normal-case tracking-wide")}>
          {ragReady ? `RAG · ${capabilities.indexed_chunks}` : "Mock"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Bot className="size-3.5" />
          Response engine
        </span>
        <span className={cn(rh.badge, "rounded-md px-2 py-0.5 normal-case tracking-wide")}>
          {llmReady ? capabilities.llm_provider : "Scripted"}
        </span>
      </div>
      {(!ragReady || !llmReady) && (
        <div className="flex gap-2 rounded-md border border-border bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-foreground" />
          <p>
            {!llmReady && "Set GROQ_API_KEY and restart the API. "}
            {!ragReady &&
              (capabilities.use_mock_rag
                ? "Set USE_MOCK_RAG=false in .env and restart. "
                : "Indexing may be in progress. Refresh or check backend logs. ")}
            Indicators on each reply show which path was used.
          </p>
        </div>
      )}
    </div>
  );
}
