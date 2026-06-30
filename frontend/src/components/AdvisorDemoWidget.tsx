"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Zap } from "lucide-react";
import { iconBox, rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(rh.card, "advisor-widget-root overflow-hidden")}
        style={{ position: "relative" }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-muted-foreground/40" />
            <div className="size-2.5 rounded-full bg-muted-foreground/40" />
            <div className="size-2.5 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Live advisor session
          </div>
          <div className={rh.statusLive}>
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 p-5 text-sm">
          {/* Upload status */}
          <div
            className="advisor-msg flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-foreground/80"
            style={{
              opacity: phase === "idle" ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            <div className={iconBox("sm")}>
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
                className={cn(
                  "flex-1 rounded-xl bg-foreground px-4 py-3 text-primary-foreground shadow-sm",
                  phase === "streaming" && "typing-bubble"
                )}
              >
                <span>{typedText}</span>
                {showCursor && (
                  <span
                    className="cursor-blink ml-[1px] inline-block h-[1em] w-[2px] align-text-bottom"
                    style={{ background: "rgba(255,255,255,0.85)" }}
                  />
                )}
              </div>
              <div className={iconBox("sm")}>
                <Sparkles className="size-4" />
              </div>
            </div>
          )}

          {/* Live demo running */}
          {showLive && (
            <div
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-foreground"
              style={{
                animation: "fadeInMsg 0.3s ease forwards",
              }}
            >
              <div className={iconBox("sm")}>
                <Zap className="size-4" />
              </div>
              <div className="flex flex-1 items-center justify-between text-sm">
                <span className="font-medium">
                  <span className="live-spinner mr-1.5">{SPINNERS[spinnerIdx]}</span>
                  Live demo running…
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn(rh.badge, "px-2 py-0.5 normal-case tracking-normal")}>
                    94% conf.
                  </span>
                  <span className={cn(rh.badge, "px-2 py-0.5 normal-case tracking-normal")}>
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
