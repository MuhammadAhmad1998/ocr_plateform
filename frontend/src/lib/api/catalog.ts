import { API_ROOT, API_V1_URL, API_V2_URL, INTERNAL_API_URL } from "./config";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type AuthType = "none" | "jwt" | "api_key" | "jwt_or_api_key" | "platform_key" | "stripe";

export interface ApiEndpoint {
  id: string;
  tag: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  auth: AuthType;
  version: "v1" | "v2" | "internal" | "root";
  deprecated?: boolean;
  sse?: boolean;
}

export interface ApiTag {
  id: string;
  name: string;
  description: string;
}

export const API_TAGS: ApiTag[] = [
  { id: "status", name: "Status", description: "Public service status, uptime, and model availability." },
  { id: "auth", name: "Auth", description: "Register, login, refresh tokens, and current user profile." },
  { id: "documents", name: "Documents", description: "Upload, retrieve, and list documents (public API)." },
  { id: "models", name: "Models", description: "List available OCR and VLM models (public API)." },
  { id: "advisor", name: "Advisor", description: "Document upload, chat sessions, and OCR tier recommendations." },
  { id: "demo", name: "Demo", description: "Demo OCR runs tied to advisor sessions." },
  { id: "billing", name: "Billing", description: "Stripe checkout and subscription management." },
  { id: "ocr", name: "OCR", description: "Production OCR job submission and status (JWT or API key)." },
  { id: "dashboard", name: "Dashboard", description: "Usage, job history, and API key management." },
  { id: "testing", name: "Testing", description: "Model registry and sandbox OCR runs (legacy — prefer /models/)." },
  { id: "vlm", name: "VLM", description: "MiniCPM-V vision-language model inference." },
  { id: "paddle-ocr", name: "Paddle OCR", description: "PaddleOCR-VL document OCR." },
  { id: "got-ocr", name: "GOT OCR", description: "GOT-OCR2 document OCR." },
  { id: "qianfan-ocr", name: "Qianfan OCR", description: "Qianfan-OCR document OCR." },
  { id: "v2", name: "API v2", description: "Modern envelope API with prefixed ids (job_, doc_). API key auth by default." },
  { id: "internal", name: "Internal", description: "AI Platform marketplace integration — PLATFORM_API_KEY required." },
  { id: "health", name: "Health", description: "Liveness and readiness probes." },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  // status
  { id: "status-get", tag: "status", method: "GET", path: "/api/v1/status/", summary: "Get Status", auth: "none", version: "v1" },

  // auth
  { id: "auth-register", tag: "auth", method: "POST", path: "/api/v1/auth/register/", summary: "Register", auth: "none", version: "v1" },
  { id: "auth-login", tag: "auth", method: "POST", path: "/api/v1/auth/login/", summary: "Login", auth: "none", version: "v1" },
  { id: "auth-refresh", tag: "auth", method: "POST", path: "/api/v1/auth/refresh/", summary: "Refresh Token", auth: "none", version: "v1" },
  { id: "auth-me", tag: "auth", method: "GET", path: "/api/v1/auth/me/", summary: "Current User", auth: "jwt", version: "v1" },

  // documents
  { id: "docs-create", tag: "documents", method: "POST", path: "/api/v1/documents/", summary: "Create Document", auth: "jwt_or_api_key", version: "v1" },
  { id: "docs-list", tag: "documents", method: "GET", path: "/api/v1/documents/", summary: "List Documents", auth: "jwt_or_api_key", version: "v1" },
  { id: "docs-get", tag: "documents", method: "GET", path: "/api/v1/documents/{document_id}/", summary: "Get Document", auth: "jwt_or_api_key", version: "v1" },

  // models
  { id: "models-list", tag: "models", method: "GET", path: "/api/v1/models/", summary: "List Models", auth: "jwt_or_api_key", version: "v1" },

  // advisor
  { id: "advisor-capabilities", tag: "advisor", method: "GET", path: "/api/v1/advisor/capabilities/", summary: "Get Advisor Capabilities", auth: "jwt", version: "v1" },
  { id: "advisor-session-create", tag: "advisor", method: "POST", path: "/api/v1/advisor/session/", summary: "Create Session", auth: "jwt", version: "v1" },
  { id: "advisor-upload", tag: "advisor", method: "POST", path: "/api/v1/advisor/upload/", summary: "Upload Document", auth: "jwt", version: "v1" },
  { id: "advisor-message", tag: "advisor", method: "POST", path: "/api/v1/advisor/message/", summary: "Send Message (SSE)", auth: "jwt", version: "v1", sse: true },
  { id: "advisor-session-get", tag: "advisor", method: "GET", path: "/api/v1/advisor/session/{session_id}/", summary: "Get Session", auth: "jwt", version: "v1" },

  // demo
  { id: "demo-run", tag: "demo", method: "POST", path: "/api/v1/demo/run/", summary: "Run Demo", auth: "jwt", version: "v1" },
  { id: "demo-result", tag: "demo", method: "GET", path: "/api/v1/demo/result/{job_id}/", summary: "Get Demo Result", auth: "jwt", version: "v1" },

  // billing
  { id: "billing-checkout", tag: "billing", method: "POST", path: "/api/v1/billing/checkout/", summary: "Create Checkout", auth: "jwt", version: "v1" },
  { id: "billing-portal", tag: "billing", method: "GET", path: "/api/v1/billing/portal/", summary: "Customer Portal", auth: "jwt", version: "v1" },
  { id: "billing-webhook", tag: "billing", method: "POST", path: "/api/v1/billing/webhook/", summary: "Stripe Webhook", auth: "stripe", version: "v1", description: "Server-side Stripe webhook — not for client use." },

  // ocr
  { id: "ocr-submit", tag: "ocr", method: "POST", path: "/api/v1/ocr/jobs/", summary: "Submit OCR Job", auth: "jwt_or_api_key", version: "v1" },
  { id: "ocr-get", tag: "ocr", method: "GET", path: "/api/v1/ocr/jobs/{job_id}/", summary: "Get OCR Job", auth: "jwt_or_api_key", version: "v1" },

  // dashboard
  { id: "dash-usage", tag: "dashboard", method: "GET", path: "/api/v1/dashboard/usage/", summary: "Get Usage", auth: "jwt", version: "v1" },
  { id: "dash-jobs", tag: "dashboard", method: "GET", path: "/api/v1/dashboard/jobs/", summary: "Job History", auth: "jwt", version: "v1" },
  { id: "dash-keys-list", tag: "dashboard", method: "GET", path: "/api/v1/dashboard/api-keys/", summary: "List API Keys", auth: "jwt", version: "v1" },
  { id: "dash-keys-create", tag: "dashboard", method: "POST", path: "/api/v1/dashboard/api-keys/", summary: "Create API Key", auth: "jwt", version: "v1" },
  { id: "dash-keys-revoke", tag: "dashboard", method: "POST", path: "/api/v1/dashboard/api-keys/{key_id}/revoke/", summary: "Revoke API Key", auth: "jwt", version: "v1" },

  // testing
  { id: "testing-models", tag: "testing", method: "GET", path: "/api/v1/testing/models/", summary: "List Testing Models", auth: "jwt", version: "v1", deprecated: true },
  { id: "testing-run", tag: "testing", method: "POST", path: "/api/v1/testing/run/", summary: "Run Testing OCR", auth: "jwt", version: "v1", deprecated: true },

  // vlm
  { id: "vlm-chat", tag: "vlm", method: "POST", path: "/api/v1/vlm/chat/", summary: "VLM Chat", auth: "jwt_or_api_key", version: "v1" },
  { id: "vlm-chat-multi", tag: "vlm", method: "POST", path: "/api/v1/vlm/chat/multi/", summary: "VLM Multi-Turn Chat", auth: "jwt_or_api_key", version: "v1" },
  { id: "vlm-pdf", tag: "vlm", method: "POST", path: "/api/v1/vlm/pdf/analyze/", summary: "VLM Analyze PDF", auth: "jwt_or_api_key", version: "v1" },
  { id: "vlm-health", tag: "vlm", method: "GET", path: "/api/v1/vlm/health/", summary: "VLM Health", auth: "none", version: "v1" },

  // paddle-ocr
  { id: "paddle-recognize", tag: "paddle-ocr", method: "POST", path: "/api/v1/paddle-ocr/recognize/", summary: "Paddle OCR Recognize", auth: "jwt_or_api_key", version: "v1" },
  { id: "paddle-pdf", tag: "paddle-ocr", method: "POST", path: "/api/v1/paddle-ocr/pdf/analyze/", summary: "Paddle OCR Analyze PDF", auth: "jwt_or_api_key", version: "v1" },
  { id: "paddle-health", tag: "paddle-ocr", method: "GET", path: "/api/v1/paddle-ocr/health/", summary: "Paddle OCR Health", auth: "none", version: "v1" },

  // got-ocr
  { id: "got-recognize", tag: "got-ocr", method: "POST", path: "/api/v1/got-ocr/recognize/", summary: "GOT OCR Recognize", auth: "jwt_or_api_key", version: "v1" },
  { id: "got-pdf", tag: "got-ocr", method: "POST", path: "/api/v1/got-ocr/pdf/analyze/", summary: "GOT OCR Analyze PDF", auth: "jwt_or_api_key", version: "v1" },
  { id: "got-health", tag: "got-ocr", method: "GET", path: "/api/v1/got-ocr/health/", summary: "GOT OCR Health", auth: "none", version: "v1" },

  // qianfan-ocr
  { id: "qianfan-recognize", tag: "qianfan-ocr", method: "POST", path: "/api/v1/qianfan-ocr/recognize/", summary: "Qianfan OCR Recognize", auth: "jwt_or_api_key", version: "v1" },
  { id: "qianfan-pdf", tag: "qianfan-ocr", method: "POST", path: "/api/v1/qianfan-ocr/pdf/analyze/", summary: "Qianfan OCR Analyze PDF", auth: "jwt_or_api_key", version: "v1" },
  { id: "qianfan-health", tag: "qianfan-ocr", method: "GET", path: "/api/v1/qianfan-ocr/health/", summary: "Qianfan OCR Health", auth: "none", version: "v1" },

  // v2
  { id: "v2-ocr-submit", tag: "v2", method: "POST", path: "/api/v2/ocr/jobs/", summary: "Submit OCR Job", auth: "jwt_or_api_key", version: "v2" },
  { id: "v2-ocr-get", tag: "v2", method: "GET", path: "/api/v2/ocr/jobs/{job_id}/", summary: "Get OCR Job", auth: "jwt_or_api_key", version: "v2" },
  { id: "v2-docs-create", tag: "v2", method: "POST", path: "/api/v2/documents/", summary: "Create Document", auth: "jwt_or_api_key", version: "v2" },
  { id: "v2-docs-list", tag: "v2", method: "GET", path: "/api/v2/documents/", summary: "List Documents", auth: "jwt_or_api_key", version: "v2" },
  { id: "v2-docs-get", tag: "v2", method: "GET", path: "/api/v2/documents/{document_id}/", summary: "Get Document", auth: "jwt_or_api_key", version: "v2" },
  { id: "v2-models", tag: "v2", method: "GET", path: "/api/v2/models/", summary: "List Models", auth: "jwt_or_api_key", version: "v2" },

  // internal
  { id: "int-provision", tag: "internal", method: "POST", path: "/internal/v1/keys/provision", summary: "Provision Key", auth: "platform_key", version: "internal" },
  { id: "int-revoke", tag: "internal", method: "POST", path: "/internal/v1/keys/{platform_key_id}/revoke", summary: "Revoke Key", auth: "platform_key", version: "internal" },
  { id: "int-rotate", tag: "internal", method: "POST", path: "/internal/v1/keys/{platform_key_id}/rotate", summary: "Rotate Key", auth: "platform_key", version: "internal" },
  { id: "int-quota", tag: "internal", method: "PATCH", path: "/internal/v1/accounts/{platform_account_id}/quota", summary: "Patch Account Quota", auth: "platform_key", version: "internal" },

  // health
  { id: "health", tag: "health", method: "GET", path: "/health", summary: "Health", auth: "none", version: "root" },
  { id: "health-ready", tag: "health", method: "GET", path: "/health/ready", summary: "Health Ready", auth: "none", version: "root" },
];

