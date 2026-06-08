import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIER_NAMES: Record<string, string> = {
  free: "Starter",
  basic: "Essential",
  pro: "Professional",
  enterprise: "Enterprise",
};

export const TIER_PRICES: Record<string, string> = {
  free: "Free",
  basic: "$29/mo",
  pro: "$99/mo",
  enterprise: "Custom",
};
