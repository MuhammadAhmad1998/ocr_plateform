import { API_ROOT, API_V1_URL, API_V2_URL } from "./config";
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody, fallback = "Request failed") {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.detail === "string" && body.detail) ||
      fallback;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error || "HTTP_ERROR";
    this.requestId = body.request_id;
    this.details = body.details ?? (Array.isArray(body.detail) ? body.detail : undefined);
  }
}

export async function parseApiError(res: Response, fallback = "Request failed"): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  return new ApiError(res.status, body, fallback);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function base64UrlDecode(input: string): string {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad === 2) normalized += "==";
  else if (pad === 3) normalized += "=";
  else if (pad !== 0) throw new Error("Invalid base64url");
  return atob(normalized);
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return true;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** True only when a non-expired access token is stored locally. */
export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearTokens();
    return false;
  }
  return true;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("api_key");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function setApiKey(key: string) {
  localStorage.setItem("api_key", key);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function clearApiKey() {
  localStorage.removeItem("api_key");
}

type FetchOptions = RequestInit & {
  baseUrl?: string;
  apiKey?: string | null;
  skipAuthRedirect?: boolean;
  noAuth?: boolean;
};

async function request(url: string, options: FetchOptions = {}) {
  const { baseUrl = API_V1_URL, apiKey, skipAuthRedirect, noAuth, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (!noAuth) {
    const token = getToken();
    const key = apiKey ?? getApiKey();
    // Dashboard/advisor routes require JWT; only send API key when explicitly requested
    // or when no JWT is available (production OCR integrations).
    if (key && !token) {
      headers["x-api-key"] = key;
    } else if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (key) {
      headers["x-api-key"] = key;
    }
  }

  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${url}`, { ...init, headers });
  } catch {
    throw new ApiError(0, { error: "NETWORK_ERROR", message: "Network error. Check your connection." });
  }

  if (res.status === 401 && !skipAuthRedirect) {
    clearTokens();
    if (typeof window !== "undefined" && !url.startsWith("/auth/")) {
      window.location.href = "/login";
    }
    throw await parseApiError(res, "Unauthorized");
  }
  if (!res.ok) {
    throw await parseApiError(res);
  }
  return res;
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  return request(path, options);
}

export async function fetchPublic(path: string, options: RequestInit = {}) {
  return request(path, { ...options, skipAuthRedirect: true, noAuth: true });
}

export async function fetchV2(path: string, options: RequestInit = {}) {
  return request(path, { ...options, baseUrl: API_V2_URL });
}

export async function fetchRoot(path: string, options: RequestInit = {}) {
  return request(path, { ...options, baseUrl: API_ROOT, skipAuthRedirect: true, noAuth: true });
}

export async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
