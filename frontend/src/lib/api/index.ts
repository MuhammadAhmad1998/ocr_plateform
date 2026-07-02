import { v1 } from "./v1";
import { v2 } from "./v2";

/**
 * Unified API client — v1 methods at top level + namespaced v2.
 * Uses Object.assign so new v1 methods are always visible (spread snapshot breaks HMR).
 */
export const api = Object.assign(v1, { v2 });

export { v1, v2 };

export * from "./config";
export * from "./client";
export * from "./types";
export * from "./catalog";
export * from "./public-catalog";
export { streamMessage } from "./stream";

export function formatEngineName(recommendation: {
  selected_engine_name?: string;
  selected_engine: string;
}): string {
  if (recommendation.selected_engine_name) return recommendation.selected_engine_name;
  return recommendation.selected_engine
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
