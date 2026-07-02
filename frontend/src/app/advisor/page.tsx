"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdvisorChatEmptyState } from "@/components/AdvisorChatEmptyState";
import { ChatMessageContent } from "@/components/ChatMessageContent";
import { AdvisorSystemStatus } from "@/components/AdvisorSystemStatus";
import { DemoResults } from "@/components/DemoResults";
import { DemoUpload } from "@/components/DemoUpload";
import { AppSidebar } from "@/components/AppSidebar";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ResponseModeBadge } from "@/components/ResponseModeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, formatEngineName, getToken, streamMessage } from "@/lib/api";
import { useAdvisorStore } from "@/lib/store";
import { TIER_NAMES, cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { id: "discuss",   label: "Upload",  description: "Tell us about your needs",    icon: MessageSquare },
  { id: "recommend", label: "Analyze", description: "Running benchmarks",           icon: Sparkles },
  { id: "demo",      label: "Verdict", description: "Review your recommendation",  icon: Zap },
] as const;

const MAX_INPUT_LENGTH = 1000;

/* =====================================================================
   Styles using CSS variables (no Tailwind color classes)
   ===================================================================== */
const S = {
  card: {
    background: "rgb(var(--surface-1))",
    border: "0.5px solid rgb(var(--border))",
    borderRadius: "12px",
  } as React.CSSProperties,
  panelHeader: {
    borderBottom: "0.5px solid rgb(var(--border))",
    background: "rgb(var(--surface-1))",
    padding: "15px 20px",
  } as React.CSSProperties,
};

