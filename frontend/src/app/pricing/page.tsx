"use client";

import { CheckCircle2, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tiers = [
  {
    slug: "free",
    name: "Starter",
    price: "Free",
    description: "Perfect for evaluation and personal use",
    features: [
      "50 pages / month",
      "PDF text extraction",
      "PaddleOCR Lite engine",
      "Web interface access",
      "AI advisor included",
    ],
  },
  {
    slug: "basic",
    name: "Essential",
    price: "$29",
    period: "/ month",
    description: "For business documents and forms",
    features: [
      "500 pages / month",
      "Printed text + tables",
      "PaddleOCR Vision-Language",
      "Invoice & form processing",
      "REST API access",
      "Webhook support",
    ],
  },
  {
    slug: "pro",
    name: "Professional",
    price: "$99",
    period: "/ month",
    description: "Advanced features for complex documents",
    highlight: true,
    features: [
      "5,000 pages / month",
      "Handwriting recognition (89%+ accuracy)",
      "Mathematical equations (LaTeX)",
      "GOT-OCR 2.0 + Qianfan OCR",
      "Medical & financial documents",
      "Key Information Extraction (KIE)",
      "Multi-language support",
      "Priority processing",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "Unlimited volume with highest accuracy",
    features: [
      "Unlimited page processing",
      "GOT-OCR 2.0 Enterprise (91-97% accuracy)",
      "Qianfan OCR Enterprise",
      "Custom model fine-tuning",
      "Complex layout handling",
      "Custom templates",
      "Dedicated support",
      "Custom SLA",
      "On-premise deployment option",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="px-4 py-16 lg:px-8">
        <FadeIn className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Choose the Right Tier for Your Needs
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Transparent pricing based on capabilities. Start free, scale as you grow, upgrade anytime.
          </p>
        </FadeIn>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <FadeIn key={tier.slug} delay={0.1 + i * 0.08}>
                <Card
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden transition-all",
                    tier.highlight
                      ? "border-2 border-primary shadow-2xl ring-4 ring-primary/10 hover:-translate-y-2"
                      : "border-border shadow-sm hover-lift"
                  )}
                >
                  {tier.highlight && (
                    <>
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                      <div className="absolute right-6 top-6 z-10">
                        <Badge className="gap-1.5 bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-md">
                          <Zap className="size-3.5" />
                          Most Popular
                        </Badge>
                      </div>
                    </>
                  )}
                  
                  <CardHeader className={cn("pb-8", tier.highlight && "pt-8")}>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription className="min-h-[48px] text-sm leading-relaxed">
                      {tier.description}
                    </CardDescription>
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-5xl font-bold text-primary">{tier.price}</span>
                      {tier.period && (
                        <span className="text-base text-muted-foreground">{tier.period}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-1 flex-col pb-8">
                    <ul className="mb-8 flex-1 space-y-3.5">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                            <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          </div>
                          <span className="leading-relaxed text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {tier.slug === "free" ? (
                      <Link
                        href="/register"
                        className={cn(
                          buttonVariants({ variant: tier.highlight ? "default" : "outline", size: "lg" }),
                          "w-full gap-2 shadow-sm hover:shadow-md transition-all",
                          tier.highlight && "bg-primary hover:scale-105"
                        )}
                      >
                        Get Started Free
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : tier.slug === "enterprise" ? (
                      <a
                        href="mailto:sales@planetocr.com"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "w-full hover-scale"
                        )}
                      >
                        Contact Sales
                      </a>
                    ) : (
                      <Link
                        href={`/checkout?tier=${tier.slug}`}
                        className={cn(
                          buttonVariants({
                            variant: tier.highlight ? "default" : "outline",
                            size: "lg",
                          }),
                          "w-full gap-2 shadow-sm hover:shadow-md transition-all",
                          tier.highlight && "bg-primary hover:scale-105"
                        )}
                      >
                        Subscribe Now
                        <ArrowRight className="size-4" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
        </div>

        <FadeIn delay={0.4} className="mt-16 text-center">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-background p-8 shadow-sm">
            <p className="text-base leading-relaxed text-muted-foreground">
              All plans include AI-powered tier recommendations and live demos.
            </p>
            <p className="mt-4 text-base font-medium text-foreground">
              Need help choosing?{" "}
              <Link href="/advisor" className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80">
                Try our OCR Advisor
                <ArrowRight className="size-4" />
              </Link>
            </p>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