export function fullUrl(path: string): string {
  if (path.startsWith("/api/v2")) return `${API_ROOT}${path}`;
  if (path.startsWith("/internal")) return `${API_ROOT}${path}`;
  if (path.startsWith("/api/v1")) return `${API_ROOT}${path}`;
  return `${API_ROOT}${path}`;
}

export function curlExample(endpoint: ApiEndpoint, token?: string): string {
  const url = fullUrl(endpoint.path.replace(/\{[^}]+\}/g, "example-id"));
  const headers: string[] = [];

  if (endpoint.auth === "jwt" || endpoint.auth === "jwt_or_api_key") {
    headers.push(`  -H "Authorization: Bearer ${token || "<access_token>"}"`);
  }
  if (endpoint.auth === "jwt_or_api_key" || endpoint.auth === "api_key") {
    headers.push(`  -H "x-api-key: ocr_<your_key>"`);
  }
  if (endpoint.auth === "platform_key") {
    headers.push(`  -H "Authorization: Bearer <PLATFORM_API_KEY>"`);
  }
  if (endpoint.method === "POST" || endpoint.method === "PATCH") {
    if (endpoint.path.includes("upload") || endpoint.path.includes("documents") && endpoint.method === "POST") {
      return `curl -X ${endpoint.method} "${url}" \\\n${headers.join(" \\\n")} \\\n  -F "file=@document.pdf"`;
    }
    headers.push(`  -H "Content-Type: application/json"`);
    return `curl -X ${endpoint.method} "${url}" \\\n${headers.join(" \\\n")} \\\n  -d '{}'`;
  }
  return `curl -X ${endpoint.method} "${url}"${headers.length ? ` \\\n${headers.join(" \\\n")}` : ""}`;
}

export { API_ROOT, API_V1_URL, API_V2_URL, INTERNAL_API_URL };
