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
import { iconBox, rh } from "@/lib/remote-hub";
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
  cta: { label: string; href: string };
};

const TIERS: Tier[] = [
  {
    slug: "free",
    name: "Starter",
    price: "Free",
    description: "Perfect for evaluation and personal use",
    icon: Rocket,
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
    <div className="relative min-h-screen bg-background">
      <Navbar variant="marketing" />

      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        {/* ============ HERO ============ */}
        <FadeIn className="mx-auto mb-16 max-w-3xl text-center">
          <div className={cn(rh.badge, "mx-auto mb-5")}>
            <Sparkles className="size-3.5" />
            Transparent pricing
            <span className="h-3 w-px bg-border" />
            <span className="text-foreground">No hidden fees</span>
          </div>
          <h1 className={cn(rh.h1, "text-4xl sm:text-6xl")}>
            Pricing that scales with your documents
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Start free, upgrade only when you need more pages or premium engines. Cancel any time.
          </p>
        </FadeIn>

        {/* ============ TIERS ============ */}
        <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isHighlight = !!tier.highlight;

            return (
              <FadeIn key={tier.slug} delay={0.08 + i * 0.06} className="h-full">
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
                          Most Popular
                        </div>
                      </div>
                    )}

                    <div className="relative flex h-full flex-col">
                      <div className="space-y-4">
                        <div className={iconBox("lg")}>
                          <Icon className="size-6" />
                        </div>
                        <div>
                          <h3 className={rh.h2}>{tier.name}</h3>
                          <p className="mt-1 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
                            {tier.description}
                          </p>
                        </div>

                        <div className="flex items-baseline gap-1.5 pt-2">
                          <span className={rh.priceValue}>{tier.price}</span>
                          {tier.period && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {tier.period}
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="my-7 flex-1 space-y-3 border-t border-border pt-6">
                        {tier.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm text-foreground/90"
                          >
                            <div className={rh.checkWrap}>
                              <CheckCircle2 className={rh.checkIcon} />
                            </div>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={tier.cta.href}
                        className={cn(
                          buttonVariants({ size: "lg", variant: isHighlight ? "default" : "outline" }),
                          "w-full gap-2"
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
            />
            <TrustCard
              icon={<Zap className="size-5" />}
              title="Live OCR demo"
              text="Try the engine on your own document before you commit to a plan."
            />
            <TrustCard
              icon={<CheckCircle2 className="size-5" />}
              title="Cancel anytime"
              text="No long-term contracts. Upgrade, downgrade, or cancel in one click."
            />
          </div>
        </FadeIn>

        {/* ============ FAQ ============ */}
        <FadeIn delay={0.5} className="mt-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <p className={rh.eyebrow}>Frequently asked</p>
              <h2 className={cn(rh.h1, "text-3xl sm:text-4xl")}>Questions, answered.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className={cn(rh.cardHover, "p-5 open:shadow-md")}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground">
                    {f.q}
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
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
          <div className={cn(rh.card, "p-8 text-center sm:p-12")}>
            <div className={cn(iconBox("lg"), "mx-auto mb-5")}>
              <Sparkles className="size-6" />
            </div>
            <h3 className={cn(rh.h1, "text-3xl sm:text-4xl")}>
              Not sure which plan is right?
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Chat with our AI advisor for a personalised recommendation — and run a live OCR
              demo on your own document.
            </p>
            <Link
              href="/advisor"
              className={cn(buttonVariants({ size: "lg" }), "mt-6 gap-2")}
            >
              Try the OCR Advisor
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={cn(rh.cardHover, "p-5")}>
      <div className={cn(iconBox("md"), "mb-3")}>{icon}</div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
