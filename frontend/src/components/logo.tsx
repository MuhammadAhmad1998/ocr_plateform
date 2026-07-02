"use client";

import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/* =====================================================================
   Planet OCR logo system
   ===================================================================== */

function PlanetOcrMark({
  size = 28,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const globeGrad = `pocr-globe-${uid}`;
  const ringGrad = `pocr-ring-${uid}`;
  const clipId = `pocr-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={globeGrad} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#6EE4E1" />
          <stop offset="45%" stopColor="#1FB8B5" />
          <stop offset="100%" stopColor="#0A5C5B" />
        </radialGradient>
        <linearGradient id={ringGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8F0EE" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#1FB8B5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1FB8B5" stopOpacity="0.25" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="9" />
        </clipPath>
      </defs>

      {/* Back orbit arc */}
      <g className={animated ? "logo-orbit" : undefined}>
        <ellipse
          cx="16"
          cy="16"
          rx="13.5"
          ry="5"
          stroke={`url(#${ringGrad})`}
          strokeWidth="1.4"
          strokeDasharray="18 24"
          strokeDashoffset="21"
          opacity="0.35"
        />
      </g>

      {/* Globe body */}
      <circle cx="16" cy="16" r="9" fill={`url(#${globeGrad})`} />

      {/* Rotating surface details */}
      <g
        className={animated ? "logo-globe-spin" : undefined}
        clipPath={`url(#${clipId})`}
      >
        <ellipse
          cx="16"
          cy="16"
          rx="9"
          ry="3.2"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.7"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="9"
          ry="5.5"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.6"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="3.5"
          ry="9"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.7"
        />
        <path
          d="M10 14c1.5-1.2 3.5-1.8 6-1.5 2 .2 3.5 1 4.5 2.2M9 18.5c2-1 4.5-1.2 7-.3 2 .7 3.2 1.8 3.8 3"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </g>

      {/* Specular highlight */}
      <circle cx="12.5" cy="12" r="2.8" fill="white" opacity="0.18" />

      {/* Front orbit arc */}
      <g className={animated ? "logo-orbit" : undefined}>
        <ellipse
          cx="16"
          cy="16"
          rx="13.5"
          ry="5"
          stroke={`url(#${ringGrad})`}
          strokeWidth="1.4"
          strokeDasharray="18 24"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  size = "default",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "default" | "lg";
}) {
  const textSizes = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg",
  };
  const iconSizes = { sm: 22, default: 28, lg: 34 };

  return (
    <Link href={href} className={cn("group flex items-center gap-2.5 select-none", className)}>
      <PlanetOcrMark size={iconSizes[size]} />
      <span
        className={cn(
          "font-semibold tracking-[-0.2px] transition-colors group-hover:text-[rgb(var(--teal))]",
          textSizes[size]
        )}
        style={{ color: "rgb(var(--text-1))" }}
      >
        Planet OCR
      </span>
    </Link>
  );
}

export function LogoIcon({
  size = 28,
  className,
  href,
}: {
  size?: number;
  className?: string;
  href?: string;
}) {
  const inner = <PlanetOcrMark size={size} className={className} />;
  if (href) {
    return (
      <Link href={href} className="group" aria-label="Planet OCR home">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function LogoPill({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors select-none",
        "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-1))] text-[rgb(var(--text-1))]",
        "hover:border-[rgb(var(--teal-border))] hover:bg-[rgb(var(--teal-bg))] hover:text-[rgb(var(--teal))]",
        className
      )}
    >
      <PlanetOcrMark size={16} />
      Planet OCR
    </Link>
  );
}

export function LogoHero({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <PlanetOcrMark size={120} />
      <span
        className="text-3xl font-bold tracking-[-0.5px]"
        style={{ color: "rgb(var(--text-1))" }}
      >
        Planet OCR
      </span>
    </div>
  );
}
