"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  FileSearch,
  FileText,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AdvisorDemoWidget } from "@/components/AdvisorDemoWidget";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { iconBox, rh } from "@/lib/remote-hub";
import { isLoggedIn } from "@/lib/api";
import { cn } from "@/lib/utils";

const CODE_EXAMPLE = `from planetocr import Client

client = Client(api_key="ocr_...")

# One call — we pick the best engine
result = client.recognize(
    file="invoice.pdf",
    strategy="auto"
)

print(result.text)       # extracted text
print(result.confidence) # → 0.96`;

const stats = [
  { icon: TrendingUp, value: "99.8%", label: "Accuracy rate" },
  { icon: Zap, value: "<2s", label: "Avg. processing" },
  { icon: Globe, value: "50+", label: "Languages" },
  { icon: Award, value: "SOC 2", label: "Certified" },
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

const features = [
  {
    icon: Layers,
    title: "Multi-engine routing",
    description:
      "40+ OCR engines unified behind one API. We route each document to the best engine automatically.",
  },
  {
    icon: BarChart3,
    title: "Accuracy benchmarks",
    description:
      "Run candidate engines on your actual documents, not generic leaderboards. See real performance data.",
  },
  {
    icon: RefreshCw,
    title: "Automatic fallbacks",
    description:
      "Some engines refuse certain document types mid-pipeline. We detect it and reroute automatically.",
  },
  {
    icon: Code2,
    title: "Simple API",
    description:
      "One SDK, one key, one bill. Commercial and open-source engines behind a single integration.",
  },
  {
    icon: Lock,
    title: "Data privacy",
    description:
      "Region-pinned processing and zero-retention options for documents that can't leave your region.",
  },
  {
    icon: Shield,
    title: "Enterprise ready",
    description:
      "SOC 2 certified, encrypted at rest and in transit, with dedicated SLAs for enterprise customers.",
  },
];

const useCases = [
  {
    icon: FileText,
    title: "Invoices & Receipts",
    description: "Extract line items, totals, and vendor details from financial documents.",
  },
  {
    icon: BookOpen,
    title: "Contracts & Legal",
    description: "Parse agreements, identify clauses, and extract key terms automatically.",
  },
  {
    icon: Users,
    title: "ID Verification",
    description: "Process passports, driver's licenses, and national IDs with high accuracy.",
  },
  {
    icon: Building2,
    title: "Forms & Applications",
    description: "Digitize handwritten forms, applications, and survey responses.",
  },
];

const logos = [
  "PaddleOCR",
  "Tesseract",
  "Surya",
  "docTR",
  "TrOCR",
  "GOT-OCR",
  "AWS Textract",
  "Azure AI",
];

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

const faqs = [
  {
    q: "What document types do you support?",
    a: "We support PDFs, images (PNG, JPG, WEBP, TIFF), and scanned documents. Our engines handle printed text, handwriting, tables, forms, invoices, IDs, and mathematical equations.",
  },
  {
    q: "How does the AI advisor work?",
    a: "The advisor is a chat-based AI that learns about your document types, volume, and accuracy requirements. It then recommends the optimal tier and lets you test with a live OCR demo before you subscribe.",
  },
  {
    q: "Can I try before I commit?",
    a: "Yes! Every plan includes a live demo feature. Upload a sample document, pick an engine, and see the actual OCR output before you subscribe. No credit card required for the free tier.",
  },
  {
    q: "What happens if an engine fails or refuses my document?",
    a: "Our platform automatically detects refusals and failures (like some VLMs refusing ID documents) and reroutes to an alternative engine that can handle it. Your pipeline never breaks silently.",
  },
  {
    q: "Is my data secure?",
    a: "All uploads are encrypted in transit and at rest. We're SOC 2 certified and offer zero-retention processing options. Region-pinned processing is available for data residency requirements.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes. Contact sales for annual discounts of up to 20% on Essential and Professional plans, or for custom Enterprise terms.",
  },
];

const trust = [
  { icon: Shield, label: "SOC 2 Type II" },
  { icon: Lock, label: "Encrypted at rest & in transit" },
  { icon: CheckCircle2, label: "99.9% uptime SLA" },
];

export default function HomePage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tryHref, setTryHref] = useState("/register");

  useEffect(() => {
    setTryHref(isLoggedIn() ? "/advisor" : "/register");
  }, []);

  const copyCode = async () => {
    await navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopiedCode(true);
    toast.success("Code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar variant="marketing" />

      <main>
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-32 lg:px-8 lg:pt-28 lg:pb-36">
          {/* Dot grid background */}
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
          
          <div className="relative">
            <FadeIn className="mx-auto max-w-4xl text-center">
              <div className={cn(rh.eyebrowPill, "mx-auto mb-6")}>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <span>The OCR intelligence layer</span>
              </div>

              <h1 className={cn(rh.display, "text-balance text-foreground")}>
                Every OCR engine.{" "}
                <span className="text-primary">One intelligent answer.</span>
              </h1>

              <p className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Upload a document and our agent benchmarks every engine — open-source and commercial
                — on your actual data, then routes to the winner. Stop guessing which OCR to use.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href={tryHref}
                  className={cn(buttonVariants({ size: "lg" }), "group gap-2")}
                >
                  Try it on your document
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/docs"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
                >
                  Read the docs
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  50 free pages
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  Cancel anytime
                </span>
              </div>
            </FadeIn>

            {/* Code preview */}
            <FadeIn delay={0.15} className="mx-auto mt-16 max-w-2xl">
              <div className="overflow-hidden rounded-xl border border-border bg-foreground shadow-2xl">
                <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-foreground px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-muted-foreground/30" />
                    <span className="size-3 rounded-full bg-muted-foreground/40" />
                    <span className="size-3 rounded-full bg-primary" />
                  </div>
                  <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <Terminal className="size-3.5" />
                    quickstart.py
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyCode}
                    className="h-7 gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/20 hover:text-primary-foreground"
                  >
                    {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copiedCode ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-primary-foreground">
                  <code>{CODE_EXAMPLE}</code>
                </pre>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============ LOGOS ============ */}
        <section className="border-y border-border bg-card/50 px-4 py-10 lg:px-8">
          <FadeIn className="mx-auto max-w-6xl">
            <p className={cn(rh.monoLabel, "mb-6 text-center")}>
              One API in front of 40+ engines
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {logos.map((logo) => (
                <span
                  key={logo}
                  className="font-mono text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {logo}
                </span>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ============ STATS ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-20">
          <FadeIn className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(rh.card, "p-6 text-center")}
                  >
                    <div className={cn(iconBox("md"), "mx-auto mb-4")}>
                      <Icon className="size-5" />
                    </div>
                    <div className={cn(rh.statValue, "text-3xl sm:text-4xl")}>{stat.value}</div>
                    <div className="mt-1 text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </section>

        {/* ============ FEATURES ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>Why Planet OCR</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
              The brain, not just the pipe
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Aggregators hand you a catalogue and leave you to guess. We tell you which engine
              wins — on your documents.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={feature.title} delay={0.05 + i * 0.05}>
                  <div className={cn(rh.cardHover, "h-full p-6")}>
                    <div className={iconBox("md", "mb-4")}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className={cn(rh.h2, "mb-2")}>{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="bg-card/50 px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>How it works</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
              From upload to insight in 3 steps
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              An AI-guided workflow that ends with a real OCR demo on your own document.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={0.1 + i * 0.08}>
                  <div className={cn(rh.card, "relative h-full p-7")}>
                    <div className="absolute -top-4 left-6">
                      <span className="flex size-8 items-center justify-center rounded-full border border-primary/40 bg-accent font-mono text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                    </div>
                    <div className="pt-4">
                      <div className={iconBox("lg", "mb-4")}>
                        <Icon className="size-6" />
                      </div>
                      <h3 className={cn(rh.h2, "mb-2")}>{step.title}</h3>
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

        {/* ============ USE CASES ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>Use cases</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
              Built for every document type
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              From invoices to IDs, our engines handle diverse document formats with industry-leading accuracy.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase, i) => {
              const Icon = useCase.icon;
              return (
                <FadeIn key={useCase.title} delay={0.05 + i * 0.05}>
                  <div className={cn(rh.cardHover, "h-full p-5 text-center")}>
                    <div className={cn(iconBox("lg"), "mx-auto mb-4")}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mb-2 font-bold text-foreground">{useCase.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {useCase.description}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* ============ TRUST STRIP ============ */}
        <FadeIn className="px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className={cn(rh.card, "grid grid-cols-1 gap-3 p-4 sm:grid-cols-3")}>
              {trust.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground/80"
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
        <section className="px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>Transparent pricing</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>Capability-based tiers</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              No opaque model names — just what you actually need. Start free, scale as you grow.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => {
              const isHighlight = !!tier.highlight;
              return (
                <FadeIn key={tier.slug} delay={0.05 + i * 0.05} className="h-full">
                  <div className={cn("relative h-full", isHighlight && "lg:-my-2")}>
                    <div
                      className={cn(
                        rh.card,
                        "relative flex h-full flex-col p-6",
                        isHighlight && "border-primary/50 shadow-lg"
                      )}
                    >
                      {isHighlight && (
                        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                          <div className={cn(rh.recBadge)}>
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

          <FadeIn delay={0.3} className="mt-10 text-center">
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
            >
              Compare all plans
              <ArrowRight className="size-4" />
            </Link>
          </FadeIn>
        </section>

        {/* ============ FAQ ============ */}
        <section className="bg-card/50 px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
            <p className={rh.eyebrow}>FAQ</p>
            <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
              Common questions
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Everything you need to know about Planet OCR.
            </p>
          </FadeIn>

          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={0.03 * i}>
                <div className={cn(rh.card, "overflow-hidden")}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className="font-semibold text-foreground">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground transition-transform",
                        openFaq === i && "rotate-180"
                      )}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-border px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-4 py-16 lg:px-8 lg:py-24">
          <FadeIn className="mx-auto max-w-5xl">
            <div className={cn(rh.card, "overflow-hidden p-8 text-center sm:p-14")}>
              <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative">
                <div className={cn(iconBox("lg"), "mx-auto mb-5")}>
                  <Upload className="size-6" />
                </div>
                <h2 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
                  Find your best OCR in 30 seconds
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Free for your first document. No card required. Upload, benchmark, and see
                  which engine wins — on your actual data.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={tryHref}
                    className={cn(buttonVariants({ size: "lg" }), "group gap-2")}
                  >
                    Upload a document
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/register"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
                  >
                    Create free account
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
