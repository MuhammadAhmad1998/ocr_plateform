"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "advisor-onboarding-complete";

type AdvisorOnboardingTourProps = {
  ready: boolean;
  active: boolean;
};

export function hasCompletedAdvisorOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markAdvisorOnboardingComplete(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function AdvisorOnboardingTour({ ready, active }: AdvisorOnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!ready || !active || hasCompletedAdvisorOnboarding()) return;

    const timer = window.setTimeout(() => {
      const chatInput = document.querySelector("#advisor-chat-input");
      const chatCard = document.querySelector("#advisor-chat-card");
      if (!chatInput || !chatCard) return;

      const driverObj = driver({
        animate: true,
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Start chatting",
        popoverClass: "advisor-tour-popover",
        stagePadding: 10,
        stageRadius: 12,
        overlayOpacity: 0.55,
        allowClose: true,
        steps: [
          {
            popover: {
              title: "Welcome to OCR Advisor",
              description:
                "We'll help you find the right OCR tier for your documents. This quick tour shows where to begin.",
              side: "over",
              align: "center",
              showButtons: ["next", "close"],
            },
          },
          {
            element: "#advisor-wizard-stepper",
            popover: {
              title: "A simple 3-step flow",
              description:
                "Discuss your needs, review a tier recommendation, then try a live demo on your own document.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#advisor-chat-card",
            popover: {
              title: "Chat with the advisor",
              description:
                "Tell us about your document types, monthly volume, and accuracy needs. The more detail you share, the better the match.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#advisor-chat-input",
            popover: {
              title: "Start here",
              description:
                "Type your first message below and press Enter or the send button. Try mentioning tables, handwriting, or equations if they apply.",
              side: "top",
              align: "center",
            },
          },
        ],
        onPopoverRender: (popover) => {
          const title = popover.title;
          if (!title || title.querySelector(".advisor-tour-icon")) return;

          if (title.textContent === "Welcome to OCR Advisor") {
            title.insertAdjacentHTML(
              "afterbegin",
              `<span class="advisor-tour-icon" aria-hidden="true">✨</span>`
            );
          } else if (title.textContent === "Start here") {
            title.insertAdjacentHTML(
              "afterbegin",
              `<span class="advisor-tour-icon" aria-hidden="true">💬</span>`
            );
          }
        },
        onDestroyed: () => {
          markAdvisorOnboardingComplete();
          driverRef.current = null;
          window.requestAnimationFrame(() => {
            (chatInput as HTMLInputElement).focus({ preventScroll: true });
          });
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 400);

    return () => {
      window.clearTimeout(timer);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [ready, active]);

  return null;
}
