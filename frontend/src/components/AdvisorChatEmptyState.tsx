"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "I process invoices and receipts",
  "Around 500 pages per month",
  "Documents with tables and forms",
];

type AdvisorChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  onFocusInput: () => void;
  className?: string;
};

export function AdvisorChatEmptyState({
  onSelectPrompt,
  onFocusInput,
  className,
}: AdvisorChatEmptyStateProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocusInput}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocusInput();
        }
      }}
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center gap-4 px-4 py-8 text-center",
        "cursor-text rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-medium text-foreground">Start the conversation</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tell us about your document types, monthly volume, and any special needs like tables,
          handwriting, or equations.
        </p>
      </div>
      <div
        className="flex flex-wrap justify-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal px-3 py-1.5 text-xs font-normal"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