export default function AdvisorPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessionId, messages, streamingContent, isStreaming,
    recommendation, demoResult, demoStatus, documentId, documentName,
    setSession, setDocument, addMessage, setStreaming, appendStream,
    finalizeStream, setRecommendation, setDemoJob, setDemoResult,
    systemCapabilities, pendingResponseMeta, setSystemCapabilities,
    setPendingResponseMeta,
  } = useAdvisorStore();

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    async function init() {
      try {
        const [session, capabilities] = await Promise.all([
          api.createSession(),
          api.getAdvisorCapabilities(),
        ]);
        setSession(session.id);
        setSystemCapabilities(capabilities);
        if (session.recommendation) setRecommendation(session.recommendation);
        if (session.document_id) setDocument(session.document_id, "Uploaded document");
      } catch { router.push("/login"); }
      finally { setInitLoading(false); }
    }
    init();
  }, [router, setSession, setRecommendation, setSystemCapabilities, setDocument]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, wizardStep]);

  const focusChatInput = useCallback(() => {
    if (recommendation) return;
    const tryFocus = () => {
      const el = inputRef.current;
      if (!el || el.disabled) return false;
      el.focus({ preventScroll: true });
      return document.activeElement === el;
    };
    window.requestAnimationFrame(() => {
      if (tryFocus()) return;
      window.setTimeout(tryFocus, 50);
    });
  }, [recommendation]);

  useEffect(() => {
    if (demoStatus !== "idle" && wizardStep < 2) setWizardStep(2);
  }, [demoStatus, wizardStep]);

  useEffect(() => {
    if (!isStreaming && wizardStep === 0 && !recommendation) {
      const t = window.setTimeout(focusChatInput, 0);
      return () => window.clearTimeout(t);
    }
  }, [isStreaming, wizardStep, recommendation, messages.length, focusChatInput]);

  const handleSelectPrompt = useCallback((prompt: string) => {
    setInput(prompt); focusChatInput();
  }, [focusChatInput]);

  const startDemo = useCallback(async (sid: string) => {
    try {
      const { job_id } = await api.runDemo(sid);
      setDemoJob(job_id);
      pollRef.current = setInterval(async () => {
        const result = await api.getDemoResult(job_id);
        if (result.status === "completed") {
          setDemoResult({ text: result.text ?? undefined, confidence: result.confidence ?? undefined, timing_ms: result.timing_ms ?? undefined }, "completed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (result.status === "failed") {
          setDemoResult(null, "failed");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start live demo");
    }
  }, [setDemoJob, setDemoResult]);

  const handleGoToDemo = useCallback(() => setWizardStep(2), []);

  const handleStepClick = useCallback((index: number) => {
    if (index === 0 && recommendation) { toast.info("Recommendation already generated."); return; }
    if (index > wizardStep && !recommendation) return;
    setWizardStep(index);
  }, [recommendation, wizardStep]);

  const handleUploadDocument = useCallback(async (file: File) => {
    if (!sessionId) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file, sessionId);
      setDocument(doc.id, doc.filename);
    } finally { setUploading(false); }
  }, [sessionId, setDocument]);

  const handleProcessDocument = useCallback(() => {
    if (!sessionId || !documentId) return;
    startDemo(sessionId);
  }, [sessionId, documentId, startDemo]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || !sessionId || isStreaming) return;
    const content = input.trim();
    setInput("");
    addMessage({ role: "user", content });
    setStreaming("", true);
    streamMessage(sessionId, content,
      (chunk) => appendStream(chunk),
      (rec) => setRecommendation(rec),
      () => { finalizeStream(); focusChatInput(); },
      (err) => { console.error(err); finalizeStream(); focusChatInput(); toast.error("Message failed — please try again"); },
      (meta) => setPendingResponseMeta(meta)
    );
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSend(); }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const inputDisabled = isStreaming || !!recommendation;
  const charCount = input.length;
  const charCountColor = charCount > MAX_INPUT_LENGTH * 0.9 ? "rgb(var(--coral))" : charCount > MAX_INPUT_LENGTH * 0.7 ? "rgb(var(--amber))" : "rgb(var(--text-3))";

  const turnCount = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  if (initLoading) {
    return (
      <div className="flex min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
        <AppSidebar />
        <main className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="space-y-4 text-center">
            <div
              className="mx-auto flex size-16 items-center justify-center rounded-full"
              style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))" }}
            >
              <Sparkles className="size-7 animate-pulse" style={{ color: "rgb(var(--teal))" }} />
            </div>
            <p className="text-lg font-semibold" style={{ color: "rgb(var(--text-1))" }}>Booting the Advisor…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
      <AppSidebar />

      {/* Full-height content area */}
      <main className="flex flex-1 min-h-screen flex-col overflow-hidden px-4 py-6 lg:px-8">
        {/* Two-column layout: main wizard + info sidebar */}
        <div className="flex flex-1 gap-6 min-h-0">

          {/* ============ LEFT: Wizard Column ============ */}
          <div className="flex flex-1 min-w-0 flex-col">

            {/* ============ STEP BAR ============ */}
            <div className="mb-4 flex items-center lg:mb-5">
              {WIZARD_STEPS.map((step, idx) => {
                const isDone = idx < wizardStep;
                const isCurrent = idx === wizardStep;
                return (
                  <div key={step.id} className="flex items-center" style={{ flex: idx < WIZARD_STEPS.length - 1 ? 1 : "none" }}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(idx)}
                      className="flex items-center gap-2.5 text-sm transition-colors"
                      style={{
                        color: isDone || isCurrent ? (isCurrent ? "rgb(var(--text-1))" : "rgb(var(--text-2))") : "rgb(var(--text-3))",
                      }}
                    >
                      <span
                        className="flex size-6 items-center justify-center rounded-full font-mono text-xs"
                        style={{
                          background: isDone ? "rgb(var(--teal))" : "none",
                          border: isDone ? "0.5px solid rgb(var(--teal))" : isCurrent ? "0.5px solid rgb(var(--teal))" : "0.5px solid rgb(var(--border-strong))",
                          color: isDone ? "rgb(var(--primary-foreground))" : isCurrent ? "rgb(var(--teal))" : "rgb(var(--text-3))",
                        }}
                      >
                        {isDone ? "✓" : idx + 1}
                      </span>
                      {step.label}
                    </button>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div
                        className="mx-3 h-px flex-1"
                        style={{ background: isDone ? "rgb(var(--teal))" : "rgb(var(--border))" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ============ MAIN CARD — fills remaining height ============ */}
            <div
              className="flex flex-1 flex-col overflow-hidden rounded-xl min-h-0"
              style={S.card}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-1 flex-col min-h-0"
                >
                  {/* ---- STEP 0: Chat / Upload ---- */}
                  {wizardStep === 0 && (
                    <div className="flex flex-1 flex-col min-h-0">
                      <ScrollArea className="flex-1 min-h-0 px-5 py-5">
                        {messages.length === 0 && !isStreaming ? (
                          <AdvisorChatEmptyState
                            onSelectPrompt={handleSelectPrompt}
                            onFocusInput={focusChatInput}
                          />
                        ) : (
                          <div className="space-y-4">
                            {messages.map((msg, i) => (
                              <ChatBubble key={i} role={msg.role} content={msg.content} responseMeta={msg.responseMeta} index={i} />
                            ))}
                            {isStreaming && (
                              <StreamingBubble pendingResponseMeta={pendingResponseMeta} streamingContent={streamingContent} />
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        )}
                      </ScrollArea>

                      {recommendation && !isStreaming && (
                        <div
                          className="shrink-0 border-t px-5 py-4"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--teal-bg)/0.4)" }}
                        >
                          <Button
                            onClick={() => setWizardStep(1)}
                            className="w-full gap-2 rounded-lg font-medium"
                            style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))", border: "none" }}
                          >
                            <CheckCircle className="size-4" />
                            View Your Recommendation
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      )}

                      {/* Input form */}
                      <form
                        onSubmit={handleSend}
                        className="shrink-0 border-t px-4 py-3"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1))" }}
                      >
                        <div
                          className="flex items-end gap-2 rounded-lg p-2 transition-all"
                          style={{
                            border: `0.5px solid ${inputDisabled ? "rgb(var(--border))" : "rgb(var(--border-strong))"}`,
                            background: "rgb(var(--surface-1))",
                            opacity: inputDisabled ? 0.6 : 1,
                          }}
                        >
                          <Input
                            ref={inputRef}
                            placeholder="Describe your documents, volume, accuracy needs…"
                            value={input}
                            onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                            onKeyDown={handleInputKeyDown}
                            disabled={inputDisabled}
                            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
                            style={{ color: "rgb(var(--text-1))" }}
                          />
                          <button
                            type="submit"
                            disabled={inputDisabled || !input.trim()}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-all hover:brightness-110 disabled:opacity-40"
                            title="Send (⌘ + Enter)"
                            style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
                          >
                            <Send className="size-4" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
                          <span style={{ color: "rgb(var(--text-3))" }}>
                            <kbd className="rounded border px-1 font-mono text-[10px]" style={{ borderColor: "rgb(var(--border-strong))" }}>⌘</kbd>{" "}+{" "}
                            <kbd className="rounded border px-1 font-mono text-[10px]" style={{ borderColor: "rgb(var(--border-strong))" }}>Enter</kbd>{" "}
                            to send
                          </span>
                          <span style={{ color: charCountColor }}>{charCount}/{MAX_INPUT_LENGTH}</span>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ---- STEP 1: Recommendation ---- */}
                  {wizardStep === 1 && recommendation && (
                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                      <RecommendationCard recommendation={recommendation} />
                      <div className="flex flex-wrap gap-3 mt-auto">
                        <Button
                          onClick={handleGoToDemo}
                          className="flex-1 gap-2 rounded-lg font-medium"
                          style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))", border: "none" }}
                        >
                          <Zap className="size-4" />
                          Run Live Demo
                          <ArrowRight className="size-4" />
                        </Button>
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgb(var(--surface-2))]"
                          style={{
                            border: "0.5px solid rgb(var(--border-strong))",
                            background: "rgb(var(--surface-1))",
                            color: "rgb(var(--text-1))",
                          }}
                        >
                          Skip Demo · Subscribe
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* ---- STEP 2: Demo / Verdict ---- */}
                  {wizardStep === 2 && (
                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                      {demoStatus === "idle" ? (
                        <DemoUpload
                          documentName={documentName}
                          onUpload={handleUploadDocument}
                          onProcess={handleProcessDocument}
                          uploading={uploading}
                        />
                      ) : (
                        <DemoResults
                          status={demoStatus}
                          result={demoResult}
                          tierName={recommendation ? TIER_NAMES[recommendation.demo_tier] : undefined}
                          engineName={recommendation ? formatEngineName(recommendation) : undefined}
                        />
                      )}
                      {recommendation && demoStatus === "failed" && (
                        <Button onClick={handleProcessDocument} variant="outline" className="w-full rounded-lg">
                          Retry Live Demo
                        </Button>
                      )}
                      {recommendation && demoStatus === "completed" && (
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors hover:brightness-110"
                          style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
                        >
                          Continue with {TIER_NAMES[recommendation.primary_tier]}
                          <ChevronRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ---- Back button ---- */}
            {wizardStep > 0 && (
              <button
                type="button"
                onClick={() => handleStepClick(wizardStep - 1)}
                className="mt-3 flex items-center gap-1.5 text-sm transition-colors hover:text-[rgb(var(--text-1))]"
                style={{ color: "rgb(var(--text-2))" }}
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            )}
          </div>

          {/* ============ RIGHT: Info Sidebar ============ */}
          <aside className="hidden w-[272px] shrink-0 flex-col gap-4 xl:flex">

            {recommendation && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "rgb(var(--teal-bg))",
                  border: "0.5px solid rgb(var(--teal-border))",
                }}
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: "rgb(var(--teal))" }} />
                  <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "rgb(var(--teal))" }}>
                    Your match
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--teal))" }}>
                  {TIER_NAMES[recommendation.primary_tier]}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm" style={{ color: "rgb(var(--text-2))" }}>
                  <Cpu className="size-3.5" />
                  {formatEngineName(recommendation)}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/checkout?tier=${recommendation.primary_tier}`}
                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:brightness-110"
                    style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
                  >
                    Subscribe <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-xl overflow-hidden" style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}>
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "rgb(var(--border))" }}>
                <Bot className="size-4" style={{ color: "rgb(var(--teal))" }} />
                <h3 className="text-sm font-semibold" style={{ color: "rgb(var(--text-1))" }}>Advisor Mode</h3>
              </div>
              <div className="p-4">
                <AdvisorSystemStatus capabilities={systemCapabilities} />
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}>
              <p className="mb-3 text-sm font-semibold" style={{ color: "rgb(var(--text-1))" }}>How it works</p>
              <ol className="space-y-2.5 text-[13px] leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
                {[
                  "Tell the advisor about your documents, volume and special needs.",
                  "Get a recommended tier matched to your profile.",
                  "Upload a sample and see live OCR output before you commit.",
                ].map((text, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                      style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
                    >
                      {i + 1}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {turnCount > 0 && (
              <div className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))", color: "rgb(var(--text-2))" }}>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" style={{ color: "rgb(var(--teal))" }} />
                  <span className="font-bold" style={{ color: "rgb(var(--text-1))" }}>{turnCount}</span> msgs
                </span>
                <span style={{ color: "rgb(var(--border-strong))" }}>·</span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="size-3.5" style={{ color: "rgb(var(--teal))" }} />
                  Step <span className="font-bold" style={{ color: "rgb(var(--text-1))" }}>{wizardStep + 1}</span>/3
                </span>
              </div>
            )}
          </aside>

        </div>
      </main>
    </div>
  );
}

/* ============= COMPONENTS ============= */
function ChatBubble({
  role, content, responseMeta, index,
}: {
  role: "user" | "assistant";
  content: string;
  responseMeta?: import("@/lib/api").ResponseMeta;
  index: number;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn("flex min-w-0 items-end gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: isUser ? "rgb(var(--surface-2))" : "rgb(var(--teal-bg))",
          border: `0.5px solid ${isUser ? "rgb(var(--border-strong))" : "rgb(var(--teal-border))"}`,
          color: isUser ? "rgb(var(--text-2))" : "rgb(var(--teal))",
        }}
      >
        {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
      </div>
      <div
        className="min-w-0 max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: "rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
                borderRadius: "12px 12px 4px 12px",
              }
            : {
                background: "rgb(var(--surface-1))",
                border: "0.5px solid rgb(var(--border))",
                color: "rgb(var(--text-1))",
                borderRadius: "12px 12px 12px 4px",
              }
        }
      >
        {!isUser && responseMeta && <ResponseModeBadge meta={responseMeta} className="mb-2" />}
        <ChatMessageContent content={content} />
      </div>
    </motion.div>
  );
}

function StreamingBubble({
  pendingResponseMeta, streamingContent,
}: {
  pendingResponseMeta: import("@/lib/api").ResponseMeta | null;
  streamingContent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex min-w-0 items-end gap-2.5">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))", color: "rgb(var(--teal))" }}
      >
        <Sparkles className="size-3.5 animate-pulse" />
      </div>
      <div
        className="min-w-0 max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed"
        style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))", color: "rgb(var(--text-1))", borderRadius: "12px 12px 12px 4px" }}
      >
        {pendingResponseMeta && <ResponseModeBadge meta={pendingResponseMeta} className="mb-2" />}
        {streamingContent ? (
          <ChatMessageContent content={streamingContent} />
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full animate-bounce-dot"
                style={{ background: "rgb(var(--teal))", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse align-middle" style={{ background: "rgb(var(--teal))" }} />
      </div>
    </motion.div>
  );
}
