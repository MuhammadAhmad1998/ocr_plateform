"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      toast.success("Welcome back");
      router.push("/advisor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
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
        <FadeIn className="w-full max-w-md">
          <div className="mb-10 text-center">
            <Logo />
            <h1 className="mt-6 text-3xl font-bold text-foreground">Welcome Back</h1>
            <p className="mt-2 text-muted-foreground">Sign in to continue with your OCR advisor</p>
          </div>
          <Card className="overflow-hidden border-border shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email Address
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
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
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </Button>
              </form>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">New to Planet OCR?</span>
                </div>
              </div>
              <Link
                href="/register"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-border bg-muted/50 font-semibold text-foreground transition-all hover:border-primary hover:bg-muted hover:scale-105"
              >
                <Sparkles className="size-5" />
                Create Free Account
              </Link>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
