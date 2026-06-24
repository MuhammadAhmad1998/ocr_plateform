"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search, Server } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  API_ENDPOINTS,
  API_TAGS,
  curlExample,
  type ApiEndpoint,
  type AuthType,
  type HttpMethod,
} from "@/lib/api/catalog";

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

const AUTH_LABELS: Record<AuthType, string> = {
  none: "No auth",
  jwt: "Bearer token",
  api_key: "API key",
  jwt_or_api_key: "API key or Bearer",
  platform_key: "Platform key",
  stripe: "Stripe signature",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function PlatformEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const curl = curlExample(endpoint);
  const method = METHOD_STYLES[endpoint.method];
  return (
    <article
      id={`platform-${endpoint.id}`}
      className="scroll-mt-32 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
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
            {AUTH_LABELS[endpoint.auth]}
          </span>
          {endpoint.deprecated && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Deprecated
            </span>
          )}
          {endpoint.sse && (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
              SSE
            </span>
          )}
        </div>
        <h4 className="mt-3 text-base font-bold text-foreground">{endpoint.summary}</h4>
        {endpoint.description && (
          <p className="mt-1 text-sm text-muted-foreground">{endpoint.description}</p>
        )}
      </div>
      <div className="overflow-hidden rounded-b-2xl border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
          <span className="font-mono text-[10px] text-slate-400">bash</span>
          <CopyButton text={curl} />
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-emerald-300">
          <code>{curl}</code>
        </pre>
      </div>
    </article>
  );
}

export function PlatformApiReference() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return API_ENDPOINTS.filter((ep) => {
      if (activeTag && ep.tag !== activeTag) return false;
      if (!q) return true;
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.tag.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    });
  }, [query, activeTag]);

  const grouped = useMemo(() => {
    const map = new Map<string, ApiEndpoint[]>();
    for (const ep of filtered) {
      const list = map.get(ep.tag) ?? [];
      list.push(ep);
      map.set(ep.tag, list);
    }
    return API_TAGS.filter((tag) => map.has(tag.id)).map((tag) => ({
      tag,
      endpoints: map.get(tag.id) ?? [],
    }));
  }, [filtered]);

  return (
    <section id="platform-api" className="scroll-mt-32 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
            <Server className="size-4" />
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Platform API
          </p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Full endpoint reference
        </h2>
        <p className="text-sm text-muted-foreground">
          All platform routes including advisor, testing sandbox, engine inference, billing, and
          internal integrations. Visible when signed in.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search endpoints by path, method, or tag…"
          className="rounded-xl border-2 pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
            activeTag === null
              ? "border-transparent bg-foreground text-background shadow-md"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          All ({API_ENDPOINTS.length})
        </button>
        {API_TAGS.map((tag) => {
          const count = API_ENDPOINTS.filter((ep) => ep.tag === tag.id).length;
          if (!count) return null;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => setActiveTag(tag.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                activeTag === tag.id
                  ? "border-transparent bg-foreground text-background shadow-md"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {tag.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-10">
        {grouped.map(({ tag, endpoints }) => (
          <div key={tag.id} id={`platform-tag-${tag.id}`} className="scroll-mt-32 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">{tag.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{tag.description}</p>
            </div>
            <div className="space-y-4">
              {endpoints.map((ep) => (
                <PlatformEndpointCard key={ep.id} endpoint={ep} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No endpoints match your search.
          </p>
        )}
      </div>
    </section>
  );
}
