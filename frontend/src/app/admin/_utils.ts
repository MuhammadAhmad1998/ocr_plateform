import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

export type TierOption = {
  slug: string;
  name: string;
  count?: number;
};

/** Tier slugs seeded in ocr_platform/app/seed.py — used as fallback when stats are unavailable. */
export const DEFAULT_TIER_OPTIONS: TierOption[] = [
  { slug: "free", name: "Starter" },
  { slug: "basic", name: "Essential" },
  { slug: "pro", name: "Professional" },
  { slug: "enterprise", name: "Enterprise" },
];

export async function fetchAdminTierOptions(): Promise<TierOption[]> {
  try {
    const stats = await api.getPlatformStats();
    const fromStats = Object.entries(stats.users_by_tier).map(([slug, data]) => ({
      slug,
      name: data.name,
      count: data.count,
    }));
    if (fromStats.length > 0) return fromStats;
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_TIER_OPTIONS;
}

export function adminErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
