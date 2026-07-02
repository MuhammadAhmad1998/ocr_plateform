"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, setTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "Enter a password", color: "rgb(var(--border-strong))" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short",  color: "rgb(var(--coral))" },
    1: { label: "Weak",       color: "rgb(var(--coral))" },
    2: { label: "Fair",       color: "rgb(var(--amber))" },
    3: { label: "Strong",     color: "rgb(var(--green))" },
    4: { label: "Excellent",  color: "rgb(var(--green))" },
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
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwMeter.score < 3) { toast.error("Please use a stronger password (mix upper/lowercase, numbers and symbols)"); return; }
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
    <div className="relative flex min-h-screen" style={{ background: "rgb(var(--base))" }}>
      {/* Left form panel */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "0.5px solid rgb(var(--border))" }}>
          <Link href="/" className="flex items-center gap-1.5 text-sm transition-colors hover:text-[rgb(var(--text-1))]" style={{ color: "rgb(var(--text-2))" }}>
            <ArrowLeft className="size-3.5" /> Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[360px]">
            <div className="mb-7 flex justify-center lg:hidden"><Logo /></div>

            <div className="mb-7">
              <div className="font-mono text-[11px] uppercase tracking-[1px] mb-2" style={{ color: "rgb(var(--teal))" }}>
                Create account
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
                Start your free trial
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                50 free pages · no credit card required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Full name</label>
                <input
                  id="name" type="text" autoComplete="name" maxLength={120}
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}
                  placeholder="Alex Morgan"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Work email</label>
                <input
                  id="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} maxLength={320} required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}
                  placeholder="you@company.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>Password</label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={128} minLength={8} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none transition-all"
                    style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}
                    placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgb(var(--text-3))" }}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {/* Strength meter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= pwMeter.score ? pwMeter.color : "rgb(var(--surface-2))" }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "rgb(var(--text-3))" }}>8+ chars · mix letters, numbers &amp; symbols</span>
                    <span className="font-medium" style={{ color: pwMeter.color }}>{pwMeter.label}</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Creating Account…</>
                ) : (
                  <>Get Started Free <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "0.5px solid rgb(var(--border))" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] uppercase tracking-wider" style={{ background: "rgb(var(--base))", color: "rgb(var(--text-3))" }}>
                  Already have an account?
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-[rgb(var(--surface-2))]"
              style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}
            >
              Sign In Instead <ArrowRight className="size-4" style={{ color: "rgb(var(--teal))" }} />
            </Link>

            <p className="mt-6 text-center text-xs" style={{ color: "rgb(var(--text-3))" }}>
              By creating an account, you agree to our{" "}
              <a href="#" className="hover:underline" style={{ color: "rgb(var(--text-2))" }}>Terms</a>{" "}
              &amp;{" "}
              <a href="#" className="hover:underline" style={{ color: "rgb(var(--text-2))" }}>Privacy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right value panel */}
      <div
        className="dotgrid hidden w-[48%] flex-col justify-between p-10 lg:flex"
        style={{ borderLeft: "0.5px solid rgb(var(--border))" }}
      >
        <Logo size="default" />

        <div className="max-w-md">
          <span className="eyebrow mb-5 inline-flex">◆ How onboarding works</span>
          <div className="mb-7 flex items-center gap-4">
            {[
              { num: "1", label: "Create account" },
              { num: "2", label: "Chat with advisor" },
              { num: "3", label: "Run live demo" },
            ].map((step, idx) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="flex size-8 items-center justify-center rounded-full font-mono text-sm font-bold"
                    style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
                  >
                    {step.num}
                  </span>
                  <span className="text-[11px] text-center" style={{ color: "rgb(var(--text-2))" }}>{step.label}</span>
                </div>
                {idx < 2 && <div className="mx-3 mb-5 h-px w-8" style={{ background: "rgb(var(--border))" }} />}
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-[36px] font-bold leading-tight tracking-[-0.8px]" style={{ color: "rgb(var(--text-1))" }}>
            Find your perfect<br />OCR tier in minutes.
          </h2>
          <p className="leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
            Stop comparing model spec sheets. Tell us about your documents and our advisor matches you to the right tier — with proof.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              "AI-powered tier match based on your actual documents",
              "Live OCR demo validates the recommendation",
              "SOC-ready & encrypted in transit",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]"
                  style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-[11px]" style={{ color: "rgb(var(--text-3))" }}>
          © {new Date().getFullYear()} Planet OCR · No credit card required
        </p>
      </div>
    </div>
  );
}
