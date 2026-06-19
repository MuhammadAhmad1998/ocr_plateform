"use client";

import {
  FileText,
  Gauge,
  Languages,
  Sparkles,
  Table,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  prompts: string[];
};

const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: "documents",
    label: "Document types",
    icon: FileText,
    gradient: "from-indigo-500/15 to-violet-500/5",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",
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
    gradient: "from-cyan-500/15 to-sky-500/5",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500",
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
    gradient: "from-emerald-500/15 to-teal-500/5",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
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
    gradient: "from-fuchsia-500/15 to-rose-500/5",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-rose-500",
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
        "flex min-h-[280px] cursor-text flex-col items-center gap-8 rounded-lg px-2 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* HERO */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 blur-2xl" />
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 shadow-xl shadow-indigo-500/30">
            <Sparkles className="size-7 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Let&apos;s find your perfect OCR setup
          </h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Tap a starter chip below, mix a few, or type your own message — I&apos;ll match you with
            the right tier in seconds.
          </p>
        </div>
      </div>

      {/* PROMPT GROUPS */}
      <div
        className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {PROMPT_GROUPS.map(({ id, label, icon: Icon, gradient, iconBg, prompts }) => (
          <div
            key={id}
            className={cn(
              "group rounded-2xl border border-border/60 bg-gradient-to-br p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
              gradient
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                  iconBg
                )}
              >
                <Icon className="size-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                {label}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelectPrompt(prompt)}
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:text-foreground hover:shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3 text-indigo-500" />
        <span>Tip: mix a few starters into one message for a more accurate match.</span>
      </div>
    </div>
  );
}
