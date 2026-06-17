"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Send,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdvisorChatEmptyState } from "@/components/AdvisorChatEmptyState";
import { ChatMessageContent } from "@/components/ChatMessageContent";
import { AdvisorSystemStatus } from "@/components/AdvisorSystemStatus";
import { DemoResults } from "@/components/DemoResults";
import { DemoUpload } from "@/components/DemoUpload";
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
  { id: "demo", label: "Demo", description: "Upload a document and see live OCR output" },
];

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
    sessionId,
    messages,
    streamingContent,
    isStreaming,
    recommendation,
    demoJobId,
    demoResult,
    demoStatus,
    documentId,
    documentName,
    setSession,
    setDocument,
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
        if (session.document_id) {
          setDocument(session.document_id, "Uploaded document");
        }
      } catch {
        router.push("/login");
      } finally {
        setInitLoading(false);
      }
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
      const timer = window.setTimeout(focusChatInput, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isStreaming, wizardStep, recommendation, messages.length, focusChatInput]);

  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt);
      focusChatInput();
    },
    [focusChatInput]
  );

  const startDemo = useCallback(
    async (sid: string) => {
      try {
        const { job_id } = await api.runDemo(sid);
        setDemoJob(job_id);
        pollRef.current = setInterval(async () => {
          const result = await api.getDemoResult(job_id);
          if (result.status === "completed") {
            setDemoResult(
              { text: result.text ?? undefined, confidence: result.confidence ?? undefined, timing_ms: result.timing_ms ?? undefined },
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

  const handleGoToDemo = useCallback(() => {
    setWizardStep(2);
  }, []);

  const handleUploadDocument = useCallback(
    async (file: File) => {
      if (!sessionId) return;
      setUploading(true);
      try {
        const doc = await api.uploadDocument(file, sessionId);
        setDocument(doc.id, doc.filename);
      } finally {
        setUploading(false);
      }
    },
    [sessionId, setDocument]
  );

  const handleProcessDocument = useCallback(() => {
    if (!sessionId || !documentId) return;
    startDemo(sessionId);
  }, [sessionId, documentId, startDemo]);

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
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse-slow rounded-full bg-primary/20 blur-xl"></div>
              <Loader2 className="relative mx-auto size-12 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Starting Your Advisor Session</p>
              <p className="text-sm text-muted-foreground">Preparing AI-powered recommendations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex w-full flex-1 flex-col gap-8 px-4 py-8 lg:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
              <Sparkles className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">OCR Advisor</h1>
              <p className="text-muted-foreground">
                AI-powered guidance to match your documents with the perfect tier
              </p>
            </div>
          </div>
        </div>

        <div id="advisor-wizard-stepper" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <WizardStepper steps={WIZARD_STEPS} currentStep={wizardStep} />
        </div>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_380px]">
          <Card id="advisor-chat-card" className="flex min-h-[600px] flex-col overflow-hidden border-border shadow-lg">
            <CardHeader className="space-y-1 border-b border-border bg-muted/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  {wizardStep === 0 && <Sparkles className="size-5 text-primary" />}
                  {wizardStep === 1 && <CheckCircle className="size-5 text-primary" />}
                  {wizardStep === 2 && <ArrowRight className="size-5 text-primary" />}
                </div>
                <div>
                  <CardTitle className="text-xl">{WIZARD_STEPS[wizardStep].label}</CardTitle>
                  <CardDescription className="text-sm">{WIZARD_STEPS[wizardStep].description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {wizardStep === 0 && (
                    <>
                      <ScrollArea className="flex-1 px-6 py-6">
                        {messages.length === 0 && !isStreaming ? (
                          <AdvisorChatEmptyState
                            onSelectPrompt={handleSelectPrompt}
                            onFocusInput={focusChatInput}
                          />
                        ) : (
                          <div className="space-y-4">
                            {messages.map((msg, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={cn("flex min-w-0", msg.role === "user" ? "justify-end" : "justify-start")}
                              >
                                <div
                                  className={cn(
                                    "group relative min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-5 py-3.5 text-sm shadow-sm",
                                    msg.role === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "border border-border bg-muted/50 text-foreground backdrop-blur-sm"
                                  )}
                                >
                                  {msg.role === "assistant" && msg.responseMeta && (
                                    <ResponseModeBadge meta={msg.responseMeta} className="mb-2.5" />
                                  )}
                                  <ChatMessageContent content={msg.content} />
                                </div>
                              </motion.div>
                            ))}
                            {isStreaming && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex min-w-0 justify-start"
                              >
                                <div className="min-w-0 max-w-[85%] overflow-hidden rounded-2xl border border-border bg-muted/50 px-5 py-3.5 text-sm shadow-sm backdrop-blur-sm">
                                  {pendingResponseMeta && (
                                    <ResponseModeBadge meta={pendingResponseMeta} className="mb-2.5" />
                                  )}
                                  {streamingContent ? (
                                    <ChatMessageContent content={streamingContent} />
                                  ) : (
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                  )}
                                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
                                </div>
                              </motion.div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        )}
                      </ScrollArea>
                      {recommendation && !isStreaming && (
                        <div className="border-t border-border bg-muted/30 px-6 py-4">
                          <Button onClick={() => setWizardStep(1)} className="w-full gap-2 shadow-sm hover:shadow-md transition-shadow" size="lg">
                            View Recommendation <ArrowRight className="size-5" />
                          </Button>
                        </div>
                      )}
                      <form
                        id="advisor-chat-form"
                        onSubmit={handleSend}
                        className="border-t border-border bg-background/50 p-4 backdrop-blur-sm"
                      >
                        <div className="flex gap-3">
                          <Input
                            id="advisor-chat-input"
                            ref={inputRef}
                            placeholder="Describe your documents, volume, and accuracy needs…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isStreaming || !!recommendation}
                            className="flex-1 border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <Button 
                            type="submit" 
                            disabled={isStreaming || !!recommendation || !input.trim()} 
                            size="icon" 
                            className="size-10 shrink-0 shadow-sm hover:shadow-md transition-all hover:scale-105"
                          >
                            <Send className="size-4" />
                          </Button>
                        </div>
                      </form>
                    </>
                  )}

                  {wizardStep === 1 && recommendation && (
                    <div className="flex flex-1 flex-col gap-6 p-6">
                      <RecommendationCard recommendation={recommendation} />
                      <div className="mt-auto flex flex-wrap gap-3">
                        <Button onClick={handleGoToDemo} className="flex-1 gap-2 shadow-sm hover:shadow-md transition-all" size="lg">
                          Run Live Demo <ArrowRight className="size-5" />
                        </Button>
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "flex-1 hover-scale"
                          )}
                        >
                          Skip Demo — Subscribe to {TIER_NAMES[recommendation.primary_tier]}
                        </Link>
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="flex flex-1 flex-col gap-6 p-6">
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
                        <Button onClick={handleProcessDocument} variant="outline" className="w-full" size="lg">
                          Retry Live Demo
                        </Button>
                      )}
                      {recommendation && demoStatus === "completed" && (
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "w-full bg-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all"
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

          <div className="space-y-6">
            <Card className="overflow-hidden border-border shadow-sm">
              <CardHeader className="space-y-1 bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" />
                  Advisor Mode
                </CardTitle>
                <CardDescription className="text-sm">How replies are generated</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <AdvisorSystemStatus capabilities={systemCapabilities} />
              </CardContent>
            </Card>

            {wizardStep >= 1 && recommendation && (
              <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-5 text-primary" />
                    <p className="text-sm font-semibold text-muted-foreground">Your Recommendation</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {TIER_NAMES[recommendation.primary_tier]}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatEngineName(recommendation)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Recommended based on your document profile and requirements
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
