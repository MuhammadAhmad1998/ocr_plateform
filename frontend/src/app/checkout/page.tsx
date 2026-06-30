"use client";

import { CheckCircle2, Loader2, Lock, Shield, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";
import { rh, iconBox } from "@/lib/remote-hub";
import { TIER_NAMES, TIER_PRICES } from "@/lib/utils";
import { cn } from "@/lib/utils";

const tierFeatures: Record<string, string[]> = {
  free: ["50 pages / month", "PDF text extraction", "AI advisor access"],
  basic: ["500 pages / month", "Printed text + tables", "REST API included"],
  pro: ["5,000 pages / month", "Equations & handwriting", "Priority processing"],
  enterprise: ["Unlimited volume", "Custom fine-tuning", "Dedicated SLA support"],
};

const ALLOWED_TIERS = new Set(Object.keys(tierFeatures));
const ALLOWED_CHECKOUT_HOSTS = [
  "checkout.stripe.com",
  "billing.stripe.com",
];

function isAllowedStripeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return ALLOWED_CHECKOUT_HOSTS.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const rawTier = params.get("tier");
  const tier = rawTier && ALLOWED_TIERS.has(rawTier) ? rawTier : "pro";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function handleCheckout() {
    setLoading(true);
    try {
      const { checkout_url } = await api.createCheckout(tier);
      if (!isAllowedStripeUrl(checkout_url)) {
        throw new Error("Unexpected checkout URL");
      }
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
        <span className={cn(rh.badge, "mb-4 gap-2 px-4 py-2")}>
          <Sparkles className="size-4" />
          Secure Checkout
        </span>
        <h1 className={cn(rh.h1, "mb-3 text-foreground")}>Confirm Your Plan</h1>
        <p className={cn(rh.body, "text-muted-foreground")}>
          Review your selection before proceeding to secure payment
        </p>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card className={cn(rh.card, "overflow-hidden")}>
            <CardHeader className="space-y-1 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className={rh.h2}>Your Selection</CardTitle>
                <span className={rh.badge}>{TIER_NAMES[tier] || tier}</span>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className={rh.priceValue}>{TIER_PRICES[tier]}</span>
                {tier !== "free" && tier !== "enterprise" && (
                  <span className="text-lg text-muted-foreground">/ month</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <h3 className={cn(rh.label, "mb-4 text-foreground")}>
                What's Included
              </h3>
              <ul className="space-y-4">
                {(tierFeatures[tier] || []).map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className={rh.checkWrap}>
                      <CheckCircle2 className={rh.checkIcon} />
                    </div>
                    <span className="text-base text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Separator className="my-8" />

              <Button
                onClick={handleCheckout}
                className="h-14 w-full gap-2 text-lg font-semibold"
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
          <Card className={rh.card}>
            <CardHeader className="space-y-2">
              <div className={iconBox("md")}>
                <Shield className="size-5" />
              </div>
              <CardTitle className="text-lg">Secure Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-foreground" />
                256-bit SSL encryption
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-foreground" />
                PCI DSS compliant
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-foreground" />
                Powered by Stripe
              </p>
            </CardContent>
          </Card>

          <Card className={rh.card}>
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Flexible billing</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  Cancel anytime, no questions asked
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  Upgrade or downgrade instantly
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  Prorated billing for changes
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className={cn(rh.card, "bg-muted/50")}>
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
    <div className="min-h-screen bg-background lg:pl-72">
      <AppSidebar />
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
