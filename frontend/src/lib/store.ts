import { create } from "zustand";
import type { Recommendation } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AdvisorState {
  sessionId: string | null;
  documentId: string | null;
  documentName: string | null;
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  recommendation: Recommendation | null;
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
    if (content) {
      set({
        messages: [...get().messages, { role: "assistant", content }],
        streamingContent: "",
        isStreaming: false,
      });
    } else {
      set({ isStreaming: false });
    }
  },
  setRecommendation: (rec) => set({ recommendation: rec }),
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
      demoJobId: null,
      demoResult: null,
      demoStatus: "idle",
    }),
}));
