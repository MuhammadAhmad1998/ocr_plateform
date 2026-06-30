import { cn } from "@/lib/utils";

/**
 * Design tokens for the OCR Intelligence Platform.
 * Color values come from globals.css CSS variables — see
 * frontend/design.md and ocr_platform_mockups.html.
 */
export const rh = {
  // Typography
  display: "text-[3.75rem] font-bold tracking-[-0.03em] leading-[1.1]",
  h1: "text-[2rem] font-bold tracking-tight",
  h2: "text-xl font-bold tracking-tight",
  body: "text-[0.95rem] leading-[1.55]",
  label:
    "text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
  mono: "font-mono",
  monoLabel:
    "font-mono text-[11px] uppercase tracking-[1px] text-muted-foreground",

  // Cards / panels
  card: "rounded-[20px] border border-border bg-card text-card-foreground shadow-sm",
  cardHover:
    "rounded-[20px] border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-foreground/15 hover:shadow-md",

  // Icon container — teal-tint surface with teal icon (mockup signature)
  iconBox:
    "flex shrink-0 items-center justify-center rounded-xl bg-accent text-primary border border-primary/40",

  // Sections
  section: "relative px-4 py-20 lg:px-8 lg:py-24",
  eyebrow:
    "mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground",

  // Hero eyebrow pill — teal text on teal-bg, mono font, rounded
  eyebrowPill:
    "inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-3.5 py-1.5 font-mono text-[12px] text-primary",

  // Stats / pricing numbers
  statValue: "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
  priceValue: "text-4xl font-bold tracking-tight text-foreground",
  monoStat: "font-mono text-[26px] text-foreground",

  // Checklist row
  checkWrap:
    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-accent text-primary border border-primary/40",
  checkIcon: "size-3.5",

  // Generic info badge — neutral surface, uppercase mono
  badge:
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground shadow-sm",

  // Live status pill (matches mockup .keytag — teal-tint bg + teal text)
  statusLive:
    "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-accent px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-primary",

  // Recommendation / refusal badges (verdict screen)
  recBadge:
    "inline-flex items-center gap-1.5 rounded-md bg-warning px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.5px] text-warning-foreground",
  refuseBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-destructive/45 bg-destructive/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.3px] text-destructive",

  // Tier badges (engine catalogue)
  tierA:
    "inline-flex items-center rounded-md border border-success/45 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-success",
  tierB:
    "inline-flex items-center rounded-md border border-primary/40 bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-primary",
  tierC:
    "inline-flex items-center rounded-md border border-input bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-muted-foreground",

  // Score numbers
  scoreWin: "font-mono text-xl text-primary",
  scoreDim: "font-mono text-xl text-muted-foreground",

  // Backgrounds
  dotGrid: "dot-grid",

  // Verdict "winning" row
  winRow:
    "rounded-[20px] border border-primary bg-accent p-4 sm:p-5",
} as const;

export function iconBox(size: "sm" | "md" | "lg" = "md", className?: string) {
  const sizes = { sm: "size-9", md: "size-10", lg: "size-12" };
  return cn(rh.iconBox, sizes[size], className);
}
