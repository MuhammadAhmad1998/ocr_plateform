import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

/* ======================================================================
   LANDING PAGE — pixel-perfect match of OCRouter mockup (Screen 1)
   ====================================================================== */

const ENGINES = [
  "PaddleOCR-VL", "Tesseract", "Surya", "docTR",
  "TrOCR", "GOT-OCR", "AWS Textract", "Google Doc AI",
];

const FEATURES = [
  {
    icon: "◎",
    title: "Benchmarks on your data",
    desc: "The agent runs candidate engines on your actual document, not generic leaderboard claims that go stale every six months.",
  },
  {
    icon: "⇄",
    title: "Routes automatically",
    desc: "Cheap engines for simple pages, heavy VLMs only when needed. Lower blended cost per page without lifting a finger.",
  },
  {
    icon: "⛉",
    title: "Never breaks on refusals",
    desc: "Some VLMs refuse IDs and passports mid-pipeline. We detect it and reroute to an engine that won't — automatically.",
  },
  {
    icon: "◱",
    title: "Open-source, self-hosted",
    desc: "The best document models now ship open. We host them on serverless GPU so you don't manage a single container.",
  },
  {
    icon: "▤",
    title: "One bill, one SDK",
    desc: "Commercial APIs and open-source engines behind a single key, with transparent per-engine cost attribution.",
  },
  {
    icon: "◧",
    title: "Region-pinned & private",
    desc: "Data residency controls and zero-retention processing for documents you can't let leave a region.",
  },
];

