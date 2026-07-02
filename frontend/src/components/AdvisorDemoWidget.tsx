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
      <div
        className="advisor-widget-root relative overflow-hidden rounded-3xl backdrop-blur"
        style={{
          position: "relative",
          border: "0.5px solid rgb(var(--border))",
          background: "rgb(var(--surface-1))",
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-5 py-3 backdrop-blur"
          style={{
            borderBottom: "0.5px solid rgb(var(--border))",
            background: "rgb(var(--surface-2))",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full" style={{ background: "rgb(var(--coral))" }} />
            <div className="size-2.5 rounded-full" style={{ background: "rgb(var(--amber))" }} />
            <div className="size-2.5 rounded-full" style={{ background: "rgb(var(--green))" }} />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "rgb(var(--text-2))" }}>
            <Sparkles className="size-3.5" style={{ color: "rgb(var(--teal))" }} />
            Live advisor session
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "rgb(var(--green-bg))",
              color: "rgb(var(--green))",
            }}
          >
            <span className="relative flex size-1.5">
              <span
                className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
                style={{ background: "rgb(var(--green))" }}
              />
              <span
                className="relative inline-flex size-1.5 rounded-full"
                style={{ background: "rgb(var(--green))" }}
              />
            </span>
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 p-5 text-sm">
          {/* Upload status */}
          <div
            className="advisor-msg flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur"
            style={{
              opacity: phase === "idle" ? 0 : 1,
              transition: "opacity 0.3s ease",
              border: "0.5px solid rgb(var(--border))",
              background: "rgb(var(--surface-2))",
              color: "rgb(var(--text-1))",
            }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "rgb(var(--teal-bg))",
                border: "0.5px solid rgb(var(--teal-border))",
                color: "rgb(var(--teal))",
              }}
            >
              <FileText className="size-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Invoice_Q3.pdf</div>
              <div className="text-xs" style={{ color: "rgb(var(--text-2))" }}>
                4 pages · mixed tables detected
              </div>
            </div>
          </div>

          {/* Advisor response — streams in */}
          {(phase === "streaming" || phase === "done" || phase === "live") && (
            <div className="ml-auto flex max-w-[85%] items-start gap-2.5">
              <div
                className={`flex-1 rounded-2xl px-4 py-3 ${
                  phase === "streaming" ? "typing-bubble" : ""
                }`}
                style={{
                  background: "rgb(var(--teal))",
                  color: "rgb(var(--primary-foreground))",
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
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "rgb(var(--teal-bg))",
                  border: "0.5px solid rgb(var(--teal-border))",
                  color: "rgb(var(--teal))",
                }}
              >
                <Sparkles className="size-4" />
              </div>
            </div>
          )}

          {/* Live demo running */}
          {showLive && (
            <div
              className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3"
              style={{
                animation: "fadeInMsg 0.3s ease forwards",
                borderColor: "rgb(var(--green-border))",
                background: "rgb(var(--green-bg))",
                color: "rgb(var(--green))",
              }}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "rgb(var(--green))",
                  color: "rgb(var(--primary-foreground))",
                }}
              >
                <Zap className="size-4" />
              </div>
              <div className="flex flex-1 items-center justify-between text-sm">
                <span className="font-medium">
                  <span className="live-spinner mr-1.5">{SPINNERS[spinnerIdx]}</span>
                  Live demo running…
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 font-bold"
                    style={{
                      background: "rgb(var(--surface-1))",
                      color: "rgb(var(--green))",
                    }}
                  >
                    94% conf.
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 font-bold"
                    style={{
                      background: "rgb(var(--surface-1))",
                      color: "rgb(var(--green))",
                    }}
                  >
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
