"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
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

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-sky-600 dark:text-sky-400",
  PATCH: "text-amber-600 dark:text-amber-400",
  PUT: "text-violet-600 dark:text-violet-400",
  DELETE: "text-red-600 dark:text-red-400",
};

function CopyButton({ text, label = "Copied" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(label);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <CopyButton text={code} label="Code copied" />
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const curl = publicCurlExample(endpoint);
  return (
    <article
      id={endpoint.id}
      className="scroll-mt-28 border-b border-border py-8 last:border-b-0"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className={cn("font-mono text-sm font-bold", METHOD_COLORS[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
        <Badge variant="outline" className="text-[11px] font-normal">
          {publicAuthLabel(endpoint.auth)}
        </Badge>
        {endpoint.version === "v2" && (
          <Badge className="bg-primary/10 text-[11px] text-primary hover:bg-primary/10">v2</Badge>
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{endpoint.summary}</h3>
      {endpoint.description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {endpoint.description}
        </p>
      )}
      <div className="mt-4">
        <CodeBlock code={curl} title="Example request" />
      </div>
    </article>
  );
}

function SidebarLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </a>
  );
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState<PublicDocNavId>("introduction");
  const [operational, setOperational] = useState<boolean | null>(null);

  useEffect(() => {
    api.getStatus().then((s) => setOperational(!Object.values(s.degraded).some(Boolean))).catch(() => setOperational(null));
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
    <div className="min-h-screen bg-background">
      <Navbar variant="marketing" />

      {/* Docs sub-header */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">Planet OCR API</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs text-muted-foreground">v2</span>
            {operational !== null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      operational ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  {operational ? "All systems operational" : "Degraded"}
                </span>
              </>
            )}
          </div>
          <a
            href={`${API_ROOT}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs")}
          >
            OpenAPI spec
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="flex gap-12 py-10">
          {/* Sidebar */}
          <aside className="hidden w-48 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-6">
              <div>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Guides
                </p>
                <div className="space-y-0.5">
                  {PUBLIC_DOC_NAV.filter((n) => n.id !== "reference").map((item) => (
                    <SidebarLink
                      key={item.id}
                      href={`#${item.id}`}
                      label={item.label}
                      active={activeSection === item.id}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Resources
                </p>
                <div className="space-y-0.5">
                  {PUBLIC_DOC_SECTIONS.map((s) => (
                    <SidebarLink key={s.id} href={`#ref-${s.id}`} label={s.label} />
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <Link
                  href="/dashboard"
                  className="block px-3 text-sm font-medium text-primary hover:underline"
                >
                  Get API keys →
                </Link>
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 max-w-3xl">
            {/* Introduction */}
            <section id="introduction" className="scroll-mt-28 pb-12">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Planet OCR API
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Extract text and structure from documents with a simple REST API. Upload a file,
                submit an OCR job, and poll for results — authenticated with API keys.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Base URL
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{API_ROOT}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Recommended version
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">/api/v2</p>
                </div>
              </div>
            </section>

            {/* Quickstart */}
            <section id="quickstart" className="scroll-mt-28 border-t border-border py-12">
              <h2 className="text-2xl font-bold text-foreground">Quickstart</h2>
              <p className="mt-2 text-muted-foreground">
                Four steps from zero to extracted text.
              </p>
              <ol className="mt-8 space-y-10">
                {QUICKSTART_STEPS.map((step, i) => (
                  <li key={step.title} className="relative pl-10">
                    <span className="absolute left-0 flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    {"href" in step && step.href && (
                      <Link
                        href={step.href}
                        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        {step.hrefLabel}
                      </Link>
                    )}
                    {"code" in step && step.code && (
                      <div className="mt-3">
                        <CodeBlock code={step.code} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* Authentication */}
            <section id="authentication" className="scroll-mt-28 border-t border-border py-12">
              <h2 className="text-2xl font-bold text-foreground">Authentication</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                All production endpoints use <strong className="text-foreground">API keys</strong>.
                Pass your key via the <code className="text-sm">x-api-key</code> header or as a Bearer
                token. Create and revoke keys in the{" "}
                <Link href="/dashboard" className="text-primary hover:underline">
                  Dashboard
                </Link>
                .
              </p>
              <div className="mt-6">
                <CodeBlock
                  title="Header"
                  code={`x-api-key: ocr_your_secret_key\n\n# or\nAuthorization: Bearer ocr_your_secret_key`}
                />
              </div>
              <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Key scopes</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <code className="text-xs">ocr:write</code> — submit jobs and upload documents
                  </li>
                  <li>
                    <code className="text-xs">ocr:read</code> — retrieve job status and results
                  </li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Dashboard account endpoints (usage, key management) require a JWT from sign-in.
                </p>
              </div>
            </section>

            {/* Responses */}
            <section id="responses" className="scroll-mt-28 border-t border-border py-12">
              <h2 className="text-2xl font-bold text-foreground">Responses</h2>
              <p className="mt-2 text-muted-foreground">
                v2 returns a consistent envelope on every successful response. Errors include a
                machine-readable <code className="text-sm">error</code> code and{" "}
                <code className="text-sm">request_id</code> for support.
              </p>
              <div className="mt-6 space-y-4">
                <CodeBlock code={ENVELOPE_EXAMPLE} title="Success envelope (v2)" />
                <CodeBlock code={ERROR_EXAMPLE} title="Error response" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Resource ids use prefixes: <code className="text-xs">doc_</code> for documents,{" "}
                <code className="text-xs">job_</code> for OCR jobs.
              </p>
            </section>

            {/* API Reference */}
            <section id="reference" className="scroll-mt-28 border-t border-border py-12">
              <h2 className="text-2xl font-bold text-foreground">API Reference</h2>
              <p className="mt-2 text-muted-foreground">
                {PUBLIC_API_ENDPOINTS.length} endpoints for production integrations.
              </p>

              {PUBLIC_DOC_SECTIONS.map((section) => {
                const endpoints = endpointsBySection.get(section.id) ?? [];
                if (!endpoints.length) return null;
                return (
                  <div key={section.id} id={`ref-${section.id}`} className="scroll-mt-28 mt-12">
                    <h3 className="text-xl font-bold text-foreground">{section.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                    <div className="mt-2">
                      {endpoints.map((ep) => (
                        <EndpointCard key={ep.id} endpoint={ep} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
              <p>
                Need help?{" "}
                <Link href="/dashboard" className="text-primary hover:underline">
                  Manage keys &amp; usage
                </Link>
                {" · "}
                <a
                  href={`${API_ROOT}/redoc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Full OpenAPI reference
                </a>
              </p>
              <p className="mt-2 text-xs">
                Internal, sandbox, and engine-specific routes are not part of the public API.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