export default function HomePage() {
  return (
    <div style={{ background: "rgb(var(--base))", color: "rgb(var(--text-1))" }} className="min-h-screen">
      <Navbar variant="marketing" />

      <main>
        {/* ===== HERO ===== */}
        <section className="dotgrid">
          <div className="mx-auto max-w-[1080px] px-6">
            <div className="py-[90px] pb-[70px] text-center">

              {/* Eyebrow */}
              <span className="eyebrow mb-7 inline-flex">
                ◆ The OCR intelligence layer
              </span>

              {/* H1 */}
              <h1
                className="mx-auto mb-6 max-w-[760px] text-[54px] font-bold leading-[1.05] tracking-[-1.5px]"
                style={{ color: "rgb(var(--text-1))" }}
              >
                Every OCR engine.{" "}
                <span style={{ color: "rgb(var(--teal))" }}>One intelligent answer.</span>
              </h1>

              {/* Subtext */}
              <p
                className="mx-auto mb-9 max-w-[560px] text-[19px] leading-[1.55]"
                style={{ color: "rgb(var(--text-2))" }}
              >
                Upload a document and our agent benchmarks every engine — open-source and
                commercial — on your actual data, then routes to the winner. Stop guessing
                which OCR to use.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  href="/advisor"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-medium transition-all",
                    "hover:brightness-110"
                  )}
                  style={{
                    background: "rgb(var(--teal))",
                    border: "0.5px solid rgb(var(--teal))",
                    color: "rgb(var(--primary-foreground))",
                  }}
                >
                  Try it on your document →
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-medium transition-all hover:bg-[rgb(var(--surface-2))]"
                  style={{
                    background: "rgb(var(--surface-1))",
                    border: "0.5px solid rgb(var(--border-strong))",
                    color: "rgb(var(--text-1))",
                  }}
                >
                  Read the docs
                </Link>
              </div>

              {/* Trust hints */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" style={{ color: "rgb(var(--green))" }} />
                  No credit card required
                </span>
                <span style={{ color: "rgb(var(--text-3))" }}>·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" style={{ color: "rgb(var(--green))" }} />
                  50 free pages
                </span>
                <span style={{ color: "rgb(var(--text-3))" }}>·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" style={{ color: "rgb(var(--green))" }} />
                  Cancel anytime
                </span>
              </div>

              {/* Code peek */}
              <div className="codepeek mx-auto mt-14 max-w-[680px] text-left shadow-none">
                <div className="bar">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="font-mono text-xs ml-2" style={{ color: "rgb(var(--text-2))" }}>
                    quickstart.py
                  </span>
                </div>
                <pre className="overflow-x-auto p-5 text-[13px] leading-[1.7]">
                  <span style={{ color: "rgb(var(--text-3))" }}># One call. We pick the best engine for each document.</span>{"\n"}
                  <span style={{ color: "rgb(var(--teal))" }}>from</span>{" ocrouter "}
                  <span style={{ color: "rgb(var(--teal))" }}>import</span>{" Client\n\n"}
                  {"client = Client(api_key="}
                  <span style={{ color: "rgb(var(--amber))" }}>&quot;sk_live_...&quot;</span>
                  {")\n\nresult = client.recognize(\n    file="}
                  <span style={{ color: "rgb(var(--amber))" }}>&quot;invoice_urdu.pdf&quot;</span>
                  {",\n    strategy="}
                  <span style={{ color: "rgb(var(--amber))" }}>&quot;auto&quot;</span>
                  {",   "}
                  <span style={{ color: "rgb(var(--text-3))" }}># agent chooses + routes</span>
                  {"\n    priorities=\{"}
                  <span style={{ color: "rgb(var(--amber))" }}>&quot;accuracy&quot;</span>
                  {": "}
                  <span style={{ color: "rgb(var(--green))" }}>0.7</span>
                  {", "}
                  <span style={{ color: "rgb(var(--amber))" }}>&quot;cost&quot;</span>
                  {": "}
                  <span style={{ color: "rgb(var(--green))" }}>0.3</span>
                  {"\},\n)\n\nprint(result.engine)      "}
                  <span style={{ color: "rgb(var(--text-3))" }}># → &quot;paddleocr-vl&quot;</span>
                  {"\nprint(result.text)        "}
                  <span style={{ color: "rgb(var(--text-3))" }}># extracted text</span>
                  {"\nprint(result.confidence)  "}
                  <span style={{ color: "rgb(var(--text-3))" }}># → 0.96</span>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ENGINE LOGOS STRIP ===== */}
        <div
          className="border-y py-8 text-center"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="mx-auto max-w-[1080px] px-6">
            <div className="font-mono text-[11px] uppercase tracking-[1px] mb-4" style={{ color: "rgb(var(--text-2))" }}>
              One API in front of 40+ engines
            </div>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 font-mono text-sm" style={{ color: "rgb(var(--text-3))" }}>
              {ENGINES.map((e) => <span key={e}>{e}</span>)}
            </div>
          </div>
        </div>

        {/* ===== FEATURES ===== */}
        <div className="mx-auto max-w-[1080px] px-6">
          <section className="py-[70px]">
            <h2 className="mb-2 text-center text-[34px] font-bold tracking-[-0.6px]" style={{ color: "rgb(var(--text-1))" }}>
              The brain, not just the pipe
            </h2>
            <p className="mx-auto mb-12 max-w-[520px] text-center" style={{ color: "rgb(var(--text-2))" }}>
              Aggregators hand you a catalogue and leave you to guess.
              We tell you which engine wins — on your documents.
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl p-[26px]"
                  style={{
                    background: "rgb(var(--surface-1))",
                    border: "0.5px solid rgb(var(--border))",
                  }}
                >
                  <div
                    className="mb-4 flex size-[42px] items-center justify-center rounded-[10px] text-xl"
                    style={{
                      background: "rgb(var(--teal-bg))",
                      color: "rgb(var(--teal))",
                      border: "0.5px solid rgb(var(--teal-border))",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-[18px] font-semibold tracking-[-0.2px]" style={{ color: "rgb(var(--text-1))" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== BIG CTA ===== */}
          <div
            className="mb-20 rounded-[18px] p-14 text-center"
            style={{
              background: "rgb(var(--teal-bg))",
              border: "0.5px solid rgb(var(--teal-border))",
            }}
          >
            <h2 className="mb-3 text-[30px] font-bold tracking-[-0.5px]" style={{ color: "rgb(var(--text-1))" }}>
              Find your best OCR in 30 seconds
            </h2>
            <p className="mb-7" style={{ color: "rgb(var(--text-2))" }}>
              Free for your first document. No card required.
            </p>
            <Link
              href="/advisor"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-medium transition-all hover:brightness-110"
              style={{
                background: "rgb(var(--teal))",
                border: "0.5px solid rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
              }}
            >
              Upload a document →
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
