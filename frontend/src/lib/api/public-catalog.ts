import { API_ROOT } from "./config";
import type { ApiEndpoint, AuthType, HttpMethod } from "./catalog";

/** Customer-facing endpoints only — no internal, engine, sandbox, or web-app routes. */
export const PUBLIC_API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "status",
    tag: "status",
    method: "GET",
    path: "/api/v1/status/",
    summary: "Service status",
    description: "Returns platform version, uptime, and enabled model families. No authentication required.",
    auth: "none",
    version: "v1",
  },
  {
    id: "v2-models",
    tag: "models",
    method: "GET",
    path: "/api/v2/models/",
    summary: "List models",
    description: "Catalog of OCR tiers and engines available for job submission.",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "v2-doc-create",
    tag: "documents",
    method: "POST",
    path: "/api/v2/documents/",
    summary: "Upload document",
    description: "Upload a PDF or image. Returns a prefixed document id (`doc_…`).",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "v2-doc-list",
    tag: "documents",
    method: "GET",
    path: "/api/v2/documents/",
    summary: "List documents",
    description: "Paginated list of documents uploaded by your account.",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "v2-doc-get",
    tag: "documents",
    method: "GET",
    path: "/api/v2/documents/{document_id}/",
    summary: "Retrieve document",
    description: "Metadata for a single document by id or prefixed `doc_` id.",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "v2-ocr-submit",
    tag: "jobs",
    method: "POST",
    path: "/api/v2/ocr/jobs/",
    summary: "Create OCR job",
    description: "Submit asynchronous OCR processing. Requires `ocr:write` scope. Returns `job_…` id.",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "v2-ocr-get",
    tag: "jobs",
    method: "GET",
    path: "/api/v2/ocr/jobs/{job_id}/",
    summary: "Retrieve OCR job",
    description: "Poll job status and fetch results when complete. Requires `ocr:read` scope.",
    auth: "api_key",
    version: "v2",
  },
  {
    id: "dash-keys-create",
    tag: "account",
    method: "POST",
    path: "/api/v1/dashboard/api-keys/",
    summary: "Create API key",
    description: "Generate a new API key. The full key is returned once — store it securely. JWT required.",
    auth: "jwt",
    version: "v1",
  },
  {
    id: "dash-keys-list",
    tag: "account",
    method: "GET",
    path: "/api/v1/dashboard/api-keys/",
    summary: "List API keys",
    description: "List active and revoked keys (prefix only, never the secret). JWT required.",
    auth: "jwt",
    version: "v1",
  },
  {
    id: "dash-keys-revoke",
    tag: "account",
    method: "POST",
    path: "/api/v1/dashboard/api-keys/{key_id}/revoke/",
    summary: "Revoke API key",
    description: "Immediately invalidate an API key. JWT required.",
    auth: "jwt",
    version: "v1",
  },
  {
    id: "dash-usage",
    tag: "account",
    method: "GET",
    path: "/api/v1/dashboard/usage/",
    summary: "Usage & quota",
    description: "Current plan, quota consumed, and jobs this billing period. JWT required.",
    auth: "jwt",
    version: "v1",
  },
  {
    id: "dash-jobs",
    tag: "account",
    method: "GET",
    path: "/api/v1/dashboard/jobs/",
    summary: "Job history",
    description: "Recent OCR jobs for your account. JWT required.",
    auth: "jwt",
    version: "v1",
  },
];

export interface PublicDocSection {
  id: string;
  label: string;
  description: string;
  tags: string[];
}

export const PUBLIC_DOC_SECTIONS: PublicDocSection[] = [
  {
    id: "models",
    label: "Models",
    description: "Discover available OCR tiers before submitting jobs.",
    tags: ["models"],
  },
  {
    id: "documents",
    label: "Documents",
    description: "Upload and manage source files for OCR processing.",
    tags: ["documents"],
  },
  {
    id: "jobs",
    label: "OCR Jobs",
    description: "Submit jobs asynchronously and poll for structured results.",
    tags: ["jobs"],
  },
  {
    id: "account",
    label: "Account",
    description: "Manage API keys, usage, and job history (dashboard / JWT).",
    tags: ["account"],
  },
  {
    id: "status",
    label: "Status",
    description: "Platform health and availability.",
    tags: ["status"],
  },
];

