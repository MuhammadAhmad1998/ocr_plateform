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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/advisor";
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
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
              {/* glow */}
              <div className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/15 to-amber-500/20 opacity-70 blur-xl" />
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-7 shadow-2xl backdrop-blur sm:p-9">
                {/* Header */}
                <div className="mb-7 text-center">
                  <div className="mb-4 flex justify-center lg:hidden">
                    <Logo />
                  </div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="size-3" />
                    Sign in
                  </div>
                  <h1 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-4xl">
                    Welcome back
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Continue with your OCR advisor session
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-2 border-border/60 bg-background pl-10 pr-3 text-base shadow-sm transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                      >
                        Password
                      </Label>
                      <a
                        href="#"
                        className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 dark:text-fuchsia-400 dark:hover:text-fuchsia-300"
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-2 border-border/60 bg-background pl-10 pr-11 text-base shadow-sm transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
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
                    className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 text-base font-bold text-white shadow-xl shadow-fuchsia-500/30 transition-all hover:scale-[1.01] hover:shadow-2xl disabled:opacity-70"
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
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      New to Planet OCR?
                    </span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border/70 bg-muted/40 font-semibold text-foreground backdrop-blur transition-all hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 hover:scale-[1.01]"
                >
                  <Sparkles className="size-4 text-fuchsia-500 transition-transform group-hover:rotate-12" />
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
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-amber-500/15 p-10 shadow-2xl">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full bg-indigo-500/30 blur-3xl" />

      {/* Faint grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative flex h-full flex-col justify-between gap-10">
        <div>
          <Logo />
        </div>

        <div className="space-y-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-background/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 backdrop-blur dark:text-indigo-300">
              <Sparkles className="size-3" />
              Pick the right tier, faster
            </div>
            <h2 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300">
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
                className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3 backdrop-blur"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/30">
                  <item.icon className="size-4" />
                </div>
                <span className="text-sm font-semibold text-foreground/85">
                  {item.label}
                </span>
                <CheckCircle2 className="ml-auto size-4 text-emerald-500" />
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-5 shadow-md backdrop-blur">
            <Quote className="absolute -right-2 -top-2 size-16 text-fuchsia-500/10" />
            <p className="relative text-sm italic leading-relaxed text-foreground/85">
              &ldquo;The advisor saved us weeks of model evaluation. We went from
              uncertainty to a production tier in a single afternoon.&rdquo;
            </p>
            <div className="relative mt-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
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
          <Shield className="size-3.5 text-emerald-500" />
          Encrypted in transit · SOC-ready architecture
        </div>
      </div>
    </div>
  );
}

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 top-0 size-[28rem] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="absolute right-0 top-1/4 size-[26rem] rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/15" />
      <div className="absolute -bottom-24 left-1/3 size-[28rem] rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/15" />
    </div>
  );
}
