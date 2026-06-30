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
import { iconBox, rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

const tiers = [
  {
    slug: "free",
    name: "Starter",
    price: "Free",
    features: ["50 pages / month", "PDF text extraction", "AI advisor included"],
  },
  {
    slug: "basic",
    name: "Essential",
    price: "$29",
    period: "/mo",
    features: ["500 pages / month", "Tables & forms", "REST API access"],
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99",
    period: "/mo",
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
  { icon: TrendingUp, value: "99.8%", label: "Accuracy rate" },
  { icon: Zap, value: "<2s", label: "Average processing" },
  { icon: Globe, value: "50+", label: "Languages supported" },
  { icon: Award, value: "SOC 2", label: "Certified platform" },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      <Navbar variant="marketing" />

      <main>
        {/* ============ HERO ============ */}
        <section className="relative px-4 pt-12 pb-20 sm:pt-20 sm:pb-28 lg:px-8 lg:pt-24 lg:pb-32">
          <FadeIn className="mx-auto max-w-4xl text-center">
            <div className={cn(rh.badge, "mx-auto mb-6")}>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span>AI-powered tier recommendations</span>
              <span className="h-3 w-px bg-border" />
              <span className="text-foreground">New</span>
            </div>

            <h1 className={cn(rh.display, "text-balance text-foreground sm:text-6xl lg:text-7xl")}>
              The right OCR tier for every document.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Planet OCR&apos;s AI advisor understands your needs, recommends the ideal processing
              tier, and lets you validate with a live demo — buy with confidence, not guesswork.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }), "group gap-2")}
              >
                Get Started Free
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/advisor"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
              >
                <Sparkles className="size-4" />
                Try the Advisor
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-foreground" />
                No credit card required
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-foreground" />
                50 free pages
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-foreground" />
                Cancel anytime
              </span>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={0.15} className="mx-auto mt-20 max-w-6xl">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(rh.cardHover, "p-5 text-center")}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="space-y-3">
                      <div className={cn(iconBox("md"), "mx-auto")}>
                        <Icon className="size-5" />
                      </div>
                      <div className={rh.statValue}>{stat.value}</div>
                      <div className={cn(rh.label, "normal-case tracking-normal")}>
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
        <section className={rh.section}>
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>How it works</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
              From upload to insight in 3 steps
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              An AI-guided workflow that ends with a real OCR demo on your own document.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={0.1 + i * 0.08}>
                  <div className={cn(rh.cardHover, "h-full p-7")}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={iconBox("lg")}>
                          <Icon className="size-6" />
                        </div>
                        <span className={cn(rh.badge, "px-2.5 py-0.5 normal-case tracking-normal")}>
                          Step {i + 1}
                        </span>
                      </div>
                      <h3 className={rh.h2}>{step.title}</h3>
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
            <div className={cn(rh.card, "grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:gap-2")}>
              {trust.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="group flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/50"
                  >
                    <div className={iconBox("sm")}>
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
        <section className={rh.section}>
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>Transparent pricing</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>Capability-based tiers</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              No opaque model names — just what you actually need.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => {
              const isHighlight = !!tier.highlight;
              return (
                <FadeIn key={tier.slug} delay={0.1 + i * 0.06} className="h-full">
                  <div className={cn("relative h-full", isHighlight && "lg:-my-2")}>
                    <div
                      className={cn(
                        rh.card,
                        "relative flex h-full flex-col p-6",
                        isHighlight && "border-foreground/20 shadow-md"
                      )}
                    >
                      {isHighlight && (
                        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                          <div className={cn(rh.badge, "gap-1.5 text-foreground")}>
                            <Star className="size-3 fill-current" />
                            Popular
                          </div>
                        </div>
                      )}
                      <div className="space-y-4">
                        <h3 className={rh.h2}>{tier.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className={rh.priceValue}>{tier.price}</span>
                          {tier.period && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {tier.period}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-2.5 border-t border-border pt-4">
                          {tier.features.map((f) => (
                            <li key={f} className="flex items-start gap-2.5 text-sm">
                              <div className={rh.checkWrap}>
                                <CheckCircle2 className={rh.checkIcon} />
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
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
            >
              Compare all plans
              <ArrowRight className="size-4" />
            </Link>
          </FadeIn>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-20">
          <FadeIn className="mx-auto max-w-5xl">
            <div className={cn(rh.card, "p-8 text-center sm:p-14")}>
              <div className={cn(iconBox("lg"), "mx-auto mb-5")}>
                <Sparkles className="size-6" />
              </div>
              <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
                Ready to find your perfect tier?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Start a conversation with our AI advisor, get a personalised tier recommendation,
                then validate with a live OCR demo before you commit.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={cn(buttonVariants({ size: "lg" }), "group gap-2")}
                >
                  Create Free Account
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/advisor"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
                >
                  Try the Advisor
                </Link>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
