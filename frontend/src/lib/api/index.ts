import { v1 } from "./v1";
import { v2 } from "./v2";

/** Unified API client — flat v1 methods for backward compatibility + namespaced v2. */
export const api = {
  ...v1,
  v2,
};

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
