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
        "flex cursor-text flex-col items-center gap-6 rounded-lg px-2 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* HERO */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex size-16 items-center justify-center rounded-2xl"
          style={{
            background: "rgb(var(--teal-bg))",
            border: "0.5px solid rgb(var(--teal-border))",
          }}
        >
          <Sparkles className="size-7" style={{ color: "rgb(var(--teal))" }} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
            Let&apos;s find your perfect OCR setup
          </h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
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
        {PROMPT_GROUPS.map(({ id, label, icon: Icon, prompts }) => (
          <div
            key={id}
            className="group rounded-2xl p-4 transition-all hover:-translate-y-0.5"
            style={{
              background: "rgb(var(--surface-1))",
              border: "0.5px solid rgb(var(--border))",
            }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex size-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                style={{
                  background: "rgb(var(--teal-bg))",
                  color: "rgb(var(--teal))",
                  border: "0.5px solid rgb(var(--teal-border))",
                }}
              >
                <Icon className="size-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgb(var(--text-2))" }}>
                {label}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelectPrompt(prompt)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5"
                  style={{
                    border: "0.5px solid rgb(var(--border-strong))",
                    background: "rgb(var(--surface-2))",
                    color: "rgb(var(--text-2))",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
        style={{
          border: "0.5px solid rgb(var(--border))",
          background: "rgb(var(--surface-2))",
          color: "rgb(var(--text-2))",
        }}
      >
        <Sparkles className="size-3" style={{ color: "rgb(var(--teal))" }} />
        <span>Tip: mix a few starters into one message for a more accurate match.</span>
      </div>
    </div>
  );
}
