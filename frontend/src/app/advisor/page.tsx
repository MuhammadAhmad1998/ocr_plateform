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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, formatEngineName, getToken, streamMessage } from "@/lib/api";
import { rh, iconBox } from "@/lib/remote-hub";
import { useAdvisorStore } from "@/lib/store";
import { TIER_NAMES, cn } from "@/lib/utils";

const WIZARD_STEPS = [
 { id: "discuss", label: "Discuss", description: "Tell us about your needs", icon: MessageSquare },
 { id: "recommend", label: "Match", description: "Review your tier", icon: Sparkles },
 { id: "demo", label: "Demo", description: "See live OCR output", icon: Zap },
] as const;

const MAX_INPUT_LENGTH = 1000;

export default function AdvisorPage() {
 const router = useRouter();
 const chatEndRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);
 const [input, setInput] = useState("");
 const [initLoading, setInitLoading] = useState(true);
 const [authenticated, setAuthenticated] = useState<boolean | null>(null);
 const [wizardStep, setWizardStep] = useState(0);
 const [uploading, setUploading] = useState(false);
 const pollRef = useRef<NodeJS.Timeout | null>(null);

 const {
 sessionId,
 messages,
 streamingContent,
 isStreaming,
 recommendation,
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
 router.replace("/login?next=/advisor");
 return;
 }
 setAuthenticated(true);
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
 } catch {
 router.replace("/login?next=/advisor");
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
 {
 text: result.text ?? undefined,
 confidence: result.confidence ?? undefined,
 timing_ms: result.timing_ms ?? undefined,
 },
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

 const handleGoToDemo = useCallback(() => setWizardStep(2), []);

 const handleStepClick = useCallback(
 (index: number) => {
 if (index === 0 && recommendation) {
 toast.info("Recommendation already generated — start a new session to revise.");
 return;
 }
 if (index > wizardStep && !recommendation) return;
 setWizardStep(index);
 },
 [recommendation, wizardStep]
 );

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

 async function handleSend(e?: React.FormEvent) {
 e?.preventDefault();
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

 function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
 if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
 e.preventDefault();
 handleSend();
 }
 }

 useEffect(
 () => () => {
 if (pollRef.current) clearInterval(pollRef.current);
 },
 []
 );

 const inputDisabled = isStreaming || !!recommendation;
 const charCount = input.length;
 const charCountColor =
 charCount > MAX_INPUT_LENGTH * 0.9
 ? "text-muted-foreground"
 : charCount > MAX_INPUT_LENGTH * 0.7
 ? "text-muted-foreground"
 : "text-muted-foreground";

 const turnCount = useMemo(
 () => messages.filter((m) => m.role === "user").length,
 [messages]
 );

 if (authenticated !== true) {
 return null;
 }

 if (initLoading) {
 return (
 <div className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:pl-72">
 <AppSidebar />
 <div className="flex flex-1 items-center justify-center">
 <div className="space-y-6 text-center">
 <div className="relative mx-auto size-20">
 <div className="absolute inset-0 animate-pulse rounded-full bg-card" />
 <div className="relative flex size-20 items-center justify-center rounded-full border border-primary/40 bg-accent">
 <Sparkles className="size-9 animate-pulse text-primary" />
 </div>
 </div>
 <div className="space-y-2">
 <p className="text-2xl font-bold tracking-tight text-foreground">
 Booting the Advisor
 </p>
 <p className="text-sm text-muted-foreground">
 Preparing your AI-powered OCR concierge…
 </p>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:pl-72">
 <AppSidebar />

 <main className="relative z-10 flex w-full flex-1 flex-col gap-8 px-4 py-8 lg:gap-10 lg:px-8">
 {/* ============= HERO ============= */}
 <section className="relative overflow-hidden rounded-3xl border border-border/60 p-6 sm:p-8 lg:p-10 lg:p-10">

 <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
 <div className="space-y-4">
 <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-foreground/70 ">
 <span className="relative flex size-2">
 <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-60" />
 <span className="relative inline-flex size-2 rounded-full bg-primary" />
 </span>
 AI Advisor · Live
 </div>
 <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
 Find your perfect
 <br />
 OCR setup in 3 steps.
 </h1>
 <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
 Chat about your documents, get a tier match, and watch a live demo on a real file —
 all powered by your indexed knowledge base.
 </p>
 </div>

 {turnCount > 0 && (
 <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-5 py-3 text-sm shadow-sm ">
 <div className="flex items-center gap-2 text-muted-foreground">
 <MessageSquare className="size-4 text-muted-foreground" />
 <span>
 <span className="font-bold text-foreground">{turnCount}</span>{" "}
 {turnCount === 1 ? "msg" : "msgs"}
 </span>
 </div>
 <span className="h-4 w-px bg-border" />
 <div className="flex items-center gap-2 text-muted-foreground">
 <Cpu className="size-4 text-muted-foreground" />
 <span>
 Step <span className="font-bold text-foreground">{wizardStep + 1}</span>/3
 </span>
 </div>
 </div>
 )}
 </div>

 {/* PILL STEPPER */}
 <div className="relative mt-8 flex items-center gap-3 sm:mt-10">
 {WIZARD_STEPS.map((step, idx) => {
 const Icon = step.icon;
 const isCurrent = idx === wizardStep;
 const isComplete = idx < wizardStep;
 const reachable = idx <= wizardStep || !!recommendation;
 return (
 <div key={step.id} className="flex flex-1 items-center gap-3">
 <button
 type="button"
 disabled={!reachable}
 onClick={() => handleStepClick(idx)}
 className={cn(
 "group flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
 isCurrent &&
 "border-primary bg-primary/10 text-foreground",
 isComplete &&
 "border-border bg-muted text-foreground hover:border-foreground/20",
 !isCurrent &&
 !isComplete &&
 "border-border/70 bg-background/60 text-muted-foreground",
 reachable && !isCurrent && "hover:border-primary/40 cursor-pointer",
 !reachable && "opacity-50 cursor-not-allowed"
 )}
 >
 <div
 className={cn(
 "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all",
 isCurrent && "bg-primary text-primary-foreground",
 isComplete && "bg-foreground text-primary-foreground",
 !isCurrent && !isComplete && "bg-muted"
 )}
 >
 {isComplete ? <CheckCircle2 className="size-5" /> : <Icon className="size-4" />}
 </div>
 <div className="min-w-0 hidden sm:block">
 <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isCurrent ? "text-primary" : "opacity-70")}>
 Step {idx + 1}
 </p>
 <p className="truncate text-sm font-semibold">{step.label}</p>
 </div>
 </button>
 {idx < WIZARD_STEPS.length - 1 && (
 <div
 aria-hidden
 className={cn(
 "h-0.5 w-4 shrink-0 rounded-full transition-colors sm:w-8",
 isComplete ? "bg-primary" : "bg-border"
 )}
 />
 )}
 </div>
 );
 })}
 </div>
 </section>

 {/* ============= MAIN GRID ============= */}
 <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
 {/* ============= CHAT / WIZARD CARD ============= */}
 <div className="group relative">
 <div className="absolute -inset-px rounded-3xl bg-card" />
 <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-2xl ">
 {/* HEADER */}
 <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card px-5 py-4">
 <div className="flex items-center gap-3">
 <div className={iconBox("md")}>
 {wizardStep === 0 && <MessageSquare className="size-5" />}
 {wizardStep === 1 && <Sparkles className="size-5" />}
 {wizardStep === 2 && <Zap className="size-5" />}
 </div>
 <div>
 <h2 className="text-lg font-bold text-foreground">
 {WIZARD_STEPS[wizardStep].label}
 </h2>
 <p className="text-xs text-muted-foreground">
 {WIZARD_STEPS[wizardStep].description}
 </p>
 </div>
 </div>
 {wizardStep > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleStepClick(wizardStep - 1)}
 className="gap-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
 >
 <ArrowLeft className="size-4" />
 <span className="hidden sm:inline">Back</span>
 </Button>
 )}
 </div>

 {/* BODY */}
 <div className="flex flex-1 flex-col">
 <AnimatePresence mode="wait">
 <motion.div
 key={wizardStep}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -12 }}
 transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
 className="flex min-h-0 flex-1 flex-col"
 >
 {wizardStep === 0 && (
 <>
 <ScrollArea className="flex-1 px-4 py-6 sm:px-6">
 {messages.length === 0 && !isStreaming ? (
 <AdvisorChatEmptyState
 onSelectPrompt={handleSelectPrompt}
 onFocusInput={focusChatInput}
 />
 ) : (
 <div className="space-y-5">
 {messages.map((msg, i) => (
 <ChatBubble
 key={i}
 role={msg.role}
 content={msg.content}
 responseMeta={msg.responseMeta}
 index={i}
 />
 ))}
 {isStreaming && (
 <StreamingBubble
 pendingResponseMeta={pendingResponseMeta}
 streamingContent={streamingContent}
 />
 )}
 <div ref={chatEndRef} />
 </div>
 )}
 </ScrollArea>

 {recommendation && !isStreaming && (
 <div className="border-t border-border/60 bg-card">
 <Button
 onClick={() => setWizardStep(1)}
 size="lg"
 className="w-full gap-2 rounded-full bg-card hover:shadow-xl"
 >
 <CheckCircle className="size-5" />
 View Your Recommendation
 <ArrowRight className="size-5" />
 </Button>
 </div>
 )}

 <form
 onSubmit={handleSend}
 className="border-t border-border/60 bg-background/70 p-3 sm:p-4"
 >
 <div
 className={cn(
 "flex items-end gap-2 rounded-2xl border bg-background p-2 transition-all sm:gap-3",
 inputDisabled
 ? "border-border/60 opacity-60"
                : "border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15"
 )}
 >
 <Input
 ref={inputRef}
 placeholder="Describe your documents, volume, accuracy needs…"
 value={input}
 onChange={(e) =>
 setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))
 }
 onKeyDown={handleInputKeyDown}
 disabled={inputDisabled}
 className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
 />
 <Button
 type="submit"
 disabled={inputDisabled || !input.trim()}
 size="icon"
 className="size-10 shrink-0 rounded-xl bg-card hover:shadow-lg disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
 title="Send (⌘ + Enter)"
 >
 <Send className="size-4" />
 </Button>
 </div>
 <div className="mt-2 flex items-center justify-between px-2 text-[11px]">
 <span className="text-muted-foreground">
 <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>{" "}
 +{" "}
 <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
 to send
 </span>
 <span className={cn("tabular-nums font-medium", charCountColor)}>
 {charCount}/{MAX_INPUT_LENGTH}
 </span>
 </div>
 </form>
 </>
 )}

 {wizardStep === 1 && recommendation && (
 <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
 <RecommendationCard recommendation={recommendation} />
 <div className="mt-auto flex flex-wrap gap-3">
 <Button
 onClick={handleGoToDemo}
 size="lg"
 className="flex-1 gap-2 rounded-full bg-card hover:shadow-xl"
 >
 <Zap className="size-5" />
 Run Live Demo
 <ArrowRight className="size-5" />
 </Button>
 <Link
 href={`/checkout?tier=${recommendation.primary_tier}`}
 className={cn(
 buttonVariants({ variant: "outline", size: "lg" }),
 "flex-1 rounded-full border-2 hover-scale"
 )}
 >
 Skip Demo · Subscribe
 </Link>
 </div>
 </div>
 )}

 {wizardStep === 2 && (
 <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
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
 tierName={
 recommendation ? TIER_NAMES[recommendation.demo_tier] : undefined
 }
 engineName={
 recommendation ? formatEngineName(recommendation) : undefined
 }
 />
 )}
 {recommendation && demoStatus === "failed" && (
 <Button
 onClick={handleProcessDocument}
 variant="outline"
 size="lg"
 className="w-full rounded-full"
 >
 Retry Live Demo
 </Button>
 )}
 {recommendation && demoStatus === "completed" && (
 <Link
 href={`/checkout?tier=${recommendation.primary_tier}`}
 className={cn(
 buttonVariants({ size: "lg" }),
 "w-full rounded-full bg-card hover:shadow-xl"
 )}
 >
 Continue with {TIER_NAMES[recommendation.primary_tier]}
 <ChevronRight className="ml-1 size-5" />
 </Link>
 )}
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>
 </div>
 </div>

 {/* ============= SIDEBAR ============= */}
 <aside className="flex flex-col gap-5">
 {recommendation && (
 <div className={cn(rh.card, "relative p-6")}>
 <div className="space-y-4">
 <div className={rh.badge}>
 <CheckCircle2 className="size-3" />
 Your match
 </div>
 <div>
 <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
 {TIER_NAMES[recommendation.primary_tier]}
 </p>
 <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground/80">
 <Cpu className="size-3.5" />
 {formatEngineName(recommendation)}
 </div>
 </div>
 <div className="flex flex-col gap-2">
 {wizardStep === 0 && (
 <Button
 size="sm"
 onClick={() => setWizardStep(1)}
 className="w-full gap-1.5 rounded-full bg-foreground text-background hover:opacity-90"
 >
 View details <ArrowRight className="size-3.5" />
 </Button>
 )}
 {wizardStep === 1 && demoStatus === "idle" && (
 <Button
 size="sm"
 onClick={handleGoToDemo}
 className="w-full gap-1.5 rounded-full bg-foreground text-background hover:opacity-90"
 >
 Run live demo <ArrowRight className="size-3.5" />
 </Button>
 )}
 <Link
 href={`/checkout?tier=${recommendation.primary_tier}`}
 className={cn(
 buttonVariants({ variant: "outline", size: "sm" }),
 "w-full rounded-full border-2 "
 )}
 >
 Subscribe to {TIER_NAMES[recommendation.primary_tier]}
 </Link>
 </div>
 </div>
 </div>
 )}

 <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-md ">
 <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
 <div className={iconBox("sm", "size-7 rounded-lg")}>
 <Bot className="size-3.5" />
 </div>
 <h3 className="text-sm font-semibold text-foreground">Advisor Mode</h3>
 </div>
 <div className="p-5">
 <AdvisorSystemStatus capabilities={systemCapabilities} />
 </div>
 </div>

 <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
 <div className="p-5">
 <p className="mb-3 text-sm font-semibold text-foreground">How it works</p>
 <ol className="space-y-3 text-xs leading-relaxed text-muted-foreground">
 {[
 "Tell the advisor about your documents, volume and special needs.",
 "Get a recommended tier matched to your profile.",
 "Upload a sample and see live OCR output before you commit.",
 ].map((text, i) => (
 <li key={i} className="flex gap-3">
 <span
 className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-accent text-[10px] font-bold text-primary"
 >
 {i + 1}
 </span>
 <span>{text}</span>
 </li>
 ))}
 </ol>
 </div>
 </div>
 </aside>
 </div>
 </main>
 </div>
 );
}

