import {
  fetchPublic,
  fetchRoot,
  fetchWithAuth,
  json,
} from "./client";
import type {
  AdminTiersResponse,
  AdminUserDetail,
  AdminUsersResponse,
  AdvisorCapabilities,
  AdvisorDocument,
  AdvisorSession,
  ApiKeyCreated,
  ApiKeyInfo,
  DemoJobResult,
  DemoRunResult,
  Document,
  EngineHealth,
  ModelInfo,
  OcrEngineResult,
  OcrJob,
  PlatformStats,
  ServiceStatus,
  TestingModel,
  TestingResult,
  TokenResponse,
  UsageStats,
  User,
} from "./types";

async function uploadForm(path: string, form: FormData) {
  const res = await fetchWithAuth(path, { method: "POST", body: form });
  return json(res);
}

const PRIVATE_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "::",
  "::1",
  "[::1]",
  "[::]",
]);
function isSafeRemoteImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    let host = url.hostname.toLowerCase();
    if (!host) return false;
    if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
    if (PRIVATE_HOSTS.has(host)) return false;
    if (
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      host.endsWith(".localhost")
    ) {
      return false;
    }
    // IPv4 reserved / private ranges
    if (/^127\./.test(host)) return false;                                // loopback
    if (/^10\./.test(host)) return false;                                 // RFC1918
    if (/^192\.168\./.test(host)) return false;                           // RFC1918
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;            // RFC1918
    if (/^169\.254\./.test(host)) return false;                           // link-local
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return false; // CGNAT 100.64/10
    if (/^198\.(1[89])\./.test(host)) return false;                       // 198.18/15 benchmark
    if (/^0\./.test(host)) return false;                                  // 0.0.0.0/8
    if (/^22[4-9]\./.test(host) || /^23\d\./.test(host)) return false;    // 224-239 multicast
    if (/^2[4-5]\d\./.test(host)) return false;                           // 240-255 reserved
    // IPv6 reserved
    if (host.includes(":")) {
      if (/^::1?$/.test(host)) return false;
      if (/^f[cd]/i.test(host)) return false;       // ULA fc00::/7
      if (/^fe[89ab]/i.test(host)) return false;    // link-local fe80::/10
      if (/^ff/i.test(host)) return false;          // multicast
      if (/^::ffff:/i.test(host)) return false;     // IPv4-mapped (block all — be strict)
    }
    return true;
  } catch {
    return false;
  }
}

