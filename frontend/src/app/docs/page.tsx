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
import { AppSidebar } from "@/components/AppSidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { rh, iconBox } from "@/lib/remote-hub";
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
    text: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  POST: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  PATCH: {
    text: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  PUT: {
    text: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  DELETE: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
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
      className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(label);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
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
    <div className="overflow-hidden rounded-xl border border-border bg-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-foreground px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/60" />
          <span className="size-2.5 rounded-full bg-primary" />
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          {language && (
            <>
              <Terminal className="size-3" />
              <span>{language}</span>
              {title && <span className="text-muted-foreground">·</span>}
            </>
          )}
          {title}
        </span>
        <CopyButton text={code} label="Code copied" />
      </div>
      <pre className="overflow-x-auto bg-foreground p-4 font-mono text-[13px] leading-relaxed text-primary-foreground">
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
      <div className="border-b border-border/60 bg-card px-6 py-5">
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
            <span className="rounded-full bg-card">
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
          ? "bg-card"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all",
            active
              ? "bg-card"
              : "bg-muted text-muted-foreground group-hover:bg-background"
          )}
        >
          <Icon className="size-3" />
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {active && <ChevronRight className="size-3.5 text-primary" />}
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
    <div className="relative min-h-screen overflow-hidden bg-background lg:pl-72">
      <AppSidebar />

      {/* ============= SUB-HEADER ============= */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/80 lg:top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 lg:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex size-6 items-center justify-center rounded-lg bg-card">
              <Code2 className="size-3" />
            </span>
            <span className="font-bold text-foreground">Planet OCR API</span>
            <span className="rounded-full bg-card">
              v2
            </span>
            {operational !== null && (
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                <span className="relative flex size-2">
                  {operational && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-60" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex size-2 rounded-full",
                      operational ? "bg-primary" : "bg-muted-foreground"
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
            <nav className="sticky top-32 space-y-6 lg:top-14">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm ">
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
              <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm ">
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
              <div className={cn(rh.card, "p-4")}>
                <div>
                  <Key className="size-4 text-primary" />
                  <p className="mt-2 text-sm font-bold text-foreground">Ready to build?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate an API key in your dashboard to start integrating.
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
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
              <div className={cn(rh.card, "p-8")}>
                <div className="space-y-5">
                  <div className={rh.badge}>
                    <BookOpen className="size-3.5" />
                    API Documentation
                  </div>
                  <h1 className={cn(rh.h1, "text-4xl sm:text-5xl")}>
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
                    />
                    <InfoTile
                      label="Recommended version"
                      value="/api/v2"
                      icon={<Sparkles className="size-4" />}
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
              />

              <ol className="space-y-5">
                {QUICKSTART_STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-px hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-primary-foreground">
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
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
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
                      className="font-semibold text-primary hover:underline"
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

                <div className={cn(rh.card, "p-5")}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-card">
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
              />

              <div className="space-y-5">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-2 rounded-full bg-primary" />
                    Success envelope (v2)
                  </p>
                  <CodeBlock code={ENVELOPE_EXAMPLE} language="json" />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-2 rounded-full bg-destructive" />
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
              />

              <div className="space-y-12">
                {PUBLIC_DOC_SECTIONS.map((section) => {
                  const endpoints = endpointsBySection.get(section.id) ?? [];
                  if (!endpoints.length) return null;
                  const Icon = REFERENCE_ICONS[section.id] ?? Code2;
                  return (
                    <div key={section.id} id={`ref-${section.id}`} className="scroll-mt-32">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
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
            <footer className="overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-5">
              <div className="flex items-start gap-4">
                <div className={iconBox("md")}>
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground">Need help?</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <Link
                      href="/dashboard"
                      className="font-semibold text-foreground hover:underline"
                    >
                      Manage keys &amp; usage
                    </Link>
                    {"  ·  "}
                    <a
                      href={`${API_ROOT}/redoc`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      Full OpenAPI reference
                    </a>
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Internal, sandbox, and engine-specific routes are not part of the public API.
                  </p>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ============= COMPONENTS ============= */

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn(rh.cardHover, "flex items-center gap-3 p-4")}>
      <div className={iconBox("sm")}>{icon}</div>
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
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center gap-3">
        <div className={iconBox("sm")}>
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