/* ============= COMPONENTS ============= */

function ChatBubble({
 role,
 content,
 responseMeta,
 index,
}: {
 role: "user" | "assistant";
 content: string;
 responseMeta?: import("@/lib/api").ResponseMeta;
 index: number;
}) {
 const isUser = role === "user";
 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.04 }}
 className={cn("flex min-w-0 items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}
 >
 <div
 className={cn(
 "flex size-9 shrink-0 items-center justify-center rounded-xl",
 isUser
 ? "bg-muted text-foreground"
 : "border border-primary/40 bg-accent text-primary"
 )}
 >
 {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
 </div>
 <div
 className={cn(
 "group relative min-w-0 max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-md",
 isUser
 ? "rounded-br-md bg-card"
 : "rounded-bl-md border border-border/60 bg-card/90 text-foreground "
 )}
 >
 {!isUser && responseMeta && (
 <ResponseModeBadge meta={responseMeta} className="mb-2" />
 )}
 <ChatMessageContent content={content} />
 </div>
 </motion.div>
 );
}

function StreamingBubble({
 pendingResponseMeta,
 streamingContent,
}: {
 pendingResponseMeta: import("@/lib/api").ResponseMeta | null;
 streamingContent: string;
}) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex min-w-0 items-end gap-3"
 >
 <div className={cn(iconBox("sm"), "relative rounded-xl")}>
 <Sparkles className="size-4 animate-pulse" />
 <span className="absolute inset-0 animate-ping rounded-xl bg-primary/30" />
 </div>
 <div className="min-w-0 max-w-[80%] overflow-hidden rounded-2xl rounded-bl-md border border-border/60 bg-card/90 px-4 py-3 text-sm shadow-md ">
 {pendingResponseMeta && (
 <ResponseModeBadge meta={pendingResponseMeta} className="mb-2" />
 )}
 {streamingContent ? (
 <ChatMessageContent content={streamingContent} />
 ) : (
 <div className="flex items-center gap-1.5 py-1">
 <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
 <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
 <span className="size-1.5 animate-bounce rounded-full bg-primary" />
 </div>
 )}
 <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
 </div>
 </motion.div>
 );
}
