"use client";

import { useEffect, useRef, useState } from "react";

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

    // Step 1: fade in upload message
    timerRef.current = setTimeout(() => {
      setPhase("upload");

      // Step 2: start streaming after 800ms
      timerRef.current = setTimeout(() => {
        setPhase("streaming");
        setShowCursor(true);
        let idx = 0;

        intervalRef.current = setInterval(() => {
          idx++;
          setTypedText(ADVISOR_RESPONSE.slice(0, idx));
          if (idx >= ADVISOR_RESPONSE.length) {
            clearInterval(intervalRef.current!);

            // Hide cursor after done
            timerRef.current = setTimeout(() => {
              setShowCursor(false);
              setPhase("done");

              // Step 3: show live demo message after 500ms
              timerRef.current = setTimeout(() => {
                setShowLive(true);
                setPhase("live");

                // Step 4: loop after 2.5s
                timerRef.current = setTimeout(() => {
                  runSequence();
                }, 2500);
              }, 500);
            }, 300);
          }
        }, 18);
      }, 800);
    }, 300);
  }

  // Spinner tick
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
    <div
      className="advisor-widget-root w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      style={{ position: "relative" }}
    >
      {/* Particle shimmer background */}
      <div className="advisor-bg-particles" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <span key={i} className="particle" />
        ))}
      </div>

      {/* Title bar */}
      <div className="border-b border-border bg-muted/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-accent/80" />
          <div className="size-2.5 rounded-full bg-primary/40" />
          <div className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 text-xs text-muted-foreground">Advisor session</span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 p-5 text-sm">
        {/* Upload status */}
        <div
          className="advisor-msg rounded-xl bg-muted px-4 py-3 text-muted-foreground"
          style={{
            opacity: phase === "idle" ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          Invoice_Q3.pdf uploaded · 4 pages · mixed tables detected
        </div>

        {/* Advisor response — streams in */}
        {(phase === "streaming" || phase === "done" || phase === "live") && (
          <div
            className={`ml-auto max-w-[85%] rounded-xl px-4 py-3 text-primary-foreground${
              phase === "streaming" ? " typing-bubble" : ""
            }`}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
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
        )}

        {/* Live demo running */}
        {showLive && (
          <div
            className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-muted-foreground"
            style={{
              animation: "fadeInMsg 0.3s ease forwards",
            }}
          >
            <span className="live-spinner mr-1.5">{SPINNERS[spinnerIdx]}</span>
            Live demo running… 94% confidence · 1.2s
          </div>
        )}
      </div>

      <style>{`
        .advisor-widget-root { isolation: isolate; }

        /* Particle */
        .advisor-bg-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        .advisor-bg-particles .particle {
          position: absolute;
          bottom: -20px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%);
          animation: floatParticle 5s linear infinite;
        }
        .advisor-bg-particles .particle:nth-child(1) { left:8%;  animation-delay:0s;    animation-duration:6s; }
        .advisor-bg-particles .particle:nth-child(2) { left:22%; animation-delay:1.1s;  animation-duration:5s; }
        .advisor-bg-particles .particle:nth-child(3) { left:40%; animation-delay:2.3s;  animation-duration:7s; }
        .advisor-bg-particles .particle:nth-child(4) { left:58%; animation-delay:0.8s;  animation-duration:5.5s; }
        .advisor-bg-particles .particle:nth-child(5) { left:74%; animation-delay:3.2s;  animation-duration:6.5s; }
        .advisor-bg-particles .particle:nth-child(6) { left:88%; animation-delay:1.7s;  animation-duration:4.8s; }

        @keyframes floatParticle {
          0%   { transform: translateY(0) scale(1);   opacity: 0.2; }
          50%  { opacity: 0.35; }
          100% { transform: translateY(-220px) scale(0.5); opacity: 0; }
        }

        /* Cursor blink */
        .cursor-blink {
          animation: blinkCursor 1s steps(2, start) infinite;
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        /* Bubble glow + float while streaming */
        .typing-bubble {
          animation: glowFloat 2s ease-in-out infinite;
        }
        @keyframes glowFloat {
          0%   { box-shadow: 0 0 6px 2px rgba(124,58,237,0.35); transform: translateY(-1px); }
          50%  { box-shadow: 0 0 14px 5px rgba(124,58,237,0.65); transform: translateY(1px); }
          100% { box-shadow: 0 0 6px 2px rgba(124,58,237,0.35); transform: translateY(-1px); }
        }

        /* Fade in for upload & live messages */
        @keyframes fadeInMsg {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Live spinner */
        .live-spinner {
          display: inline-block;
          font-variant-numeric: tabular-nums;
          min-width: 1ch;
        }
      `}</style>
    </div>
  );
}
