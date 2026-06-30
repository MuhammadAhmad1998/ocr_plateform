"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Quote,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";
import { iconBox, rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const HIGHLIGHTS = [
  { icon: Sparkles, label: "AI-powered tier recommendations" },
  { icon: Zap, label: "Live OCR demos on your own docs" },
  { icon: Shield, label: "SOC-ready, encrypted in transit" },
];

function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/advisor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);

      const user = await api.me();
      toast.success("Welcome back");

      if (user.role === "super_admin") {
        router.push(next.startsWith("/admin") ? next : "/admin");
      } else {
        router.push(
          next.startsWith("/") && !next.startsWith("/admin") ? next : "/advisor"
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-4 pb-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* LEFT: brand / value panel */}
          <FadeIn className="hidden lg:flex">
            <BrandPanel />
          </FadeIn>

          {/* RIGHT: form */}
          <FadeIn delay={0.1} className="flex w-full items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className={cn(rh.card, "p-7 sm:p-9")}>
                {/* Header */}
                <div className="mb-7 text-center">
                  <div className="mb-4 flex justify-center lg:hidden">
                    <Logo />
                  </div>
                  <div className={cn(rh.badge, "mb-3")}>
                    <Sparkles className="size-3" />
                    Sign in
                  </div>
                  <h1 className={cn(rh.h1, "text-3xl sm:text-4xl")}>Welcome back</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Continue with your OCR advisor session
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={rh.label}>
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        inputMode="email"
                        spellCheck={false}
                        maxLength={320}
                        className="h-12 rounded-xl border border-border bg-background pl-10 pr-3 text-base shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className={rh.label}>
                        Password
                      </Label>
                      <a
                        href="#"
                        className="text-xs font-semibold text-foreground hover:text-foreground/80"
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        maxLength={128}
                        className="h-12 rounded-xl border border-border bg-background pl-10 pr-11 text-base shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="group h-12 w-full gap-2 text-base font-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className={cn(rh.label, "bg-card px-3 normal-case tracking-normal")}>
                      New to Planet OCR?
                    </span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "group h-12 w-full gap-2 font-semibold"
                  )}
                >
                  <Sparkles className="size-4" />
                  Create Free Account
                </Link>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="#" className="font-semibold text-foreground/80 hover:text-foreground">
                  Terms of Service
                </a>{" "}
                &amp;{" "}
                <a href="#" className="font-semibold text-foreground/80 hover:text-foreground">
                  Privacy Policy
                </a>
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className={cn(rh.card, "w-full p-10")}>
      <div className="flex h-full flex-col justify-between gap-10">
        <div>
          <Logo />
        </div>

        <div className="space-y-7">
          <div>
            <div className={cn(rh.badge, "mb-4")}>
              <Sparkles className="size-3" />
              Pick the right tier, faster
            </div>
            <h2 className={cn(rh.h1, "text-4xl leading-tight")}>
              Document intelligence,
              <br />
              with proof.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              An AI advisor that recommends the perfect OCR tier — then lets you validate
              with a live demo on your own document.
            </p>
          </div>

          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3"
              >
                <div className={iconBox("sm")}>
                  <item.icon className="size-4" />
                </div>
                <span className="text-sm font-semibold text-foreground/85">
                  {item.label}
                </span>
                <CheckCircle2 className="ml-auto size-4 text-foreground" />
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className={cn(rh.card, "relative p-5")}>
            <Quote className="absolute -right-2 -top-2 size-16 text-muted/30" />
            <p className="relative text-sm italic leading-relaxed text-foreground/85">
              &ldquo;The advisor saved us weeks of model evaluation. We went from
              uncertainty to a production tier in a single afternoon.&rdquo;
            </p>
            <div className="relative mt-4 flex items-center gap-3">
              <div className={cn(iconBox("sm"), "rounded-full text-sm font-bold")}>
                AM
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Alex Morgan</div>
                <div className="text-xs text-muted-foreground">
                  Head of Ops · Northwind Logistics
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5" />
          Encrypted in transit · SOC-ready architecture
        </div>
      </div>
    </div>
  );
}
