"use client";

import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-background gradient-mesh">
      <Navbar />
      
      <main className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5 text-accent" />
              Powered by PaddleOCR, GOT-OCR 2.0, and Qianfan OCR
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Choose the right tier for your needs
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Transparent pricing based on capabilities. Start free, upgrade anytime.
            </p>
          </FadeIn>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <FadeIn key={tier.slug} delay={0.1 + i * 0.05}>
                <Card
                  className={cn(
                    "relative flex h-full flex-col transition-all hover:-translate-y-1 hover:shadow-lg",
                    tier.highlight && "border-primary shadow-lg ring-2 ring-primary/20"
                  )}
                >
                  {tier.highlight && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                      Most popular
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">{tier.price}</span>
                      {tier.period && (
                        <span className="ml-1 text-base text-muted-foreground">{tier.period}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {tier.slug === "free" ? (
                      <Link
                        href="/register"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full"
                        )}
                      >
                        Get started free
                      </Link>
                    ) : tier.slug === "enterprise" ? (
                      <Button variant="outline" className="w-full" asChild>
                        <a href="mailto:sales@klarix.com">Contact sales</a>
                      </Button>
                    ) : (
                      <Link
                        href={`/checkout?tier=${tier.slug}`}
                        className={cn(
                          buttonVariants({
                            variant: tier.highlight ? "default" : "outline",
                          }),
                          tier.highlight && "bg-accent text-accent-foreground hover:bg-accent/90",
                          "w-full gap-2"
                        )}
                      >
                        Subscribe <ArrowRight className="size-4" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3} className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include AI-powered tier recommendations and live demos.
              <br />
              Need help choosing? <Link href="/advisor" className="text-primary hover:underline">Try our OCR advisor</Link>
            </p>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