export const PUBLIC_DOC_NAV = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "responses", label: "Responses" },
  { id: "reference", label: "API Reference" },
] as const;

export type PublicDocNavId = (typeof PUBLIC_DOC_NAV)[number]["id"];

const AUTH_LABELS: Record<AuthType, string> = {
  none: "No auth",
  jwt: "Bearer token",
  api_key: "API key",
  jwt_or_api_key: "API key or Bearer",
  platform_key: "Platform key",
  stripe: "Stripe signature",
};

export function publicAuthLabel(auth: AuthType): string {
  return AUTH_LABELS[auth];
}

export function publicCurlExample(endpoint: ApiEndpoint): string {
  const url = `${API_ROOT}${endpoint.path.replace(/\{[^}]+\}/g, "example_id")}`;
  const lines: string[] = [`curl -X ${endpoint.method} "${url}"`];

  if (endpoint.auth === "api_key") {
    lines.push('  -H "x-api-key: $PLANET_OCR_API_KEY"');
  } else if (endpoint.auth === "jwt") {
    lines.push('  -H "Authorization: Bearer $PLANET_OCR_ACCESS_TOKEN"');
  }

  if (endpoint.method === "POST" && endpoint.path.includes("/documents/")) {
    lines.push('  -F "file=@./document.pdf"');
    return lines.join(" \\\n");
  }

  if (endpoint.method === "POST" && endpoint.path.includes("/ocr/jobs/")) {
    lines.push('  -H "Content-Type: application/json"');
    lines.push(`  -d '{"document_id": "doc_example", "tier_slug": "basic"}'`);
    return lines.join(" \\\n");
  }

  if (endpoint.method === "POST" && endpoint.path.includes("/api-keys/")) {
    lines.push('  -H "Content-Type: application/json"');
    return lines.join(" \\\n");
  }

  return lines.join(" \\\n");
}

export const QUICKSTART_STEPS = [
  {
    title: "Create an API key",
    body: "Sign in and open the Dashboard to generate a key. Keys start with `ocr_` and are shown only once.",
    href: "/dashboard",
    hrefLabel: "Open Dashboard",
  },
  {
    title: "Upload a document",
    body: "POST your file to `/api/v2/documents/`. Save the returned `doc_…` id.",
    code: `curl -X POST "${API_ROOT}/api/v2/documents/" \\
  -H "x-api-key: $PLANET_OCR_API_KEY" \\
  -F "file=@./invoice.pdf"`,
  },
  {
    title: "Submit an OCR job",
    body: "Reference the document id and optional tier slug. Processing is asynchronous.",
    code: `curl -X POST "${API_ROOT}/api/v2/ocr/jobs/" \\
  -H "x-api-key: $PLANET_OCR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"document_id": "doc_…", "tier_slug": "basic"}'`,
  },
  {
    title: "Poll for results",
    body: "GET the job until `status` is `completed`. Results include extracted text and layout.",
    code: `curl "${API_ROOT}/api/v2/ocr/jobs/job_…/" \\
  -H "x-api-key: $PLANET_OCR_API_KEY"`,
  },
] as const;

export const ENVELOPE_EXAMPLE = `{
  "object": "ocr_job",
  "id": "job_660e8400-e29b-41d4-a716-446655440001",
  "created_at": "2026-06-12T10:00:00+00:00",
  "request_id": "abc123def456",
  "data": {
    "status": "completed",
    "pages_processed": 2,
    "result": { "text": "…", "layout": {} }
  }
}`;

export const ERROR_EXAMPLE = `{
  "error": "QUOTA_EXCEEDED",
  "message": "Monthly page quota exceeded",
  "request_id": "abc123def456"
}`;

export { API_ROOT };
