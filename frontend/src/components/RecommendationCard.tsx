import { formatEngineName, type Recommendation } from "@/lib/api";
import { TIER_NAMES } from "@/lib/utils";
import { CheckCircle2, Cpu, Crown, Sparkles, Star } from "lucide-react";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const engineName = formatEngineName(recommendation);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
          <Sparkles className="size-4" />
        </div>
        <h3 className="text-base font-bold text-foreground">Your matched plan</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* PRIMARY (HERO) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-cyan-500/8 to-indigo-500/10 p-6 shadow-xl">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 size-40 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                <Crown className="size-3" />
                Recommended
              </div>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="size-3 fill-amber-400 text-amber-400 drop-shadow-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="bg-gradient-to-br from-emerald-600 via-cyan-600 to-indigo-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-emerald-300 dark:via-cyan-300 dark:to-indigo-300">
                {TIER_NAMES[recommendation.primary_tier]}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Cpu className="size-3" />
                {engineName}
              </div>
            </div>

            <ul className="space-y-2.5 pt-1">
              {recommendation.primary_reasons.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ALTERNATIVE */}
        <div className="relative rounded-3xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Alternative
            </div>
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
