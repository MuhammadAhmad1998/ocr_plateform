export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription?: {
    slug: string;
    public_name: string;
    quota_limit: number;
    quota_used: number;
  };
}

export interface Recommendation {
  primary_tier: string;
  alternative_tier: string;
  primary_reasons: string[];
  alternative_reasons: string[];
  selected_engine: string;
  demo_tier: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res;
}

export const api = {
  register: async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json() as Promise<TokenResponse>;
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json() as Promise<TokenResponse>;
  },

  me: async () => {
    const res = await fetchWithAuth("/auth/me/");
    return res.json() as Promise<User>;
  },

  createSession: async (documentId?: string) => {
    const res = await fetchWithAuth("/advisor/session/", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    });
    return res.json();
  },

  uploadDocument: async (file: File, sessionId?: string) => {
    const form = new FormData();
    form.append("file", file);
    const url = sessionId
      ? `/advisor/upload/?session_id=${sessionId}`
      : "/advisor/upload/";
    const res = await fetchWithAuth(url, { method: "POST", body: form });
    return res.json();
  },

  getSession: async (sessionId: string) => {
    const res = await fetchWithAuth(`/advisor/session/${sessionId}/`);
    return res.json();
  },

  runDemo: async (sessionId: string) => {
    const res = await fetchWithAuth("/demo/run/", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
    return res.json();
  },

  getDemoResult: async (jobId: string) => {
    const res = await fetchWithAuth(`/demo/result/${jobId}/`);
    return res.json();
  },

  createCheckout: async (tierSlug: string) => {
    const res = await fetchWithAuth("/billing/checkout/", {
      method: "POST",
      body: JSON.stringify({ tier_slug: tierSlug }),
    });
    return res.json();
  },

  getUsage: async () => {
    const res = await fetchWithAuth("/dashboard/usage/");
    return res.json();
  },

  getJobs: async () => {
    const res = await fetchWithAuth("/dashboard/jobs/");
    return res.json();
  },

  getApiKeys: async () => {
    const res = await fetchWithAuth("/dashboard/api-keys/");
    return res.json();
  },

  createApiKey: async (name = "Default") => {
    const res = await fetchWithAuth(`/dashboard/api-keys/?name=${encodeURIComponent(name)}`, {
      method: "POST",
    });
    return res.json();
  },

  getTestingModels: async () => {
    const res = await fetchWithAuth("/testing/models/");
    return res.json() as Promise<{
      models: TestingModel[];
    }>;
  },

  runTesting: async (
    file: File,
    modelSlug: string,
    options?: { question?: string; prompt?: string; enableThinking?: boolean; task?: string }
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("model_slug", modelSlug);
    if (options?.question) form.append("question", options.question);
    if (options?.prompt) form.append("prompt", options.prompt);
    if (options?.enableThinking) form.append("enable_thinking", "true");
    if (options?.task) form.append("task", options.task);
    const res = await fetchWithAuth("/testing/run/", { method: "POST", body: form });
    return res.json() as Promise<TestingResult>;
  },
};

export interface TestingModel {
  slug: string;
  display_name: string;
  type: "ocr" | "vlm" | "paddle_ocr" | "qianfan_ocr" | "nanonets_ocr";
  adapter_type: string;
  capability_tags: string[];
}

export interface TestingResult {
  model_slug: string;
  model_name: string;
  model_type: "ocr" | "vlm" | "paddle_ocr" | "qianfan_ocr" | "nanonets_ocr";
  status: string;
  filename: string;
  result: {
    text: string;
    confidence?: number;
    timing_ms?: number;
    layout?: Record<string, unknown>;
    pages?: Array<{ page_number: number; text: string; processing_time_ms: number }>;
    question?: string;
    prompt?: string;
    task?: string;
  };
}

export function streamMessage(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onRecommendation: (rec: Recommendation) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const token = getToken();
  const controller = new AbortController();

  fetch(`${API_URL}/advisor/message/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId, content }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Stream failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "message";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            // Preserve whitespace in streamed tokens — only strip the SSE separator space.
            let data = line.slice(5);
            if (data.startsWith(" ")) data = data.slice(1);
            if (eventType === "message" && data) onChunk(data);
            if (eventType === "recommendation" && data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.recommendation) onRecommendation(parsed.recommendation);
              } catch {}
            }
            if (eventType === "done") onDone();
          }
        }
      }
      onDone();
    })
    .catch(onError);

  return () => controller.abort();
}
