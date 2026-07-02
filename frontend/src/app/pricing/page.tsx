"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  Rocket,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
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
  { q: "Can I change plans anytime?", a: "Yes — upgrade or downgrade at any time. Prorated charges apply, and your quota resets to the new tier instantly." },
  { q: "What happens if I exceed my quota?", a: "New jobs will be rejected with a clear error. We never silently charge overage — you control upgrades." },
  { q: "Do you offer annual billing?", a: "Yes. Contact sales for annual discounts of up to 20% on Essential and Professional, or for custom Enterprise terms." },
  { q: "Is my data secure?", a: "All uploads are encrypted in transit and at rest. Documents are auto-deleted 24 hours after processing unless you opt in to retention." },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))", color: "rgb(var(--text-1))" }}>
      <AppSidebar />

      <main className="mx-auto max-w-[1080px] px-6 py-16">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-[640px] text-center">
          <span className="eyebrow mb-5 inline-flex">◆ Transparent pricing</span>
          <h1 className="mb-4 text-[38px] font-bold leading-tight tracking-[-0.8px]" style={{ color: "rgb(var(--text-1))" }}>
            Pricing that scales with your documents
          </h1>
          <p className="text-lg" style={{ color: "rgb(var(--text-2))" }}>
            Start free, upgrade only when you need more pages or premium engines. Cancel any time.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.slug}
                className={cn("relative flex flex-col rounded-xl p-6 transition-all hover:-translate-y-0.5", tier.highlight && "lg:-my-2")}
                style={{
                  background: "rgb(var(--surface-1))",
                  border: tier.highlight
                    ? "1px solid rgb(var(--teal))"
                    : "0.5px solid rgb(var(--border))",
                }}
              >
                {tier.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: "rgb(var(--amber))", color: "rgb(var(--amber-ink))" }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Icon */}
                <div
                  className="mb-4 flex size-10 items-center justify-center rounded-lg"
                  style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
                >
                  <Icon className="size-5" />
                </div>

                <h3 className="text-lg font-semibold" style={{ color: "rgb(var(--text-1))" }}>{tier.name}</h3>
                <p className="mb-4 mt-1 min-h-[40px] text-sm" style={{ color: "rgb(var(--text-2))" }}>{tier.description}</p>

                {/* Price */}
                <div className="mb-6 flex items-baseline gap-1.5">
                  <span
                    className="font-mono text-[42px] font-semibold tracking-tight"
                    style={{ color: tier.highlight ? "rgb(var(--teal))" : "rgb(var(--text-1))" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm" style={{ color: "rgb(var(--text-2))" }}>{tier.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-7 flex-1 space-y-2.5 border-t pt-5" style={{ borderColor: "rgb(var(--border))" }}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "rgb(var(--text-1))" }}>
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: "rgb(var(--teal))" }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.cta.href}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:brightness-110"
                  style={
                    tier.highlight
                      ? { background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }
                      : { background: "rgb(var(--surface-2))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }
                  }
                >
                  {tier.cta.label}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Trust strip */}
        <div
          className="mt-14 grid gap-4 rounded-xl p-6 sm:grid-cols-3"
          style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
        >
          {[
            { icon: "◎", title: "AI advisor included", text: "Get a tailored tier recommendation from a chat-based AI advisor on every plan." },
            { icon: "⇄", title: "Live OCR demo",       text: "Try the engine on your own document before you commit to a plan." },
            { icon: "✓", title: "Cancel anytime",      text: "No long-term contracts. Upgrade, downgrade, or cancel in one click." },
          ].map((item) => (
            <div key={item.title}>
              <div
                className="mb-3 flex size-9 items-center justify-center rounded-lg text-lg"
                style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
              >
                {item.icon}
              </div>
              <p className="font-semibold" style={{ color: "rgb(var(--text-1))" }}>{item.title}</p>
              <p className="mt-1 text-sm" style={{ color: "rgb(var(--text-2))" }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-14 max-w-[760px]">
          <div className="mb-7 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[1px] mb-2" style={{ color: "rgb(var(--text-2))" }}>Frequently asked</div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>Questions, answered.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl p-5"
                style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium"
                  style={{ color: "rgb(var(--text-1))" }}
                >
                  {f.q}
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-lg transition-transform group-open:rotate-45"
                    style={{ background: "rgb(var(--surface-2))", color: "rgb(var(--text-2))" }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-14 rounded-[18px] p-12 text-center"
          style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))" }}
        >
          <h3 className="mb-3 text-[26px] font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
            Not sure which plan is right?
          </h3>
          <p className="mx-auto mb-7 max-w-md" style={{ color: "rgb(var(--text-2))" }}>
            Chat with our AI advisor for a personalised recommendation — and run a live OCR demo on your own document.
          </p>
          <Link
            href="/advisor"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors hover:brightness-110"
            style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
          >
            Try the OCR Advisor
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
