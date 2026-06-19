import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileSearch,
  Globe,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdvisorDemoWidget } from "@/components/AdvisorDemoWidget";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
  {
    slug: "free",
    name: "Starter",
    price: "Free",
    accent: "indigo" as const,
    features: ["50 pages / month", "PDF text extraction", "AI advisor included"],
  },
  {
    slug: "basic",
    name: "Essential",
    price: "$29",
    period: "/mo",
    accent: "cyan" as const,
    features: ["500 pages / month", "Tables & forms", "REST API access"],
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99",
    period: "/mo",
    accent: "fuchsia" as const,
    features: [
      "5,000 pages / month",
      "Equations & handwriting",
      "Priority processing",
    ],
    highlight: true,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    accent: "amber" as const,
    features: ["Unlimited volume", "Custom fine-tuning", "Dedicated SLA"],
  },
];

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MessageSquare,
    title: "Chat with the advisor",
    description:
      "Tell us about your document types, volume, and accuracy needs — our AI agent guides the conversation.",
  },
  {
    icon: Sparkles,
    title: "Get your recommendation",
    description:
      "Receive a personalised tier match based on your requirements — no guesswork, just smart suggestions.",
  },
  {
    icon: FileSearch,
    title: "See it in action",
    description:
      "Upload a sample document and run a live OCR demo to validate your recommendation before subscribing.",
  },
];

const trust = [
  { icon: Shield, label: "SOC-ready architecture" },
  { icon: Lock, label: "Encrypted at rest & in transit" },
  { icon: CheckCircle2, label: "Stripe-secured billing" },
];

const stats = [
  { icon: TrendingUp, value: "99.8%", label: "Accuracy rate", accent: "indigo" as const },
  { icon: Zap, value: "<2s", label: "Average processing", accent: "cyan" as const },
  { icon: Globe, value: "50+", label: "Languages supported", accent: "emerald" as const },
  { icon: Award, value: "SOC 2", label: "Certified platform", accent: "fuchsia" as const },
];

const PALETTE = {
  indigo: {
    gradient: "from-indigo-500/12 via-violet-500/6 to-indigo-500/3",
    border: "border-indigo-500/30",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
    text: "text-indigo-700 dark:text-indigo-300",
    check: "text-indigo-500",
    checkBg: "bg-indigo-500/15",
    priceGradient: "from-indigo-600 to-violet-600 dark:from-indigo-300 dark:to-violet-300",
  },
  cyan: {
    gradient: "from-cyan-500/12 via-sky-500/6 to-cyan-500/3",
    border: "border-cyan-500/30",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
    text: "text-cyan-700 dark:text-cyan-300",
    check: "text-cyan-500",
    checkBg: "bg-cyan-500/15",
    priceGradient: "from-cyan-600 to-sky-600 dark:from-cyan-300 dark:to-sky-300",
  },
  fuchsia: {
    gradient: "from-fuchsia-500/15 via-rose-500/10 to-amber-500/8",
    border: "border-fuchsia-500/40",
    iconBg:
      "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500 shadow-fuchsia-500/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    check: "text-fuchsia-500",
    checkBg: "bg-fuchsia-500/15",
    priceGradient:
      "from-fuchsia-600 via-rose-500 to-amber-500 dark:from-fuchsia-300 dark:via-rose-300 dark:to-amber-300",
  },
  emerald: {
    gradient: "from-emerald-500/12 via-teal-500/6 to-emerald-500/3",
    border: "border-emerald-500/30",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    check: "text-emerald-500",
    checkBg: "bg-emerald-500/15",
    priceGradient: "from-emerald-600 to-teal-600 dark:from-emerald-300 dark:to-teal-300",
  },
  amber: {
    gradient: "from-amber-500/12 via-orange-500/6 to-amber-500/3",
    border: "border-amber-500/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
    check: "text-amber-500",
    checkBg: "bg-amber-500/15",
    priceGradient: "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300",
  },
} as const;

