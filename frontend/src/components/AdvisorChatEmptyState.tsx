"use client";

import {
  FileText,
  Gauge,
  Languages,
  Sparkles,
  Table,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { iconBox, rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

type PromptGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompts: string[];
};

const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: "documents",
    label: "Document types",
    icon: FileText,
    prompts: [
      "I process invoices and receipts",
      "Mostly contracts and legal PDFs",
      "Handwritten forms and notes",
      "ID cards and passports",
    ],
  },
  {
    id: "volume",
    label: "Monthly volume",
    icon: Gauge,
    prompts: [
      "Around 100 pages / month",
      "About 1,000 pages / month",
      "10k+ pages / month",
    ],
  },
  {
    id: "needs",
    label: "Special needs",
    icon: Table,
    prompts: [
      "Tables and forms",
      "Equations and math",
      "Stamps, signatures, seals",
    ],
  },
  {
    id: "language",
    label: "Languages",
    icon: Languages,
    prompts: [
      "English and Spanish",
      "Arabic, RTL scripts",
      "Chinese, Japanese, Korean",
    ],
  },
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
        "flex min-h-[280px] cursor-text flex-col items-center gap-8 rounded-[20px] px-2 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={iconBox("lg")}>
          <Sparkles className="size-7" />
        </div>
        <div className="space-y-2">
          <h3 className={rh.h1}>Let&apos;s find your perfect OCR setup</h3>
          <p className={cn(rh.body, "mx-auto max-w-md text-muted-foreground")}>
            Tap a starter chip below, mix a few, or type your own message — I&apos;ll match you with
            the right tier in seconds.
          </p>
        </div>
      </div>

      <div
        className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {PROMPT_GROUPS.map(({ id, label, icon: Icon, prompts }) => (
          <div key={id} className={cn(rh.cardHover, "p-4")}>
            <div className="mb-3 flex items-center gap-2.5">
              <div className={iconBox("sm")}>
                <Icon className="size-4" />
              </div>
              <p className={rh.label}>{label}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelectPrompt(prompt)}
                  className="rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/15 hover:bg-muted hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3" />
        <span>Tip: mix a few starters into one message for a more accurate match.</span>
      </div>
    </div>
  );
}
