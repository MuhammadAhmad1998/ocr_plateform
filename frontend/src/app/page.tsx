import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    price: "$29 / mo",
    features: ["500 pages / month", "Tables & forms", "REST API access"],
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99 / mo",
    features: ["5,000 pages / month", "Equations & handwriting", "Priority processing"],
    highlight: true,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited volume", "Custom fine-tuning", "Dedicated SLA"],
  },
];

const steps = [
  {
    icon: FileSearch,
    title: "Upload a sample",
    description: "We fingerprint document type, layout complexity, and content signals in seconds.",
  },
  {
    icon: MessageSquare,
    title: "Talk to the advisor",
    description: "A RAG-grounded agent asks the right questions — no generic tier guesswork.",
  },
  {
    icon: Zap,
    title: "See it on your data",
    description: "Run a live OCR demo on your actual document before you choose a plan.",
  },
];

const trust = [
  { icon: Shield, label: "SOC-ready architecture" },
  { icon: Lock, label: "Encrypted at rest & in transit" },
  { icon: CheckCircle2, label: "Stripe-secured billing" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-mesh">
      <Navbar variant="marketing" />

      <main>
        {/* Hero — signup first */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pt-28">
          <FadeIn className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5 text-accent" />
              AI-powered OCR matching
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The right OCR tier for every document —{" "}
              <span className="text-primary">proven on yours</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Klarix analyzes your sample file, recommends the ideal processing tier, and runs a live
              demo so you buy with confidence — not guesswork.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }), "bg-accent text-accent-foreground hover:bg-accent/90 gap-2")}
              >
                Start free <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card · 50 pages included</p>
          </FadeIn>
        </section>

        {/* Product demo preview */}
        <section className="border-y border-border bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn delay={0.1} className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">How Klarix works</h2>
              <p className="mt-3 text-muted-foreground">Three steps from upload to validated recommendation</p>
            </FadeIn>
            <div className="grid gap-6 lg:grid-cols-3">
              {steps.map((step, i) => (
                <FadeIn key={step.title} delay={0.15 + i * 0.08}>
                  <Card className="h-full border-border/80 bg-card/80 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                        <step.icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.4} className="mt-10 flex justify-center">
              <Card className="w-full max-w-2xl overflow-hidden border-border bg-card shadow-lg">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-accent/80" />
                      <div className="size-2.5 rounded-full bg-primary/40" />
                      <div className="size-2.5 rounded-full bg-muted-foreground/30" />
                      <span className="ml-2 text-xs text-muted-foreground">Advisor session</span>
                    </div>
                  </div>
                  <div className="space-y-3 p-5 text-sm">
                    <div className="rounded-xl bg-muted px-4 py-3 text-muted-foreground">
                      Invoice_Q3.pdf uploaded · 4 pages · mixed tables detected
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                      Based on your tables and multi-column layout, Professional tier is the best fit.
                    </div>
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-muted-foreground">
                      Live demo running… 94% confidence · 1.2s
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </section>

        {/* Enterprise trust */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn className="flex flex-wrap items-center justify-center gap-8">
              {trust.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <item.icon className="size-4 text-primary" />
                  {item.label}
                </div>
              ))}
            </FadeIn>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border bg-card/30 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Transparent pricing</h2>
              <p className="mt-3 text-muted-foreground">
                Capability-based tiers — no opaque model names, just what you need.
              </p>
            </FadeIn>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier, i) => (
                <FadeIn key={tier.slug} delay={0.1 + i * 0.06}>
                  <Card
                    className={cn(
                      "relative h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
                      tier.highlight && "border-primary shadow-md ring-1 ring-primary/20"
                    )}
                  >
                    {tier.highlight && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                        Most popular
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle>{tier.name}</CardTitle>
                      <p className="text-2xl font-semibold text-primary">{tier.price}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2.5">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <FadeIn className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Ready to find your tier?</h2>
            <p className="mt-3 text-muted-foreground">
              Upload one document and let Klarix do the rest — recommendation and live proof included.
            </p>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              )}
            >
              Create free account <ArrowRight className="size-4" />
            </Link>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
