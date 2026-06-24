"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Zap } from "lucide-react";

const ADVISOR_RESPONSE =
  "Based on your tables and multi-column layout, Professional tier is the best fit.";

const SPINNERS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type Phase = "idle" | "upload" | "streaming" | "done" | "live";

export function AdvisorDemoWidget() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(false);
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [showLive, setShowLive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAll() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function runSequence() {
    clearAll();
    setPhase("idle");
    setTypedText("");
    setShowCursor(false);
    setShowLive(false);

    timerRef.current = setTimeout(() => {
      setPhase("upload");

      timerRef.current = setTimeout(() => {
        setPhase("streaming");
        setShowCursor(true);
        let idx = 0;

        intervalRef.current = setInterval(() => {
          idx++;
          setTypedText(ADVISOR_RESPONSE.slice(0, idx));
          if (idx >= ADVISOR_RESPONSE.length) {
            clearInterval(intervalRef.current!);

            timerRef.current = setTimeout(() => {
              setShowCursor(false);
              setPhase("done");

              timerRef.current = setTimeout(() => {
                setShowLive(true);
                setPhase("live");

                timerRef.current = setTimeout(() => {
                  runSequence();
                }, 2800);
              }, 500);
            }, 300);
          }
        }, 18);
      }, 800);
    }, 300);
  }

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      setSpinnerIdx((i) => (i + 1) % SPINNERS.length);
    }, 120);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    runSequence();
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div suppressHydrationWarning className="relative w-full max-w-2xl">
      {/* Outer gradient glow */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-amber-500/30 opacity-70 blur-xl" />

      <div
        className="advisor-widget-root relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur"
        style={{ position: "relative" }}
      >
        {/* Particle shimmer background */}
        <div className="advisor-bg-particles" aria-hidden>
          {[...Array(6)].map((_, i) => (
            <span key={i} className="particle" />
          ))}
        </div>

        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-rose-400" />
            <div className="size-2.5 rounded-full bg-amber-400" />
            <div className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-fuchsia-500" />
            Live advisor session
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 p-5 text-sm">
          {/* Upload status */}
          <div
            className="advisor-msg flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/60 px-4 py-3 text-foreground/80 backdrop-blur"
            style={{
              opacity: phase === "idle" ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30">
              <FileText className="size-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Invoice_Q3.pdf</div>
              <div className="text-xs text-muted-foreground">
                4 pages · mixed tables detected
              </div>
            </div>
          </div>

          {/* Advisor response — streams in */}
          {(phase === "streaming" || phase === "done" || phase === "live") && (
            <div className="ml-auto flex max-w-[85%] items-start gap-2.5">
              <div
                className={`flex-1 rounded-2xl px-4 py-3 text-white shadow-lg shadow-fuchsia-500/30 ${
                  phase === "streaming" ? "typing-bubble" : ""
                }`}
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1, #a855f7 45%, #ec4899)",
                }}
              >
                <span>{typedText}</span>
                {showCursor && (
                  <span
                    className="cursor-blink ml-[1px] inline-block h-[1em] w-[2px] align-text-bottom"
                    style={{ background: "rgba(255,255,255,0.85)" }}
                  />
                )}
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/30">
                <Sparkles className="size-4" />
              </div>
            </div>
          )}

          {/* Live demo running */}
          {showLive && (
            <div
              className="flex items-center gap-3 rounded-2xl border border-dashed border-emerald-500/50 bg-emerald-500/5 px-4 py-3 text-emerald-700 dark:text-emerald-300"
              style={{
                animation: "fadeInMsg 0.3s ease forwards",
              }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
                <Zap className="size-4" />
              </div>
              <div className="flex flex-1 items-center justify-between text-sm">
                <span className="font-medium">
                  <span className="live-spinner mr-1.5">{SPINNERS[spinnerIdx]}</span>
                  Live demo running…
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold">
                    94% conf.
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold">
                    1.2s
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
