"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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
  Shield,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Sparkles,
    title: "AI-powered tier match",
    desc: "Get a personalised recommendation based on your real documents and volume.",
  },
  {
    icon: Zap,
    title: "Live OCR demo",
    desc: "Validate the recommendation by running OCR on your own sample document.",
  },
  {
    icon: Shield,
    title: "SOC-ready & secure",
    desc: "Encrypted in transit, isolated workloads, Stripe-secured billing.",
  },
];

const trustedSteps = [
  { num: "1", label: "Create account", accent: "indigo" as const },
  { num: "2", label: "Chat with advisor", accent: "fuchsia" as const },
  { num: "3", label: "Run live demo", accent: "amber" as const },
];

function passwordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (!pw) return { score: 0, label: "Enter a password", color: "bg-muted" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: "bg-rose-500" },
    1: { label: "Weak", color: "bg-rose-500" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Strong", color: "bg-emerald-500" },
    4: { label: "Excellent", color: "bg-emerald-500" },
  };
  return { score: s, ...map[s] };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const pwMeter = useMemo(() => passwordStrength(password), [password]);

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

      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pb-12 sm:px-6 lg:items-center lg:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* LEFT: form */}
          <FadeIn className="flex w-full items-center justify-center order-2 lg:order-1">
            <div className="relative w-full max-w-md">
              {/* glow */}
              <div className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/15 to-amber-500/20 opacity-70 blur-xl" />
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-7 shadow-2xl backdrop-blur sm:p-9">
                {/* Header */}
                <div className="mb-6 text-center">
                  <div className="mb-4 flex justify-center lg:hidden">
                    <Logo />
                  </div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                    <Sparkles className="size-3" />
                    Create account
                  </div>
                  <h1 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-4xl">
                    Start your free trial
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    50 free pages · no credit card required
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Alex Morgan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 rounded-xl border-2 border-border/60 bg-background pl-10 text-base shadow-sm transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Work Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-2 border-border/60 bg-background pl-10 text-base shadow-sm transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-2 border-border/60 bg-background pl-10 pr-11 text-base shadow-sm transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
                        minLength={8}
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
                    {/* Strength meter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              i <= pwMeter.score ? pwMeter.color : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Use 8+ chars · mix letters, numbers &amp; symbols
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            pwMeter.score >= 3
                              ? "text-emerald-600 dark:text-emerald-400"
                              : pwMeter.score === 2
                                ? "text-amber-600 dark:text-amber-400"
                                : pwMeter.score >= 1
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                          )}
                        >
                          {pwMeter.label}
                        </span>
                      </div>
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
                        Creating Account…
                      </>
                    ) : (
                      <>
                        Get Started Free
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
                      Already have an account?
                    </span>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border/70 bg-muted/40 font-semibold text-foreground backdrop-blur transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:scale-[1.01]"
                >
                  Sign In Instead
                  <ArrowRight className="size-4 text-indigo-500 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
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

          {/* RIGHT: value panel */}
          <FadeIn delay={0.1} className="hidden lg:flex order-1 lg:order-2">
            <ValuePanel />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function ValuePanel() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-amber-500/15 p-10 shadow-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full bg-amber-500/20 blur-3xl" />

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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-background/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-700 backdrop-blur dark:text-fuchsia-300">
              <Sparkles className="size-3" />
              What you get
            </div>
            <h2 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300">
              Find your perfect
              <br />
              OCR tier in minutes.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Stop comparing model spec sheets. Tell us about your documents and our
              advisor matches you to the right tier — with proof.
            </p>
          </div>

          {/* Step progress */}
          <div className="rounded-2xl border border-border/50 bg-background/60 p-4 backdrop-blur">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              How onboarding works
            </div>
            <div className="flex items-center justify-between gap-2">
              {trustedSteps.map((step, idx) => {
                const accentMap: Record<
                  "indigo" | "fuchsia" | "amber",
                  string
                > = {
                  indigo: "from-indigo-500 to-violet-500 shadow-indigo-500/30",
                  fuchsia:
                    "from-fuchsia-500 via-rose-500 to-amber-500 shadow-fuchsia-500/30",
                  amber: "from-amber-500 to-orange-500 shadow-amber-500/30",
                };
                return (
                  <div
                    key={step.label}
                    className="flex flex-1 items-center gap-2"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-lg",
                          accentMap[step.accent]
                        )}
                      >
                        {step.num}
                      </div>
                      <div className="text-[10px] font-semibold text-foreground/80">
                        {step.label}
                      </div>
                    </div>
                    {idx < trustedSteps.length - 1 && (
                      <div className="mb-5 h-px flex-1 bg-gradient-to-r from-border via-border/40 to-border" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="space-y-3">
            {benefits.map((b) => (
              <li
                key={b.title}
                className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4 backdrop-blur"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/30">
                  <b.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{b.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {b.desc}
                  </div>
                </div>
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5 text-emerald-500" />
          Encrypted in transit · No credit card required
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
