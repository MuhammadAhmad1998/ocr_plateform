"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatMessageContent } from "@/components/ChatMessageContent";
import { AdvisorSystemStatus } from "@/components/AdvisorSystemStatus";
import { DemoResults } from "@/components/DemoResults";
import { Navbar } from "@/components/Navbar";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ResponseModeBadge } from "@/components/ResponseModeBadge";
import { WizardStepper } from "@/components/wizard-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import "@/app/advisor/animation.css";
import { api, formatEngineName, getToken, streamMessage } from "@/lib/api";
import { useAdvisorStore } from "@/lib/store";
import { TIER_NAMES, cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { id: "discuss", label: "Discuss", description: "Tell us about your needs" },
  { id: "recommend", label: "Recommend", description: "Review your tier match" },
  { id: "demo", label: "Demo", description: "See live OCR output" },
];

export default function AdvisorPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessionId,
    messages,
    streamingContent,
    isStreaming,
    recommendation,
    demoJobId,
    demoResult,
    demoStatus,
    setSession,
    addMessage,
    setStreaming,
    appendStream,
    finalizeStream,
    setRecommendation,
    setDemoJob,
    setDemoResult,
    systemCapabilities,
    pendingResponseMeta,
    setSystemCapabilities,
    setPendingResponseMeta,
  } = useAdvisorStore();

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    async function init() {
      try {
        const [session, capabilities] = await Promise.all([
          api.createSession(),
          api.getAdvisorCapabilities(),
        ]);
        setSession(session.id);
        setSystemCapabilities(capabilities);
        if (session.recommendation) setRecommendation(session.recommendation);
      } catch {
        router.push("/login");
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, [router, setSession, setRecommendation, setSystemCapabilities]);

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

  // Keep chat input focused after replies finish and when in discuss step
  useEffect(() => {
    if (!isStreaming && wizardStep === 0 && !recommendation) {
      const timer = window.setTimeout(focusChatInput, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isStreaming, wizardStep, recommendation, messages.length, focusChatInput]);

  const startDemo = useCallback(
    async (sid: string) => {
      try {
        const { job_id } = await api.runDemo(sid);
        setDemoJob(job_id);
        pollRef.current = setInterval(async () => {
          const result = await api.getDemoResult(job_id);
          if (result.status === "completed") {
            setDemoResult(
              { text: result.text, confidence: result.confidence, timing_ms: result.timing_ms },
              "completed"
            );
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (result.status === "failed") {
            setDemoResult(null, "failed");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }, 2000);
      } catch (err) {
        console.error("Demo failed:", err);
        const message = err instanceof Error ? err.message : "Could not start live demo";
        toast.error(message);
      }
    },
    [setDemoJob, setDemoResult]
  );

  const handleStartDemo = useCallback(() => {
    if (!sessionId) return;
    setWizardStep(2);
    if (demoStatus === "idle" || demoStatus === "failed") {
      startDemo(sessionId);
    }
  }, [sessionId, demoStatus, startDemo]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId || isStreaming) return;

    const content = input.trim();
    setInput("");
    addMessage({ role: "user", content });
    setStreaming("", true);

    streamMessage(
      sessionId,
      content,
      (chunk) => appendStream(chunk),
      (rec) => setRecommendation(rec),
      () => {
        finalizeStream();
        focusChatInput();
      },
      (err) => {
        console.error(err);
        finalizeStream();
        focusChatInput();
        toast.error("Message failed — please try again");
      },
      (meta) => setPendingResponseMeta(meta)
    );
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (initLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Starting your advisor session…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OCR Advisor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A guided flow to match your documents with the right processing tier
          </p>
        </div>

        <WizardStepper steps={WIZARD_STEPS} currentStep={wizardStep} />

        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="flex min-h-[520px] flex-col">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">{WIZARD_STEPS[wizardStep].label}</CardTitle>
              <CardDescription>{WIZARD_STEPS[wizardStep].description}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="flex min-h-0 flex-1 flex-col p-6"
                >
                  {wizardStep === 0 && (
                    <>
                      <ScrollArea className="min-h-0 flex-1 pr-4">
                        <div className="space-y-4">
                          {messages.map((msg, i) => (
                            <div
                              key={i}
                              className={cn("flex min-w-0", msg.role === "user" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "min-w-0 max-w-[85%] overflow-hidden break-words rounded-2xl px-4 py-2.5 text-sm",
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                )}
                              >
                                {msg.role === "assistant" && msg.responseMeta && (
                                  <ResponseModeBadge meta={msg.responseMeta} className="mb-2" />
                                )}
                                <ChatMessageContent content={msg.content} />
                              </div>
                            </div>
                          ))}
                          {isStreaming && (
                            <div className="flex min-w-0 justify-start">
                              <div className="min-w-0 max-w-[85%] overflow-hidden break-words rounded-2xl bg-muted px-4 py-2.5 text-sm">
                                {pendingResponseMeta && (
                                  <ResponseModeBadge meta={pendingResponseMeta} className="mb-2" />
                                )}
                                {streamingContent ? (
                                  <ChatMessageContent content={streamingContent} />
                                ) : (
                                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                )}
                                <span className="cursor-blink ml-0.5 inline-block h-4 w-0.5 align-middle bg-accent" />
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>
                      {recommendation && !isStreaming && (
                        <div className="mt-4 flex justify-center border-t border-border pt-4">
                          <Button onClick={() => setWizardStep(1)} className="gap-2">
                            View recommendation <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      )}
                      <form onSubmit={handleSend} className="mt-4 flex gap-2 border-t border-border pt-4">
                        <Input
                          ref={inputRef}
                          placeholder="Describe your documents, volume, and accuracy needs…"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isStreaming || !!recommendation}
                          className="flex-1"
                        />
                        <Button type="submit" disabled={isStreaming || !!recommendation || !input.trim()} size="icon">
                          <Send className="size-4" />
                        </Button>
                      </form>
                    </>
                  )}

                  {wizardStep === 1 && recommendation && (
                    <div className="flex flex-1 flex-col gap-6">
                      <RecommendationCard recommendation={recommendation} />
                      <div className="mt-auto flex flex-wrap gap-3">
                        <Button onClick={handleStartDemo} className="gap-2">
                          Run live demo <ArrowRight className="size-4" />
                        </Button>
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                          )}
                        >
                          Skip demo — subscribe to {TIER_NAMES[recommendation.primary_tier]}
                        </Link>
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="flex flex-1 flex-col gap-6">
                      <DemoResults
                        status={demoStatus}
                        result={demoResult}
                        tierName={recommendation ? TIER_NAMES[recommendation.demo_tier] : undefined}
                        engineName={recommendation ? formatEngineName(recommendation) : undefined}
                      />
                      {recommendation && demoStatus === "failed" && (
                        <Button onClick={handleStartDemo} variant="outline" className="w-full">
                          Retry live demo
                        </Button>
                      )}
                      {recommendation && demoStatus === "completed" && (
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "w-full bg-accent text-accent-foreground hover:bg-accent/90"
                          )}
                        >
                          Continue with {TIER_NAMES[recommendation.primary_tier]}
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Advisor mode</CardTitle>
                <CardDescription>How replies are generated</CardDescription>
              </CardHeader>
              <CardContent>
                <AdvisorSystemStatus capabilities={systemCapabilities} />
              </CardContent>
            </Card>

            {wizardStep === 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span> Be specific about document types, 
                    monthly volume, and special features like tables, handwriting, or equations.
                  </p>
                </CardContent>
              </Card>
            )}

            {wizardStep >= 1 && recommendation && (
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <p className="text-sm font-medium">Quick summary</p>
                  <p className="text-2xl font-semibold text-primary">
                    {TIER_NAMES[recommendation.primary_tier]}
                  </p>
                  <p className="text-sm font-medium">{formatEngineName(recommendation)}</p>
                  <p className="text-xs text-muted-foreground">Recommended based on your document profile</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
