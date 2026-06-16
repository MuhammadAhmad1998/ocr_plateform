"use client";

import { CheckCircle2, Loader2, Lock, Shield, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api, getToken } from "@/lib/api";
import { TIER_NAMES, TIER_PRICES } from "@/lib/utils";

const tierFeatures: Record<string, string[]> = {
  free: ["50 pages / month", "PDF text extraction", "AI advisor access"],
  basic: ["500 pages / month", "Printed text + tables", "REST API included"],
  pro: ["5,000 pages / month", "Equations & handwriting", "Priority processing"],
  enterprise: ["Unlimited volume", "Custom fine-tuning", "Dedicated SLA support"],
};

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") || "pro";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function handleCheckout() {
    setLoading(true);
    try {
      const { checkout_url } = await api.createCheckout(tier);
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <FadeIn className="mb-8 text-center">
        <Badge variant="secondary" className="mb-4 gap-2 px-4 py-2 shadow-sm">
          <Sparkles className="size-4 text-primary" />
          Secure Checkout
        </Badge>
        <h1 className="mb-3 text-4xl font-bold text-foreground">Confirm Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Review your selection before proceeding to secure payment
        </p>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
            <CardHeader className="space-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Your Selection</CardTitle>
                <Badge className="bg-primary text-lg px-4 py-1.5 shadow-sm">
                  {TIER_NAMES[tier] || tier}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-5xl font-bold text-foreground">{TIER_PRICES[tier]}</span>
                {tier !== "free" && tier !== "enterprise" && (
                  <span className="text-lg text-muted-foreground">/ month</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <h3 className="mb-4 text-base font-bold uppercase tracking-wider text-foreground">
                What's Included
              </h3>
              <ul className="space-y-4">
                {(tierFeatures[tier] || []).map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    </div>
                    <span className="text-base text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Separator className="my-8" />

              <Button
                onClick={handleCheckout}
                className="h-14 w-full gap-2 bg-primary text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <Lock className="size-5" />
                    Continue to Secure Payment
                  </>
                )}
              </Button>

              <Link
                href="/pricing"
                className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" />
                Change plan
              </Link>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2} className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 w-fit">
                <Shield className="size-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Secure Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                256-bit SSL encryption
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                PCI DSS compliant
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Powered by Stripe
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Flexible billing</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Cancel anytime, no questions asked
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Upgrade or downgrade instantly
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Prorated billing for changes
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/50 shadow-sm">
            <CardContent className="pt-6 text-center text-xs text-muted-foreground">
              <p>
                Questions about billing?
                <br />
                <a href="mailto:billing@planetocr.com" className="mt-1 inline-block font-medium text-primary hover:underline">
                  Contact our support team
                </a>
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="px-4 py-16 lg:px-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-4xl space-y-6">
              <Skeleton className="h-12 w-96 mx-auto" />
              <div className="grid gap-8 lg:grid-cols-3">
                <Skeleton className="h-96 lg:col-span-2" />
                <Skeleton className="h-96" />
              </div>
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
