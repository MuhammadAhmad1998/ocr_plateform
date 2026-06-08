"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Loader2,
  Send,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatMessageContent } from "@/components/ChatMessageContent";
import { DemoResults } from "@/components/DemoResults";
import { Navbar } from "@/components/Navbar";
import { RecommendationCard } from "@/components/RecommendationCard";
import { WizardStepper } from "@/components/wizard-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken, streamMessage } from "@/lib/api";
import { useAdvisorStore } from "@/lib/store";
import { TIER_NAMES, cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { id: "upload", label: "Upload", description: "Add your sample document" },
  { id: "discuss", label: "Discuss", description: "Tell us about your needs" },
  { id: "recommend", label: "Recommend", description: "Review your tier match" },
  { id: "demo", label: "Demo", description: "See live OCR output" },
];

export default function AdvisorPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessionId,
    documentId,
    documentName,
    messages,
    streamingContent,
    isStreaming,
    recommendation,
    demoJobId,
    demoResult,
    demoStatus,
    setSession,
    setDocument,
    addMessage,
    setStreaming,
    appendStream,
    finalizeStream,
    setRecommendation,
    setDemoJob,
    setDemoResult,
  } = useAdvisorStore();

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    async function init() {
      try {
        const session = await api.createSession();
        setSession(session.id);
        if (session.recommendation) setRecommendation(session.recommendation);
      } catch {
        router.push("/login");
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, [router, setSession, setRecommendation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, wizardStep]);

  useEffect(() => {
    if (documentId && wizardStep < 1) setWizardStep(1);
  }, [documentId, wizardStep]);

  useEffect(() => {
    if (recommendation && wizardStep < 2) setWizardStep(2);
  }, [recommendation, wizardStep]);

  useEffect(() => {
    if (demoStatus !== "idle" && wizardStep < 3) setWizardStep(3);
  }, [demoStatus, wizardStep]);

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
        toast.error("Could not start live demo");
      }
    },
    [setDemoJob, setDemoResult]
  );

  async function handleUpload(file: File) {
    if (!sessionId) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file, sessionId);
      setDocument(doc.id, doc.filename);
      addMessage({
        role: "assistant",
        content: `**${doc.filename}** is ready (${doc.page_count} page${doc.page_count > 1 ? "s" : ""}). I'll ask a few quick questions to find your ideal tier.`,
      });
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
      (rec) => {
        setRecommendation(rec);
        startDemo(sessionId);
      },
      () => finalizeStream(),
      (err) => {
        console.error(err);
        finalizeStream();
        toast.error("Message failed — please try again");
      }
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
          <Card className="flex min-h-[560px] flex-col border-border/80 shadow-sm">
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
                  className="flex flex-1 flex-col p-6"
                >
                  {wizardStep === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <button
                        type="button"
                        className={cn(
                          "flex w-full max-w-lg flex-col items-center rounded-xl border-2 border-dashed border-border",
                          "bg-muted/30 px-8 py-16 transition-colors hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="size-10 animate-spin text-primary" />
                        ) : (
                          <Upload className="size-10 text-muted-foreground" />
                        )}
                        <p className="mt-4 font-medium">Drop your document here</p>
                        <p className="mt-1 text-sm text-muted-foreground">PDF, PNG, or JPG · max 10MB</p>
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                      />
                    </div>
                  )}

                  {wizardStep === 1 && (
                    <>
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                          {messages.map((msg, i) => (
                            <div
                              key={i}
                              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                )}
                              >
                                <ChatMessageContent content={msg.content} />
                              </div>
                            </div>
                          ))}
                          {isStreaming && streamingContent && (
                            <div className="flex justify-start">
                              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
                                <ChatMessageContent content={streamingContent} />
                                <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent" />
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>
                      <form onSubmit={handleSend} className="mt-4 flex gap-2 border-t border-border pt-4">
                        <Input
                          placeholder="Describe volume, document types, accuracy needs…"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isStreaming}
                          className="flex-1"
                        />
                        <Button type="submit" disabled={isStreaming || !input.trim()} size="icon">
                          <Send className="size-4" />
                        </Button>
                      </form>
                    </>
                  )}

                  {wizardStep === 2 && recommendation && (
                    <div className="flex flex-1 flex-col gap-6">
                      <RecommendationCard recommendation={recommendation} />
                      <div className="mt-auto flex flex-wrap gap-3">
                        <Button onClick={() => setWizardStep(3)} className="gap-2">
                          View live demo <ArrowRight className="size-4" />
                        </Button>
                        <Link
                          href={`/checkout?tier=${recommendation.primary_tier}`}
                          className={cn(
                            buttonVariants(),
                            "bg-accent text-accent-foreground hover:bg-accent/90"
                          )}
                        >
                          Subscribe to {TIER_NAMES[recommendation.primary_tier]}
                        </Link>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="flex flex-1 flex-col gap-6">
                      <DemoResults
                        status={demoStatus}
                        result={demoResult}
                        tierName={recommendation ? TIER_NAMES[recommendation.demo_tier] : undefined}
                      />
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentName ? (
                  <div className="flex flex-col items-center rounded-lg bg-muted/50 py-8 text-center">
                    <FileText className="size-12 text-primary" />
                    <p className="mt-3 font-medium">{documentName}</p>
                    <p className="text-xs text-muted-foreground">Fingerprinted & ready</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    Waiting for upload
                  </div>
                )}
              </CardContent>
            </Card>

            {wizardStep > 0 && wizardStep < 3 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span> Mention monthly volume,
                    languages, and whether you need tables, handwriting, or equations extracted.
                  </p>
                </CardContent>
              </Card>
            )}

            {wizardStep >= 2 && recommendation && (
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <p className="text-sm font-medium">Quick summary</p>
                  <p className="text-2xl font-semibold text-primary">
                    {TIER_NAMES[recommendation.primary_tier]}
                  </p>
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
