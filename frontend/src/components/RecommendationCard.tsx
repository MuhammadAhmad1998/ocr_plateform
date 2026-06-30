import { formatEngineName, type Recommendation } from "@/lib/api";
import { iconBox, rh } from "@/lib/remote-hub";
import { TIER_NAMES } from "@/lib/utils";
import { CheckCircle2, Cpu, Crown, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const engineName = formatEngineName(recommendation);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className={iconBox("sm")}>
          <Sparkles className="size-4" />
        </div>
        <h3 className={cn(rh.h2, "text-base")}>Your matched plan</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* PRIMARY (HERO) */}
        <div className={cn(rh.card, "border-2 border-border p-6")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-primary-foreground">
                <Crown className="size-3" />
                Recommended
              </span>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-3 fill-muted-foreground text-muted-foreground" />
                ))}
              </div>
            </div>

            <div>
              <p className={rh.priceValue}>{TIER_NAMES[recommendation.primary_tier]}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                <Cpu className="size-3" />
                {engineName}
              </div>
            </div>

            <ul className="space-y-2.5 pt-1">
              {recommendation.primary_reasons.map((r) => (
                <li
                  key={r}
                  className={cn("flex items-start gap-2.5", rh.body, "text-foreground/90")}
                >
                  <div className={rh.checkWrap}>
                    <CheckCircle2 className={rh.checkIcon} />
                  </div>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ALTERNATIVE */}
        <div className={cn(rh.card, "p-6")}>
          <div className="space-y-4">
            <span className={rh.badge}>Alternative</span>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {TIER_NAMES[recommendation.alternative_tier]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Consider this if requirements change
              </p>
            </div>
            <ul className="space-y-2 pt-1">
              {recommendation.alternative_reasons.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
