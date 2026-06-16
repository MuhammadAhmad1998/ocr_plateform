"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";

const benefits = [
  "50 free pages per month",
  "AI-powered tier recommendations",
  "Live OCR demos on your documents",
  "No credit card required",
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await api.register(email, password, fullName || undefined);
      setTokens(tokens.access_token, tokens.refresh_token);
      toast.success("Account created — let's find your tier");
      router.push("/advisor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-4 top-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-4 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <FadeIn className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <Logo />
            <h1 className="mt-6 text-3xl font-bold text-foreground">Start Your Free Account</h1>
            <p className="mt-2 text-muted-foreground">Get intelligent OCR recommendations in minutes</p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="overflow-hidden border-border shadow-2xl">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Work Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 bg-primary text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Get Started Free
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </Button>
                </form>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Already have an account?</span>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-border bg-muted/50 font-semibold text-foreground transition-all hover:border-primary hover:bg-muted hover:scale-105"
                >
                  Sign In Instead
                </Link>
              </CardContent>
            </Card>

            <div className="flex flex-col justify-center space-y-8 lg:pl-8">
              <div className="space-y-4">
                <div className="inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">What You Get</h2>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                        <CheckCircle2 className="size-5 text-primary" />
                      </div>
                      <span className="text-lg text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Join thousands of users who trust Planet OCR for intelligent OCR processing. Start with our free tier
                  and upgrade only when you&apos;re ready.
                </p>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-center text-sm text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
