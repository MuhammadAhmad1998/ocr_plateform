"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  Key,
  Layers,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  API_ROOT,
  ENVELOPE_EXAMPLE,
  ERROR_EXAMPLE,
  PUBLIC_API_ENDPOINTS,
  PUBLIC_DOC_NAV,
  PUBLIC_DOC_SECTIONS,
  publicCurlExample,
  publicAuthLabel,
  QUICKSTART_STEPS,
  type PublicDocNavId,
} from "@/lib/api/public-catalog";
import type { ApiEndpoint, HttpMethod } from "@/lib/api/catalog";

const METHOD_STYLES: Record<
  HttpMethod,
  { text: string; bg: string; border: string }
> = {
  GET: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
  },
  POST: {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
  },
  PATCH: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  PUT: {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
  },
  DELETE: {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
  },
};

const SECTION_ICONS: Record<string, LucideIcon> = {
  introduction: BookOpen,
  quickstart: Rocket,
  authentication: ShieldCheck,
  responses: Layers,
  reference: Code2,
};

const REFERENCE_ICONS: Record<string, LucideIcon> = {
  models: Sparkles,
  documents: FileCode,
  jobs: Zap,
  account: Key,
  status: ShieldCheck,
};

function CopyButton({ text, label = "Copied" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(label);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function CodeBlock({
  code,
  title,
  language,
}: {
  code: string;
  title?: string;
  language?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
          {language && (
            <>
              <Terminal className="size-3" />
              <span>{language}</span>
              {title && <span className="text-slate-600">·</span>}
            </>
          )}
          {title}
        </span>
        <CopyButton text={code} label="Code copied" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-emerald-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const curl = publicCurlExample(endpoint);
  const method = METHOD_STYLES[endpoint.method];
  return (
    <article
      id={endpoint.id}
      className="group scroll-mt-32 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
    >
      <div className="border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-extrabold tracking-wider",
              method.text,
              method.bg,
              method.border
            )}
          >
            {endpoint.method}
          </span>
          <code className="break-all font-mono text-sm font-semibold text-foreground">
            {endpoint.path}
          </code>
          <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {publicAuthLabel(endpoint.auth)}
          </span>
          {endpoint.version === "v2" && (
            <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-md shadow-fuchsia-500/30">
              v2
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-bold text-foreground">{endpoint.summary}</h3>
        {endpoint.description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {endpoint.description}
          </p>
        )}
      </div>
      <div className="p-5">
        <CodeBlock code={curl} title="Example request" language="bash" />
      </div>
    </article>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all",
        active
          ? "bg-gradient-to-r from-indigo-500/15 to-fuchsia-500/15 font-semibold text-foreground shadow-sm ring-1 ring-indigo-500/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all",
            active
              ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm"
              : "bg-muted text-muted-foreground group-hover:bg-background"
          )}
        >
          <Icon className="size-3" />
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {active && <ChevronRight className="size-3.5 text-indigo-500" />}
    </a>
  );
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState<PublicDocNavId>("introduction");
  const [operational, setOperational] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .getStatus()
      .then((s) => setOperational(!Object.values(s.degraded).some(Boolean)))
      .catch(() => setOperational(null));
  }, []);

  useEffect(() => {
    const ids = PUBLIC_DOC_NAV.map((n) => n.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && ids.includes(entry.target.id as PublicDocNavId)) {
            setActiveSection(entry.target.id as PublicDocNavId);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const endpointsBySection = useMemo(() => {
    const map = new Map<string, ApiEndpoint[]>();
    for (const section of PUBLIC_DOC_SECTIONS) {
      map.set(
        section.id,
        PUBLIC_API_ENDPOINTS.filter((ep) => section.tags.includes(ep.tag))
      );
    }
    return map;
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />
      <Navbar variant="marketing" />

      {/* ============= SUB-HEADER ============= */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-18">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 lg:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30">
              <Code2 className="size-3" />
            </span>
            <span className="font-bold text-foreground">Planet OCR API</span>
            <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-white shadow-sm shadow-fuchsia-500/30">
              v2
            </span>
            {operational !== null && (
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                <span className="relative flex size-2">
                  {operational && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex size-2 rounded-full",
                      operational ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                </span>
                {operational ? "All systems operational" : "Degraded"}
              </span>
            )}
          </div>
          <a
            href={`${API_ROOT}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 rounded-full text-xs"
            )}
          >
            OpenAPI spec
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex gap-10 py-10">
          {/* ============= SIDEBAR ============= */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="sticky top-32 space-y-6">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
                <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Guides
                </p>
                <div className="space-y-1">
                  {PUBLIC_DOC_NAV.filter((n) => n.id !== "reference").map((item) => (
                    <SidebarLink
                      key={item.id}
                      href={`#${item.id}`}
                      label={item.label}
                      icon={SECTION_ICONS[item.id]}
                      active={activeSection === item.id}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
                <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Reference
                </p>
                <div className="space-y-1">
                  {PUBLIC_DOC_SECTIONS.map((s) => (
                    <SidebarLink
                      key={s.id}
                      href={`#ref-${s.id}`}
                      label={s.label}
                      icon={REFERENCE_ICONS[s.id]}
                    />
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-cyan-500/8 to-emerald-500/5 p-4 shadow-md">
                <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-400/30 blur-2xl" />
                <div className="relative">
                  <Key className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="mt-2 text-sm font-bold text-foreground">Ready to build?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate an API key in your dashboard to start integrating.
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    Get API keys <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </nav>
          </aside>

          {/* ============= MAIN ============= */}
          <main className="min-w-0 flex-1 max-w-3xl space-y-16">
            {/* ============= HERO / INTRODUCTION ============= */}
            <section id="introduction" className="scroll-mt-32">
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-emerald-500/10 p-6 shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="relative space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
                    <BookOpen className="size-3.5 text-indigo-500" />
                    API Documentation
                  </div>
                  <h1 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-emerald-500 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-emerald-300 sm:text-5xl">
                    Planet OCR API
                  </h1>
                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Extract text and structure from documents with a simple REST API. Upload a
                    file, submit an OCR job, and poll for results — authenticated with API keys.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile
                      label="Base URL"
                      value={API_ROOT}
                      icon={<Terminal className="size-4" />}
                      accent="indigo"
                    />
                    <InfoTile
                      label="Recommended version"
                      value="/api/v2"
                      icon={<Sparkles className="size-4" />}
                      accent="fuchsia"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ============= QUICKSTART ============= */}
            <section id="quickstart" className="scroll-mt-32">
              <SectionHeader
                icon={Rocket}
                eyebrow="Quickstart"
                title="Four steps to extracted text"
                description="From zero to a parsed document with copy-paste curl commands."
                accent="amber"
              />

              <ol className="space-y-5">
                {QUICKSTART_STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-px hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-lg transition-transform group-hover:scale-110",
                          i === 0 && "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
                          i === 1 && "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
                          i === 2 && "bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-fuchsia-500/30",
                          i === 3 && "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {step.body}
                        </p>
                        {"href" in step && step.href && (
                          <Link
                            href={step.href}
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-600 hover:underline dark:text-fuchsia-300"
                          >
                            {step.hrefLabel}
                            <ArrowRight className="size-3.5" />
                          </Link>
                        )}
                        {"code" in step && step.code && (
                          <div className="mt-4">
                            <CodeBlock code={step.code} language="bash" />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* ============= AUTHENTICATION ============= */}
            <section id="authentication" className="scroll-mt-32">
              <SectionHeader
                icon={ShieldCheck}
                eyebrow="Authentication"
                title="API keys & JWT tokens"
                description="Secure every request with an API key or Bearer token."
                accent="emerald"
              />

              <div className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    All production endpoints use{" "}
                    <strong className="font-bold text-foreground">API keys</strong>. Pass your key
                    via the <CodeChip>x-api-key</CodeChip> header or as a Bearer token. Create and
                    revoke keys in the{" "}
                    <Link
                      href="/dashboard"
                      className="font-semibold text-emerald-600 hover:underline dark:text-emerald-300"
                    >
                      Dashboard
                    </Link>
                    .
                  </p>
                </div>

                <CodeBlock
                  language="http"
                  title="Header"
                  code={`x-api-key: ocr_your_secret_key\n\n# or\nAuthorization: Bearer ocr_your_secret_key`}
                />

                <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-cyan-500/5 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
                      <Key className="size-3.5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Key scopes</p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2.5">
                      <CodeChip className="shrink-0">ocr:write</CodeChip>
                      <span className="text-muted-foreground">
                        submit jobs and upload documents
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CodeChip className="shrink-0">ocr:read</CodeChip>
                      <span className="text-muted-foreground">
                        retrieve job status and results
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Dashboard account endpoints (usage, key management) require a JWT from sign-in.
                  </p>
                </div>
              </div>
            </section>

            {/* ============= RESPONSES ============= */}
            <section id="responses" className="scroll-mt-32">
              <SectionHeader
                icon={Layers}
                eyebrow="Responses"
                title="Consistent envelopes, structured errors"
                description="Every v2 response wraps its payload in the same shape, with a request id."
                accent="cyan"
              />

              <div className="space-y-5">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Success envelope (v2)
                  </p>
                  <CodeBlock code={ENVELOPE_EXAMPLE} language="json" />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    <span className="size-2 rounded-full bg-rose-500" />
                    Error response
                  </p>
                  <CodeBlock code={ERROR_EXAMPLE} language="json" />
                </div>
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Resource ids use prefixes: <CodeChip>doc_</CodeChip> for documents,{" "}
                  <CodeChip>job_</CodeChip> for OCR jobs.
                </p>
              </div>
            </section>

            {/* ============= API REFERENCE ============= */}
            <section id="reference" className="scroll-mt-32">
              <SectionHeader
                icon={Code2}
                eyebrow="API Reference"
                title="Endpoints"
                description={`${PUBLIC_API_ENDPOINTS.length} endpoints for production integrations.`}
                accent="fuchsia"
              />

              <div className="space-y-12">
                {PUBLIC_DOC_SECTIONS.map((section) => {
                  const endpoints = endpointsBySection.get(section.id) ?? [];
                  if (!endpoints.length) return null;
                  const Icon = REFERENCE_ICONS[section.id] ?? Code2;
                  return (
                    <div key={section.id} id={`ref-${section.id}`} className="scroll-mt-32">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-md shadow-fuchsia-500/30">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{section.label}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {endpoints.map((ep) => (
                          <EndpointCard key={ep.id} endpoint={ep} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ============= FOOTER ============= */}
            <footer className="rounded-3xl border border-border/60 bg-gradient-to-br from-muted/30 to-transparent p-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-lg shadow-fuchsia-500/30">
                <Sparkles className="size-5" />
              </div>
              <p className="text-base font-bold text-foreground">Need help?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <Link
                  href="/dashboard"
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  Manage keys &amp; usage
                </Link>
                {"  ·  "}
                <a
                  href={`${API_ROOT}/redoc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-fuchsia-600 hover:underline dark:text-fuchsia-300"
                >
                  Full OpenAPI reference
                </a>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Internal, sandbox, and engine-specific routes are not part of the public API.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ============= COMPONENTS ============= */

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-20 size-96 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/12" />
      <div className="absolute right-0 top-1/3 size-96 rounded-full bg-fuchsia-500/8 blur-3xl dark:bg-fuchsia-500/12" />
      <div className="absolute -bottom-20 left-1/3 size-96 rounded-full bg-emerald-500/8 blur-3xl dark:bg-emerald-500/12" />
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "indigo" | "fuchsia";
}) {
  const palette = {
    indigo: {
      gradient: "from-indigo-500/15 to-violet-500/5",
      border: "border-indigo-500/30",
      iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
    },
    fuchsia: {
      gradient: "from-fuchsia-500/15 to-rose-500/5",
      border: "border-fuchsia-500/30",
      iconBg: "bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-fuchsia-500/30",
    },
  } as const;
  const c = palette[accent];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-sm",
        c.gradient,
        c.border
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
          c.iconBg
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-mono text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent: "amber" | "emerald" | "cyan" | "fuchsia";
}) {
  const palette = {
    amber: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
    emerald: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
    cyan: "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
    fuchsia: "bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-fuchsia-500/30",
  } as const;
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-xl text-white shadow-md",
            palette[accent]
          )}
        >
          <Icon className="size-4" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CodeChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "inline-block rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground",
        className
      )}
    >
      {children}
    </code>
  );
}
