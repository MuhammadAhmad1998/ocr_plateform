"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  Rocket,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tier = {
  slug: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  highlight?: boolean;
  features: string[];
  icon: LucideIcon;
  accent: "indigo" | "cyan" | "fuchsia" | "amber";
  cta: { label: string; href: string };
};

const TIERS: Tier[] = [
  {
    slug: "free",
    name: "Starter",
    price: "Free",
    description: "Perfect for evaluation and personal use",
    icon: Rocket,
    accent: "indigo",
    features: [
      "50 pages / month",
      "PDF text extraction",
      "PaddleOCR Lite engine",
      "Web interface access",
      "AI advisor included",
    ],
    cta: { label: "Get Started Free", href: "/register" },
  },
  {
    slug: "basic",
    name: "Essential",
    price: "$29",
    period: "/ month",
    description: "For business documents and forms",
    icon: Zap,
    accent: "cyan",
    features: [
      "500 pages / month",
      "Printed text + tables",
      "PaddleOCR Vision-Language",
      "Invoice & form processing",
      "REST API access",
      "Webhook support",
    ],
    cta: { label: "Subscribe Now", href: "/checkout?tier=basic" },
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99",
    period: "/ month",
    description: "Advanced features for complex documents",
    icon: Crown,
    accent: "fuchsia",
    highlight: true,
    features: [
      "5,000 pages / month",
      "Handwriting (89%+ accuracy)",
      "Mathematical equations (LaTeX)",
      "GOT-OCR 2.0 + Qianfan OCR",
      "Medical & financial documents",
      "Key Information Extraction (KIE)",
      "Multi-language support",
      "Priority processing",
    ],
    cta: { label: "Subscribe Now", href: "/checkout?tier=pro" },
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "Unlimited volume with highest accuracy",
    icon: Building2,
    accent: "amber",
    features: [
      "Unlimited page processing",
      "GOT-OCR 2.0 Enterprise (91-97%)",
      "Qianfan OCR Enterprise",
      "Custom model fine-tuning",
      "Complex layout handling",
      "Custom templates",
      "Dedicated support",
      "Custom SLA",
      "On-premise deployment",
    ],
    cta: { label: "Contact Sales", href: "mailto:sales@planetocr.com" },
  },
];

const PALETTE = {
  indigo: {
    gradient: "from-indigo-500/12 via-violet-500/6 to-indigo-500/3",
    glow: "shadow-indigo-500/30",
    icon: "bg-gradient-to-br from-indigo-500 to-violet-500",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/30",
    priceGradient: "from-indigo-600 to-violet-600 dark:from-indigo-300 dark:to-violet-300",
    check: "text-indigo-500",
    checkBg: "bg-indigo-500/15",
  },
  cyan: {
    gradient: "from-cyan-500/12 via-sky-500/6 to-cyan-500/3",
    glow: "shadow-cyan-500/30",
    icon: "bg-gradient-to-br from-cyan-500 to-sky-500",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    priceGradient: "from-cyan-600 to-sky-600 dark:from-cyan-300 dark:to-sky-300",
    check: "text-cyan-500",
    checkBg: "bg-cyan-500/15",
  },
  fuchsia: {
    gradient: "from-fuchsia-500/15 via-rose-500/10 to-amber-500/8",
    glow: "shadow-fuchsia-500/40",
    icon: "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/40",
    priceGradient: "from-fuchsia-600 via-rose-500 to-amber-500 dark:from-fuchsia-300 dark:via-rose-300 dark:to-amber-300",
    check: "text-fuchsia-500",
    checkBg: "bg-fuchsia-500/15",
  },
  amber: {
    gradient: "from-amber-500/12 via-orange-500/6 to-amber-500/3",
    glow: "shadow-amber-500/30",
    icon: "bg-gradient-to-br from-amber-500 to-orange-500",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    priceGradient: "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300",
    check: "text-amber-500",
    checkBg: "bg-amber-500/15",
  },
} as const;

