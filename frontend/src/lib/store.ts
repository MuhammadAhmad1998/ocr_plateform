import { create } from "zustand";
import { sanitizeAdvisorContent } from "./advisorMessage";
import type { Recommendation, ResponseMeta } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseMeta?: ResponseMeta;
}

interface AdvisorState {
  sessionId: string | null;
  documentId: string | null;
  documentName: string | null;
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  recommendation: Recommendation | null;
  systemCapabilities: import("./api").AdvisorCapabilities | null;
  pendingResponseMeta: ResponseMeta | null;
  demoJobId: string | null;
  demoResult: { text?: string; confidence?: number; timing_ms?: number } | null;
  demoStatus: "idle" | "running" | "completed" | "failed";
  setSession: (id: string) => void;
  setDocument: (id: string, name: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setStreaming: (content: string, isStreaming: boolean) => void;
  appendStream: (chunk: string) => void;
  finalizeStream: () => void;
  setRecommendation: (rec: Recommendation) => void;
  setSystemCapabilities: (caps: import("./api").AdvisorCapabilities) => void;
  setPendingResponseMeta: (meta: ResponseMeta | null) => void;
  setDemoJob: (jobId: string) => void;
  setDemoResult: (result: AdvisorState["demoResult"], status: AdvisorState["demoStatus"]) => void;
  reset: () => void;
}

export const useAdvisorStore = create<AdvisorState>((set, get) => ({
  sessionId: null,
  documentId: null,
  documentName: null,
  messages: [],
  streamingContent: "",
  isStreaming: false,
  recommendation: null,
  systemCapabilities: null,
  pendingResponseMeta: null,
  demoJobId: null,
  demoResult: null,
  demoStatus: "idle",
  setSession: (id) => set({ sessionId: id }),
  setDocument: (id, name) => set({ documentId: id, documentName: name }),
  addMessage: (msg) => set({ messages: [...get().messages, msg] }),
  setStreaming: (content, isStreaming) => set({ streamingContent: content, isStreaming }),
  appendStream: (chunk) => set({ streamingContent: get().streamingContent + chunk }),
  finalizeStream: () => {
    const content = get().streamingContent;
    const responseMeta = get().pendingResponseMeta ?? undefined;
    if (content) {
      set({
        messages: [
          ...get().messages,
          { role: "assistant", content: sanitizeAdvisorContent(content), responseMeta },
        ],
        streamingContent: "",
        isStreaming: false,
        pendingResponseMeta: null,
      });
    } else {
      set({ isStreaming: false, pendingResponseMeta: null });
    }
  },
  setRecommendation: (rec) => set({ recommendation: rec }),
  setSystemCapabilities: (caps) => set({ systemCapabilities: caps }),
  setPendingResponseMeta: (meta) => set({ pendingResponseMeta: meta }),
  setDemoJob: (jobId) => set({ demoJobId: jobId, demoStatus: "running" }),
  setDemoResult: (result, status) => set({ demoResult: result, demoStatus: status }),
  reset: () =>
    set({
      sessionId: null,
      documentId: null,
      documentName: null,
      messages: [],
      streamingContent: "",
      isStreaming: false,
      recommendation: null,
      systemCapabilities: null,
      pendingResponseMeta: null,
      demoJobId: null,
      demoResult: null,
      demoStatus: "idle",
    }),
}));
