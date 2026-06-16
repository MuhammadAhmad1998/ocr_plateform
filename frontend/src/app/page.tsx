import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Lock,
  MessageSquare,
  Shield,
  Zap,
  TrendingUp,
  Award,
  Globe,
} from "lucide-react";
import { AdvisorDemoWidget } from "@/components/AdvisorDemoWidget";
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
    price: "$29",
    period: "/mo",
    features: ["500 pages / month", "Tables & forms", "REST API access"],
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99",
    period: "/mo",
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
    icon: MessageSquare,
    title: "Chat with the advisor",
    description: "Tell us about your document types, volume, and accuracy needs — our AI agent guides the conversation.",
  },
  {
    icon: Zap,
    title: "Get your recommendation",
    description: "Receive a personalized tier match based on your requirements — no guesswork, just smart suggestions.",
  },
  {
    icon: FileSearch,
    title: "See it in action",
    description: "Upload a sample document and run a live OCR demo to validate your recommendation before subscribing.",
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
    <div className="min-h-screen bg-background">
      <Navbar variant="marketing" />

      <main>
        <section className="relative overflow-hidden gradient-mesh">
          {/* Animated Background Logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="animate-spin-slow opacity-[0.12]">
              <svg
                width="900"
                height="900"
                viewBox="0 0 480 480"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                {/* Planet circle */}
                <circle cx="240" cy="240" r="120" fill="currentColor" opacity="0.7" />
                
                {/* Orbital rings */}
                <ellipse
                  cx="240"
                  cy="240"
                  rx="180"
                  ry="60"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.5"
                />
                <ellipse
                  cx="240"
                  cy="240"
                  rx="180"
                  ry="60"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.4"
                  transform="rotate(120 240 240)"
                />
                
                {/* Orbital dots */}
                <circle cx="420" cy="240" r="10" fill="currentColor" opacity="0.6">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 240 240"
                    to="360 240 240"
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx="60" cy="240" r="8" fill="currentColor" opacity="0.5">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="180 240 240"
                    to="540 240 240"
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx="240" cy="180" r="9" fill="currentColor" opacity="0.55">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="90 240 240"
                    to="450 240 240"
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </div>
          </div>

          <div className="relative z-10 px-4 py-24 sm:py-32 lg:px-8">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Document intelligence
              </p>
              <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                The right OCR tier for{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  every document
                </span>
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Planet OCR's AI advisor understands your needs, recommends the ideal processing tier, and lets you
                validate with a live demo — buy with confidence, not guesswork.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group gap-2 bg-primary px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  )}
                >
                  Get Started Free
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "px-8 py-6 text-base font-semibold hover-scale"
                  )}
                >
                  Sign In
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                No credit card required • 50 pages included free
              </p>
            </FadeIn>

            <FadeIn delay={0.2} className="mx-auto mt-16 max-w-5xl">
              <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-border bg-card/50 p-6 text-center backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-1"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="mb-3 inline-flex rounded-full bg-primary/10 p-3">
                      <stat.icon className="size-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>
        </section>

        <section className="border-y border-border bg-muted/30 py-24">
          <div className="px-4 lg:px-8">
            <FadeIn className="mb-16 text-center">
              <h2 className="text-4xl font-bold tracking-tight text-foreground">How Planet OCR Works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps to your perfect OCR tier
              </p>
            </FadeIn>
            <div className="grid gap-8 lg:grid-cols-3">
              {steps.map((step, i) => (
                <FadeIn key={step.title} delay={0.1 + i * 0.1}>
                  <Card className="group relative h-full overflow-hidden border-border bg-card hover-lift">
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent opacity-0 transition-opacity group-hover:opacity-100" />
                    <CardHeader className="pb-4">
                      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                        <step.icon className="size-7 text-primary" />
                      </div>
                      <div className="mb-2 text-sm font-semibold text-primary">Step {i + 1}</div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.4} className="mt-16 flex justify-center">
              <AdvisorDemoWidget />
            </FadeIn>
          </div>
        </section>

        <section className="bg-background py-16">
          <div className="px-4 lg:px-8">
            <FadeIn className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {trust.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  {item.label}
                </div>
              ))}
            </FadeIn>
          </div>
        </section>

        <section className="border-t border-border bg-gradient-to-b from-muted/50 to-background py-24">
          <div className="px-4 lg:px-8">
            <FadeIn className="mb-16 text-center">
              <h2 className="text-4xl font-bold tracking-tight text-foreground">Transparent Pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Capability-based tiers — no opaque model names, just what you need.
              </p>
            </FadeIn>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier, i) => (
                <FadeIn key={tier.slug} delay={0.1 + i * 0.08}>
                  <Card
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden transition-all hover-lift",
                      tier.highlight
                        ? "border-2 border-primary shadow-xl ring-4 ring-primary/10"
                        : "border-border shadow-sm"
                    )}
                  >
                    {tier.highlight && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                    )}
                    {tier.highlight && (
                      <Badge className="absolute -right-12 top-6 rotate-45 bg-accent px-12 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                        Popular
                      </Badge>
                    )}
                    <CardHeader className="pb-8">
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-primary">{tier.price}</span>
                        {tier.period && (
                          <span className="text-base text-muted-foreground">{tier.period}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                            <span className="text-muted-foreground">{f}</span>
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

        <section className="bg-gradient-to-br from-primary/5 via-accent/5 to-background py-24">
          <FadeIn className="mx-auto max-w-4xl px-4 text-center lg:px-8">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">
              Ready to Find Your Perfect Tier?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Start a conversation with our AI advisor to get your personalized tier recommendation,
              then optionally test with a live demo before you commit.
            </p>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group mt-10 gap-2 bg-primary px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              )}
            >
              Create Free Account
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
