"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = {
  id: string;
  label: string;
  description?: string;
};

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: {
  steps: WizardStep[];
  currentStep: number;
  /** Optional handler. If provided, completed/past steps become clickable. */
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = !!onStepClick && index <= currentStep && index !== currentStep;

          const inner = (
            <div className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-all",
                  isComplete && "border-primary bg-primary text-primary-foreground shadow-sm",
                  isCurrent &&
                    "border-accent bg-accent/10 text-accent ring-4 ring-accent/15",
                  !isComplete && !isCurrent && "border-border bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isCurrent || isComplete ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="hidden text-xs leading-snug text-muted-foreground lg:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`Go back to ${step.label}`}
                >
                  {inner}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-2.5">{inner}</div>
              )}
              {index < steps.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    "mx-3 mt-4 hidden h-px min-w-4 flex-1 lg:block",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
