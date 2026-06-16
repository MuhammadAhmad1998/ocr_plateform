"use client";

import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
    <FadeIn className="mx-auto max-w-lg">
      <Card className="border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Confirm your plan</CardTitle>
          <CardDescription>Review your selection before secure checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm font-medium text-primary">Selected tier</p>
            <p className="mt-1 text-3xl font-semibold">{TIER_NAMES[tier] || tier}</p>
            <p className="text-xl text-muted-foreground">{TIER_PRICES[tier]}</p>
            <Separator className="my-4" />
            <ul className="space-y-2.5">
              {(tierFeatures[tier] || []).map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleCheckout}
            className="w-full bg-accent py-5 text-base text-accent-foreground hover:bg-accent/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Secure payment via Stripe · Cancel anytime
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Navbar />
      <main className="px-6 py-12">
        <Suspense
          fallback={
            <div className="mx-auto max-w-lg space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
