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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setTokens } from "@/lib/api";
import { iconBox, rh } from "@/lib/remote-hub";
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
  { num: "1", label: "Create account" },
  { num: "2", label: "Chat with advisor" },
  { num: "3", label: "Run live demo" },
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
    0: { label: "Too short", color: "bg-muted-foreground/25" },
    1: { label: "Weak", color: "bg-muted-foreground/40" },
    2: { label: "Fair", color: "bg-muted-foreground/60" },
    3: { label: "Strong", color: "bg-foreground" },
    4: { label: "Excellent", color: "bg-primary" },
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
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pwMeter.score < 3) {
      toast.error(
        "Please use a stronger password (mix upper/lowercase, numbers and symbols)"
      );
      return;
    }
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

      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pb-12 sm:px-6 lg:items-center lg:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* LEFT: form */}
          <FadeIn className="order-2 flex w-full items-center justify-center lg:order-1">
            <div className="relative w-full max-w-md">
              <div className={cn(rh.card, "p-7 sm:p-9")}>
                {/* Header */}
                <div className="mb-6 text-center">
                  <div className="mb-4 flex justify-center lg:hidden">
                    <Logo />
                  </div>
                  <div className={cn(rh.badge, "mb-3")}>
                    <Sparkles className="size-3" />
                    Create account
                  </div>
                  <h1 className={cn(rh.h1, "text-3xl sm:text-4xl")}>Start your free trial</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    50 free pages · no credit card required
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={rh.label}>
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        placeholder="Alex Morgan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        maxLength={120}
                        className="h-12 rounded-xl border border-border bg-background pl-10 text-base shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className={rh.label}>
                      Work Email
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
                        className="h-12 rounded-xl border border-border bg-background pl-10 text-base shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className={rh.label}>
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        maxLength={128}
                        className="h-12 rounded-xl border border-border bg-background pl-10 pr-11 text-base shadow-sm"
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
                            "font-semibold",
                            pwMeter.score >= 3
                              ? "text-primary"
                              : pwMeter.score >= 1
                                ? "text-foreground"
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
                    className="group h-12 w-full gap-2 text-base font-bold"
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
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className={cn(rh.label, "bg-card px-3 normal-case tracking-normal")}>
                      Already have an account?
                    </span>
                  </div>
                </div>

                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "group h-12 w-full gap-2 font-semibold"
                  )}
                >
                  Sign In Instead
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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
          <FadeIn delay={0.1} className="order-1 hidden lg:order-2 lg:flex">
            <ValuePanel />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function ValuePanel() {
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
              What you get
            </div>
            <h2 className={cn(rh.h1, "text-4xl leading-tight")}>
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
          <div className={cn(rh.card, "p-4")}>
            <div className={cn(rh.label, "mb-3 normal-case tracking-normal")}>
              How onboarding works
            </div>
            <div className="flex items-center justify-between gap-2">
              {trustedSteps.map((step, idx) => (
                <div key={step.label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        iconBox("sm"),
                        "rounded-full text-sm font-extrabold"
                      )}
                    >
                      {step.num}
                    </div>
                    <div className="text-[10px] font-semibold text-foreground/80">
                      {step.label}
                    </div>
                  </div>
                  {idx < trustedSteps.length - 1 && (
                    <div className="mb-5 h-px flex-1 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {benefits.map((b) => (
              <li
                key={b.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4"
              >
                <div className={iconBox("md")}>
                  <b.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{b.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {b.desc}
                  </div>
                </div>
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-foreground" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5" />
          Encrypted in transit · No credit card required
        </div>
      </div>
    </div>
  );
}
