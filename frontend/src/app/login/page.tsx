"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, setTokens } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

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
        router.push(next.startsWith("/") && !next.startsWith("/admin") ? next : "/advisor");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen" style={{ background: "rgb(var(--base))" }}>
      {/* Left panel — brand/value */}
      <div
        className="dotgrid hidden w-[52%] flex-col justify-between p-10 lg:flex"
        style={{ borderRight: "0.5px solid rgb(var(--border))" }}
      >
        <Logo size="default" />

        <div className="max-w-md">
          <span className="eyebrow mb-6 inline-flex">◆ The OCR intelligence layer</span>
          <h2
            className="mb-4 text-[40px] font-bold leading-tight tracking-[-1px]"
            style={{ color: "rgb(var(--text-1))" }}
          >
            Every OCR engine.{" "}
            <span style={{ color: "rgb(var(--teal))" }}>One intelligent answer.</span>
          </h2>
          <p className="mb-8 text-lg leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
            Upload a document and our agent benchmarks every engine on your actual data,
            then routes to the winner.
          </p>
          <ul className="space-y-3">
            {[
              "Benchmarks on your data, not leaderboards",
              "Automatic routing — cheap engines when possible",
              "Never breaks on policy refusals",
            ].map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]"
                  style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
                >
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-[11px]" style={{ color: "rgb(var(--text-3))" }}>
          © {new Date().getFullYear()} Planet OCR · Encrypted in transit
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "0.5px solid rgb(var(--border))" }}>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[rgb(var(--text-1))]"
            style={{ color: "rgb(var(--text-2))" }}
          >
            <ArrowLeft className="size-3.5" /> Back to home
          </Link>
          <ThemeToggle />
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[360px]">
            {/* Mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo />
            </div>

            <div className="mb-7">
              <div className="font-mono text-[11px] uppercase tracking-[1px] mb-2" style={{ color: "rgb(var(--teal))" }}>
                Sign in
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
                Welcome back
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                Continue with your OCR advisor session
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                  maxLength={320}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{
                    background: "rgb(var(--surface-1))",
                    border: "0.5px solid rgb(var(--border-strong))",
                    color: "rgb(var(--text-1))",
                  }}
                  placeholder="you@company.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-2))" }}>
                    Password
                  </label>
                  <a href="#" className="text-xs hover:underline" style={{ color: "rgb(var(--teal))" }}>
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none transition-all"
                    style={{
                      background: "rgb(var(--surface-1))",
                      border: "0.5px solid rgb(var(--border-strong))",
                      color: "rgb(var(--text-1))",
                    }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgb(var(--text-3))" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
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
                  <><Loader2 className="size-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "0.5px solid rgb(var(--border))" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] uppercase tracking-wider" style={{ background: "rgb(var(--base))", color: "rgb(var(--text-3))" }}>
                  New to Planet OCR?
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-[rgb(var(--surface-2))]"
              style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}
            >
              Create Free Account
            </Link>

            <p className="mt-6 text-center text-xs" style={{ color: "rgb(var(--text-3))" }}>
              By signing in, you agree to our{" "}
              <a href="#" className="hover:underline" style={{ color: "rgb(var(--text-2))" }}>Terms</a>{" "}
              &amp;{" "}
              <a href="#" className="hover:underline" style={{ color: "rgb(var(--text-2))" }}>Privacy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
