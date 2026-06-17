/** API base URLs — override via NEXT_PUBLIC_API_ROOT (host only, no path). */
export const API_ROOT = process.env.NEXT_PUBLIC_API_ROOT || "http://localhost:8000";

export const API_V1_URL = process.env.NEXT_PUBLIC_API_URL || `${API_ROOT}/api/v1`;
export const API_V2_URL = `${API_ROOT}/api/v2`;
export const INTERNAL_API_URL = `${API_ROOT}/internal/v1`;

/** @deprecated Use API_V1_URL */
export const API_URL = API_V1_URL;
