export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
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
  selected_engine_name?: string;
  demo_tier: string;
}

export interface ResponseMeta {
  rag_mode: "mock" | "vector";
  llm_mode: "llm" | "scripted";
  rag_chunk_count: number;
  rag_sources: string[];
  indexed_chunks: number;
}

export interface AdvisorCapabilities {
  rag_mode: "mock" | "vector";
  llm_mode: "llm" | "scripted";
  indexed_chunks: number;
  use_mock_rag: boolean;
  llm_provider: string;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  detail?: string | { msg: string }[];
  request_id?: string;
  details?: unknown;
}

export interface AdvisorSession {
  id: string;
  phase: string;
  document_id: string | null;
  demo_run_count: number;
  recommendation?: Recommendation | null;
}

export interface AdvisorDocument {
  id: string;
  filename: string;
  content_type: string;
  fingerprint: Record<string, unknown>;
  page_count: number;
  preview_url?: string | null;
}

export interface DemoRunResult {
  job_id: string;
  status: string;
  request_id?: string;
  created_at?: string;
}

export interface DemoJobResult {
  job_id: string;
  status: string;
  text?: string | null;
  layout?: Record<string, unknown> | null;
  confidence?: number | null;
  timing_ms?: number | null;
  error?: string | null;
}

export interface ServiceStatus {
  version: string;
  uptime_seconds: number;
  models: {
    vlm: boolean;
    paddle: boolean;
    got: boolean;
    qianfan: boolean;
    infinity_parser: boolean;
  };
  degraded: {
    database: boolean;
    redis: boolean;
  };
}

export interface HealthResponse {
  status: string;
}

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ModelInfo {
  slug: string;
  display_name: string;
  type: string;
  adapter_type?: string;
  capability_tags?: string[];
}

export interface OcrJob {
  id: string;
  status: string;
  job_type: string;
  pages_processed: number;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
  request_id?: string | null;
  created_at?: string | null;
}

export interface UsageStats {
  quota_used: number;
  quota_limit: number;
  tier_name: string | null;
  jobs_this_month: number;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
}

export interface TestingModel {
  slug: string;
  display_name: string;
  type: "ocr" | "vlm" | "paddle_ocr" | "qianfan_ocr" | "got_ocr" | "infinity_parser";
  adapter_type: string;
  capability_tags: string[];
}

export interface TestingResult {
  model_slug: string;
  model_name: string;
  model_type: "ocr" | "vlm" | "paddle_ocr" | "qianfan_ocr" | "got_ocr" | "infinity_parser";
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
    task_type?: string;
    ocr_type?: string;
    output_format?: string;
  };
}

export interface V2Envelope<T = unknown> {
  object: string;
  id: string | null;
  created_at: string;
  request_id: string;
  data: T;
}

export interface EngineHealth {
  status: string;
  model_loaded?: boolean;
  device?: string;
}

export interface OcrEngineResult {
  text: string;
  confidence?: number;
  timing_ms?: number;
  layout?: Record<string, unknown>;
  pages?: Array<{ page_number: number; text: string; processing_time_ms: number }>;
}

export interface PlatformStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  regular_users: number;
  super_admins: number;
  platform_users: number;
  direct_users: number;
  signups_last_7_days: number;
  jobs_last_24h: number;
  queued_jobs: number;
  running_jobs: number;
  failed_jobs_24h: number;
  pages_this_month: number;
  users_by_tier: Record<string, { name: string; count: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_platform_user: boolean;
  created_at: string;
  tier: {
    slug: string;
    name: string;
    quota_used: number;
    quota_limit: number;
  } | null;
  api_key_count: number;
  jobs_this_month: number;
  last_active: string | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_platform_user: boolean;
  platform_account_id: string | null;
  created_at: string;
  subscription: {
    tier_slug: string | null;
    tier_name: string | null;
    quota_used: number;
    quota_limit: number;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  } | null;
  api_keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    is_active: boolean;
    last_used_at: string | null;
    created_at: string;
  }>;
  recent_jobs: Array<{
    id: string;
    status: string;
    job_type: string;
    pages_processed: number;
    compute_seconds: number;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
  }>;
  usage_stats: {
    jobs_this_month: number;
    pages_this_month: number;
    total_compute_seconds: number;
  };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
