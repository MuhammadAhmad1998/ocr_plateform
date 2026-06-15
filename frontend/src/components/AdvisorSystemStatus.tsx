import { AlertTriangle, Bot, Database } from "lucide-react";
import type { AdvisorCapabilities } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdvisorSystemStatusProps {
  capabilities: AdvisorCapabilities | null;
  className?: string;
}

export function AdvisorSystemStatus({ capabilities, className }: AdvisorSystemStatusProps) {
  if (!capabilities) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground", className)}>
        Loading advisor mode…
      </div>
    );
  }

  const ragReady = capabilities.rag_mode === "vector" && capabilities.indexed_chunks > 0;
  const llmReady = capabilities.llm_mode === "llm";

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Database className="size-3.5" />
          Knowledge base
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
            ragReady
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          )}
        >
          {ragReady ? `RAG · ${capabilities.indexed_chunks} chunks` : "Mock RAG"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Bot className="size-3.5" />
          Response engine
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
            llmReady
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
              : "bg-orange-500/15 text-orange-700 dark:text-orange-400"
          )}
        >
          {llmReady ? `${capabilities.llm_provider} LLM` : "Scripted"}
        </span>
      </div>
      {(!ragReady || !llmReady) && (
        <div className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
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