const FAQS = [
  {
    q: "Can I change plans anytime?",
    a: "Yes — upgrade or downgrade at any time. Prorated charges apply, and your quota resets to the new tier instantly.",
  },
  {
    q: "What happens if I exceed my quota?",
    a: "New jobs will be rejected with a clear error. We never silently charge overage — you control upgrades.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes. Contact sales for annual discounts of up to 20% on Essential and Professional, or for custom Enterprise terms.",
  },
  {
    q: "Is my data secure?",
    a: "All uploads are encrypted in transit and at rest. Documents are auto-deleted 24 hours after processing unless you opt in to retention.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />
      <Navbar variant="marketing" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        {/* ============ HERO ============ */}
        <FadeIn className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3.5 py-1.5 text-xs font-semibold text-foreground/70 backdrop-blur">
            <Sparkles className="size-3.5 text-fuchsia-500" />
            Transparent pricing
            <span className="h-3 w-px bg-border" />
            <span className="text-emerald-600 dark:text-emerald-400">No hidden fees</span>
          </div>
          <h1 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-6xl">
            Pricing that scales with your documents
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Start free, upgrade only when you need more pages or premium engines. Cancel any time.
          </p>
        </FadeIn>

        {/* ============ TIERS ============ */}
        <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {TIERS.map((tier, i) => {
            const colors = PALETTE[tier.accent];
            const Icon = tier.icon;
            const isHighlight = !!tier.highlight;

            return (
              <FadeIn key={tier.slug} delay={0.08 + i * 0.06} className="h-full">
                <div
                  className={cn(
                    "group relative h-full",
                    isHighlight && "lg:-my-2"
                  )}
                >
                  {/* Glow behind highlighted card */}
                  {isHighlight && (
                    <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 via-rose-500/20 to-amber-500/30 opacity-70 blur-xl transition-opacity group-hover:opacity-90" />
                  )}

                  <div
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-6 shadow-md transition-all",
                      colors.gradient,
                      isHighlight
                        ? cn(colors.border, "bg-card shadow-2xl", colors.glow)
                        : "border-border/70 hover:-translate-y-1 hover:shadow-xl hover:border-foreground/20"
                    )}
                  >
                    {/* Decorative blob */}
                    <div
                      className={cn(
                        "pointer-events-none absolute -right-10 -top-10 size-32 rounded-full blur-3xl",
                        tier.accent === "indigo" && "bg-indigo-400/20",
                        tier.accent === "cyan" && "bg-cyan-400/20",
                        tier.accent === "fuchsia" && "bg-fuchsia-400/30",
                        tier.accent === "amber" && "bg-amber-400/20"
                      )}
                    />

                    {/* MOST POPULAR badge */}
                    {isHighlight && (
                      <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-fuchsia-500/40">
                          <Star className="size-3 fill-current" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <div className="relative flex h-full flex-col">
                      {/* Header */}
                      <div className="space-y-4">
                        <div
                          className={cn(
                            "inline-flex size-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110",
                            colors.icon,
                            colors.glow
                          )}
                        >
                          <Icon className="size-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                          <p className="mt-1 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
                            {tier.description}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 pt-2">
                          <span
                            className={cn(
                              "bg-gradient-to-br bg-clip-text text-5xl font-extrabold tracking-tight text-transparent",
                              colors.priceGradient
                            )}
                          >
                            {tier.price}
                          </span>
                          {tier.period && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {tier.period}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="my-7 flex-1 space-y-3 border-t border-border/60 pt-6">
                        {tier.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm text-foreground/90"
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                                colors.checkBg
                              )}
                            >
                              <CheckCircle2 className={cn("size-3.5", colors.check)} />
                            </div>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Link
                        href={tier.cta.href}
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "w-full gap-2 rounded-full font-bold transition-all hover:scale-[1.02]",
                          isHighlight
                            ? "bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-fuchsia-500/40 hover:shadow-xl"
                            : "border-2 border-foreground bg-foreground text-background hover:opacity-90"
                        )}
                      >
                        {tier.cta.label}
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        {/* ============ TRUST STRIP ============ */}
        <FadeIn delay={0.45} className="mt-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <TrustCard
              icon={<Sparkles className="size-5" />}
              title="AI advisor included"
              text="Get a tailored tier recommendation from a chat-based AI advisor on every plan."
              accent="indigo"
            />
            <TrustCard
              icon={<Zap className="size-5" />}
              title="Live OCR demo"
              text="Try the engine on your own document before you commit to a plan."
              accent="cyan"
            />
            <TrustCard
              icon={<CheckCircle2 className="size-5" />}
              title="Cancel anytime"
              text="No long-term contracts. Upgrade, downgrade, or cancel in one click."
              accent="emerald"
            />
          </div>
        </FadeIn>

        {/* ============ FAQ ============ */}
        <FadeIn delay={0.5} className="mt-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Frequently asked
              </p>
              <h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
                Questions, answered.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground">
                    {f.q}
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45 group-open:bg-fuchsia-500 group-open:text-white">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ============ CTA ============ */}
        <FadeIn delay={0.55} className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-amber-500/10 p-8 text-center shadow-xl sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-xl shadow-fuchsia-500/40">
                <Sparkles className="size-6" />
              </div>
              <h3 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-4xl">
                Not sure which plan is right?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                Chat with our AI advisor for a personalised recommendation — and run a live OCR
                demo on your own document.
              </p>
              <Link
                href="/advisor"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-6 gap-2 rounded-full bg-foreground px-7 text-background shadow-lg hover:opacity-90 hover:scale-[1.02]"
                )}
              >
                Try the OCR Advisor
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

/* ============ COMPONENTS ============ */

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-20 size-96 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/12" />
      <div className="absolute right-0 top-1/3 size-96 rounded-full bg-fuchsia-500/8 blur-3xl dark:bg-fuchsia-500/12" />
      <div className="absolute -bottom-20 left-1/3 size-96 rounded-full bg-amber-500/8 blur-3xl dark:bg-amber-500/12" />
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  accent: "indigo" | "cyan" | "emerald";
}) {
  const colors = {
    indigo: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
    cyan: "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
    emerald: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
  } as const;
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
          colors[accent]
        )}
      >
        {icon}
      </div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