export const v1 = {
  // ── status ──────────────────────────────────────────────────────────────
  getStatus: async () => {
    const res = await fetchPublic("/status/");
    return json<ServiceStatus>(res);
  },

  // ── auth ────────────────────────────────────────────────────────────────
  register: async (email: string, password: string, fullName?: string) => {
    const res = await fetchPublic("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    return json<TokenResponse>(res);
  },

  login: async (email: string, password: string) => {
    const res = await fetchPublic("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return json<TokenResponse>(res);
  },

  refresh: async (refreshToken: string) => {
    const res = await fetchPublic("/auth/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return json<TokenResponse>(res);
  },

  me: async () => {
    const res = await fetchWithAuth("/auth/me/");
    return json<User>(res);
  },

  // ── documents ─────────────────────────────────────────────────────────
  createDocument: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return uploadForm("/documents/", form) as Promise<Document>;
  },

  listDocuments: async (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    const res = await fetchWithAuth(`/documents/${q ? `?${q}` : ""}`);
    return json<{ documents: Document[]; total: number }>(res);
  },

  getDocument: async (documentId: string) => {
    const res = await fetchWithAuth(`/documents/${documentId}/`);
    return json<Document>(res);
  },

  // ── models ────────────────────────────────────────────────────────────
  listModels: async () => {
    const res = await fetchWithAuth("/models/");
    return json<{ models: ModelInfo[] }>(res);
  },

  // ── advisor ───────────────────────────────────────────────────────────
  createSession: async (documentId?: string) => {
    const res = await fetchWithAuth("/advisor/session/", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    });
    return json<AdvisorSession>(res);
  },

  getAdvisorCapabilities: async () => {
    const res = await fetchWithAuth("/advisor/capabilities/");
    return json<AdvisorCapabilities>(res);
  },

  uploadDocument: async (file: File, sessionId?: string) => {
    const form = new FormData();
    form.append("file", file);
    const url = sessionId
      ? `/advisor/upload/?session_id=${sessionId}`
      : "/advisor/upload/";
    const res = await fetchWithAuth(url, { method: "POST", body: form });
    return json<AdvisorDocument>(res);
  },

  getSession: async (sessionId: string) => {
    const res = await fetchWithAuth(`/advisor/session/${sessionId}/`);
    return json<AdvisorSession>(res);
  },

  // ── demo ──────────────────────────────────────────────────────────────
  runDemo: async (sessionId: string, webhookUrl?: string) => {
    const res = await fetchWithAuth("/demo/run/", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, webhook_url: webhookUrl }),
    });
    return json<DemoRunResult>(res);
  },

  getDemoResult: async (jobId: string) => {
    const res = await fetchWithAuth(`/demo/result/${jobId}/`);
    return json<DemoJobResult>(res);
  },

  // ── billing ───────────────────────────────────────────────────────────
  createCheckout: async (tierSlug: string) => {
    const res = await fetchWithAuth("/billing/checkout/", {
      method: "POST",
      body: JSON.stringify({ tier_slug: tierSlug }),
    });
    return json<{ checkout_url: string }>(res);
  },

  getBillingPortal: async () => {
    const res = await fetchWithAuth("/billing/portal/");
    return json<{ portal_url: string }>(res);
  },

  // ── ocr (production) ────────────────────────────────────────────────────
  submitOcrJob: async (data: { document_id: string; tier_slug?: string; webhook_url?: string }) => {
    const res = await fetchWithAuth("/ocr/jobs/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return json<OcrJob>(res);
  },

  getOcrJob: async (jobId: string) => {
    const res = await fetchWithAuth(`/ocr/jobs/${jobId}/`);
    return json<OcrJob>(res);
  },

  // ── dashboard ─────────────────────────────────────────────────────────
  getUsage: async () => {
    const res = await fetchWithAuth("/dashboard/usage/");
    return json<UsageStats>(res);
  },

  getJobs: async () => {
    const res = await fetchWithAuth("/dashboard/jobs/");
    return json<Array<{ id: string; status: string; job_type: string; pages_processed: number; created_at: string }>>(res);
  },

  getApiKeys: async () => {
    const res = await fetchWithAuth("/dashboard/api-keys/");
    return json<ApiKeyInfo[]>(res);
  },

  createApiKey: async (name = "Default") => {
    const res = await fetchWithAuth(`/dashboard/api-keys/?name=${encodeURIComponent(name)}`, {
      method: "POST",
    });
    return json<ApiKeyCreated>(res);
  },

  revokeApiKey: async (keyId: string) => {
    const res = await fetchWithAuth(`/dashboard/api-keys/${keyId}/revoke/`, {
      method: "POST",
    });
    return json(res);
  },

  // ── testing (legacy sandbox) ────────────────────────────────────────────
  getTestingModels: async () => {
    const res = await fetchWithAuth("/testing/models/");
    return json<{ models: TestingModel[] }>(res);
  },

  runTesting: async (
    file: File,
    modelSlug: string,
    options?: {
      outputFormat?: string;
      question?: string;
      prompt?: string;
      enableThinking?: boolean;
      task?: string;
      ocrType?: string;
    }
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("model_slug", modelSlug);
    if (options?.outputFormat) form.append("output_format", options.outputFormat);
    if (options?.question) form.append("question", options.question);
    if (options?.prompt) form.append("prompt", options.prompt);
    if (options?.enableThinking) form.append("enable_thinking", "true");
    if (options?.task) form.append("task", options.task);
    if (options?.ocrType) form.append("ocr_type", options.ocrType);
    const res = await fetchWithAuth("/testing/run/", { method: "POST", body: form });
    return json<TestingResult>(res);
  },

  // ── vlm ───────────────────────────────────────────────────────────────
  vlmChat: async (data: { image_url?: string; prompt: string; file?: File }) => {
    if (data.file) {
      const form = new FormData();
      form.append("file", data.file);
      form.append("prompt", data.prompt);
      return uploadForm("/vlm/chat/", form);
    }
    if (data.image_url && !isSafeRemoteImageUrl(data.image_url)) {
      throw new Error("Invalid image_url: must be a public http(s) URL");
    }
    const res = await fetchWithAuth("/vlm/chat/", {
      method: "POST",
      body: JSON.stringify({ image_url: data.image_url, prompt: data.prompt }),
    });
    return json(res);
  },

  vlmChatMulti: async (data: { messages: unknown[]; file?: File }) => {
    if (data.file) {
      const form = new FormData();
      form.append("file", data.file);
      form.append("messages", JSON.stringify(data.messages));
      return uploadForm("/vlm/chat/multi/", form);
    }
    const res = await fetchWithAuth("/vlm/chat/multi/", {
      method: "POST",
      body: JSON.stringify({ messages: data.messages }),
    });
    return json(res);
  },

  vlmAnalyzePdf: async (file: File, prompt?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (prompt) form.append("prompt", prompt);
    return uploadForm("/vlm/pdf/analyze/", form);
  },

  vlmHealth: async () => {
    const res = await fetchWithAuth("/vlm/health/");
    return json<EngineHealth>(res);
  },

  // ── paddle-ocr ────────────────────────────────────────────────────────
  paddleRecognize: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return uploadForm("/paddle-ocr/recognize/", form) as Promise<OcrEngineResult>;
  },

  paddleAnalyzePdf: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return uploadForm("/paddle-ocr/pdf/analyze/", form);
  },

  paddleHealth: async () => {
    const res = await fetchWithAuth("/paddle-ocr/health/");
    return json<EngineHealth>(res);
  },

  // ── got-ocr ───────────────────────────────────────────────────────────
  gotRecognize: async (file: File, options?: { task?: string; ocrType?: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.task) form.append("task", options.task);
    if (options?.ocrType) form.append("ocr_type", options.ocrType);
    return uploadForm("/got-ocr/recognize/", form) as Promise<OcrEngineResult>;
  },

  gotAnalyzePdf: async (file: File, options?: { task?: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.task) form.append("task", options.task);
    return uploadForm("/got-ocr/pdf/analyze/", form);
  },

  gotHealth: async () => {
    const res = await fetchWithAuth("/got-ocr/health/");
    return json<EngineHealth>(res);
  },

  // ── qianfan-ocr ───────────────────────────────────────────────────────
  qianfanRecognize: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return uploadForm("/qianfan-ocr/recognize/", form) as Promise<OcrEngineResult>;
  },

  qianfanAnalyzePdf: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return uploadForm("/qianfan-ocr/pdf/analyze/", form);
  },

  qianfanHealth: async () => {
    const res = await fetchWithAuth("/qianfan-ocr/health/");
    return json<EngineHealth>(res);
  },

  // ── infinity-parser ─────────────────────────────────────────────────────
  infinityRecognize: async (
    file: File,
    options?: { taskType?: string; customPrompt?: string; maxNewTokens?: number; enableThinking?: boolean }
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.taskType) form.append("task_type", options.taskType);
    if (options?.customPrompt) form.append("custom_prompt", options.customPrompt);
    if (options?.maxNewTokens) form.append("max_new_tokens", String(options.maxNewTokens));
    if (options?.enableThinking) form.append("enable_thinking", "true");
    return uploadForm("/infinity-parser/recognize/", form) as Promise<OcrEngineResult>;
  },

  infinityAnalyzePdf: async (
    file: File,
    options?: { taskType?: string; customPrompt?: string; maxNewTokens?: number; enableThinking?: boolean }
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.taskType) form.append("task_type", options.taskType);
    if (options?.customPrompt) form.append("custom_prompt", options.customPrompt);
    if (options?.maxNewTokens) form.append("max_new_tokens", String(options.maxNewTokens));
    if (options?.enableThinking) form.append("enable_thinking", "true");
    return uploadForm("/infinity-parser/pdf/analyze/", form);
  },

  infinityHealth: async () => {
    const res = await fetchWithAuth("/infinity-parser/health/");
    return json<EngineHealth>(res);
  },

  // ── health (root) ─────────────────────────────────────────────────────
  health: async () => {
    const res = await fetchRoot("/health");
    return json<{ status: string }>(res);
  },

  healthReady: async () => {
    const res = await fetchRoot("/health/ready");
    return json<{ status: string }>(res);
  },

  // ── admin ─────────────────────────────────────────────────────────────
  getPlatformStats: async () => {
    const res = await fetchWithAuth("/admin/stats/");
    return json<PlatformStats>(res);
  },

  getAdminTiers: async () => {
    const res = await fetchWithAuth("/admin/tiers/");
    return json<AdminTiersResponse>(res);
  },

  listUsers: async (params?: {
    page?: number;
    page_size?: number;
    active_only?: boolean;
    tier_slug?: string;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    if (params?.active_only) qs.set("active_only", "true");
    if (params?.tier_slug) qs.set("tier_slug", params.tier_slug);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    const res = await fetchWithAuth(`/admin/users/${q ? `?${q}` : ""}`);
    return json<AdminUsersResponse>(res);
  },

  getUserDetail: async (userId: string) => {
    const res = await fetchWithAuth(`/admin/users/${userId}`);
    return json<AdminUserDetail>(res);
  },

  activateUser: async (userId: string) => {
    const res = await fetchWithAuth(`/admin/users/${userId}/activate`, {
      method: "PATCH",
    });
    return json<{ message: string }>(res);
  },

  deactivateUser: async (userId: string) => {
    const res = await fetchWithAuth(`/admin/users/${userId}/deactivate`, {
      method: "PATCH",
    });
    return json<{ message: string }>(res);
  },

  updateUserQuota: async (userId: string, quotaLimit: number) => {
    const res = await fetchWithAuth(`/admin/users/${userId}/quota?quota_limit=${quotaLimit}`, {
      method: "PATCH",
    });
    return json<{ message: string }>(res);
  },

  updateUserTier: async (userId: string, tierSlug: string) => {
    const res = await fetchWithAuth(`/admin/users/${userId}/tier?tier_slug=${tierSlug}`, {
      method: "PATCH",
    });
    return json<{ message: string }>(res);
  },

  revokeUserApiKey: async (userId: string, keyId: string) => {
    const res = await fetchWithAuth(`/admin/users/${userId}/api-keys/${keyId}`, {
      method: "DELETE",
    });
    return json<{ message: string }>(res);
  },
};