type Accent = keyof typeof PALETTE;

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />
      <Navbar variant="marketing" />

      <main className="relative z-10">
        {/* ============ HERO ============ */}
        <section className="relative px-4 pt-12 pb-20 sm:pt-20 sm:pb-28 lg:px-8 lg:pt-24 lg:pb-32">
          <FadeIn className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3.5 py-1.5 text-xs font-semibold text-foreground/70 shadow-sm backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>AI-powered tier recommendations</span>
              <span className="h-3 w-px bg-border" />
              <span className="text-fuchsia-600 dark:text-fuchsia-400">New</span>
            </div>

            <h1 className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              The right OCR tier for{" "}
              <span className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300">
                every document.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Planet OCR&apos;s AI advisor understands your needs, recommends the ideal processing
              tier, and lets you validate with a live demo — buy with confidence, not guesswork.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group h-13 gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 px-7 text-base font-bold text-white shadow-xl shadow-fuchsia-500/30 transition-all hover:scale-[1.02] hover:shadow-2xl"
                )}
              >
                Get Started Free
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/advisor"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-13 gap-2 rounded-full border-2 bg-background/60 px-7 text-base font-bold backdrop-blur hover:scale-[1.02]"
                )}
              >
                <Sparkles className="size-4 text-fuchsia-500" />
                Try the Advisor
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                No credit card required
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                50 free pages
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Cancel anytime
              </span>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={0.15} className="mx-auto mt-20 max-w-6xl">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {stats.map((stat, i) => {
                const c = PALETTE[stat.accent];
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-5 text-center shadow-md transition-all hover:-translate-y-1 hover:shadow-xl",
                      c.gradient,
                      c.border
                    )}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/30 blur-2xl dark:bg-white/10" />
                    <div className="relative space-y-3">
                      <div
                        className={cn(
                          "mx-auto flex size-11 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110",
                          c.iconBg
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div
                        className={cn(
                          "bg-gradient-to-br bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl",
                          c.priceGradient
                        )}
                      >
                        {stat.value}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground sm:text-sm">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="relative px-4 py-20 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
              How it works
            </p>
            <h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              From upload to insight in 3 steps
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              An AI-guided workflow that ends with a real OCR demo on your own document.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {steps.map((step, i) => {
              const accents: Accent[] = ["indigo", "cyan", "fuchsia"];
              const c = PALETTE[accents[i]];
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={0.1 + i * 0.08}>
                  <div
                    className={cn(
                      "group relative h-full overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-7 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl",
                      c.gradient,
                      c.border
                    )}
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/20 blur-3xl dark:bg-white/5" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110",
                            c.iconBg
                          )}
                        >
                          <Icon className="size-6" />
                        </div>
                        <span
                          className={cn(
                            "rounded-full bg-background/70 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur",
                            c.text
                          )}
                        >
                          Step {i + 1}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={0.4} className="mt-14 flex justify-center">
            <AdvisorDemoWidget />
          </FadeIn>
        </section>

        {/* ============ TRUST STRIP ============ */}
        <FadeIn className="px-4 py-12 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-3 rounded-3xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur sm:grid-cols-3 sm:gap-2">
              {trust.map((item, i) => {
                const accents: Accent[] = ["emerald", "indigo", "fuchsia"];
                const c = PALETTE[accents[i]];
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="group flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/80 transition-all hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                        c.iconBg
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* ============ PRICING TEASER ============ */}
        <section className="relative px-4 py-20 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Transparent pricing
            </p>
            <h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              Capability-based tiers
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              No opaque model names — just what you actually need.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => {
              const c = PALETTE[tier.accent];
              const isHighlight = !!tier.highlight;
              return (
                <FadeIn key={tier.slug} delay={0.1 + i * 0.06} className="h-full">
                  <div className={cn("group relative h-full", isHighlight && "lg:-my-2")}>
                    {isHighlight && (
                      <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 via-rose-500/20 to-amber-500/30 opacity-70 blur-xl transition-opacity group-hover:opacity-100" />
                    )}
                    <div
                      className={cn(
                        "relative flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-6 shadow-md transition-all",
                        c.gradient,
                        isHighlight
                          ? cn(c.border, "bg-card shadow-2xl")
                          : "border-border/70 hover:-translate-y-1 hover:shadow-xl"
                      )}
                    >
                      <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/20 blur-3xl dark:bg-white/5" />
                      {isHighlight && (
                        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-fuchsia-500/40">
                            <Star className="size-3 fill-current" />
                            Popular
                          </div>
                        </div>
                      )}
                      <div className="relative space-y-4">
                        <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={cn(
                              "bg-gradient-to-br bg-clip-text text-4xl font-extrabold tracking-tight text-transparent",
                              c.priceGradient
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
                        <ul className="space-y-2.5 border-t border-border/60 pt-4">
                          {tier.features.map((f) => (
                            <li key={f} className="flex items-start gap-2.5 text-sm">
                              <div
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                                  c.checkBg
                                )}
                              >
                                <CheckCircle2 className={cn("size-3.5", c.check)} />
                              </div>
                              <span className="leading-relaxed text-foreground/85">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={0.4} className="mt-10 text-center">
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "gap-2 rounded-full border-2 hover:scale-[1.02]"
              )}
            >
              Compare all plans
              <ArrowRight className="size-4" />
            </Link>
          </FadeIn>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-20">
          <FadeIn className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-amber-500/15 p-8 text-center shadow-2xl sm:p-14">
              <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-xl shadow-fuchsia-500/40">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-5xl">
                  Ready to find your perfect tier?
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Start a conversation with our AI advisor, get a personalised tier recommendation,
                  then validate with a live OCR demo before you commit.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "group h-13 gap-2 rounded-full bg-foreground px-7 text-base font-bold text-background shadow-xl hover:scale-[1.02] hover:opacity-90"
                    )}
                  >
                    Create Free Account
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/advisor"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-13 gap-2 rounded-full border-2 bg-background/70 px-7 text-base font-bold backdrop-blur hover:scale-[1.02]"
                    )}
                  >
                    Try the Advisor
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ============= COMPONENTS ============= */

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-10 size-[28rem] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="absolute right-0 top-[20%] size-[28rem] rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/15" />
      <div className="absolute left-1/4 top-[60%] size-[26rem] rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-500/12" />
      <div className="absolute -bottom-32 right-1/4 size-[28rem] rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/15" />
    </div>
  );
}
