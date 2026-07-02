import { formatEngineName, type Recommendation } from "@/lib/api";
import { TIER_NAMES } from "@/lib/utils";
import { CheckCircle2, Cpu, Crown, Sparkles, Star } from "lucide-react";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const engineName = formatEngineName(recommendation);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{
            background: "rgb(var(--teal-bg))",
            border: "0.5px solid rgb(var(--teal-border))",
            color: "rgb(var(--teal))",
          }}
        >
          <Sparkles className="size-4" />
        </div>
        <h3 className="text-base font-bold" style={{ color: "rgb(var(--text-1))" }}>
          Your matched plan
        </h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* PRIMARY (HERO) */}
        <div
          className="relative overflow-hidden rounded-3xl p-6"
          style={{
            border: "1px solid rgb(var(--teal-border))",
            background: "rgb(var(--teal-bg))",
          }}
        >
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgb(var(--amber))",
                  color: "rgb(var(--amber-ink))",
                }}
              >
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
              <p
                className="text-4xl font-extrabold tracking-tight"
                style={{ color: "rgb(var(--teal))" }}
              >
                {TIER_NAMES[recommendation.primary_tier]}
              </p>
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  border: "0.5px solid rgb(var(--teal-border))",
                  background: "rgb(var(--surface-1))",
                  color: "rgb(var(--teal))",
                }}
              >
                <Cpu className="size-3" />
                {engineName}
              </div>
            </div>

            <ul className="space-y-2.5 pt-1">
              {recommendation.primary_reasons.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2.5 text-sm leading-relaxed"
                  style={{ color: "rgb(var(--text-1))" }}
                >
                  <div
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgb(var(--teal))",
                      color: "rgb(var(--primary-foreground))",
                    }}
                  >
                    <CheckCircle2 className="size-3" />
                  </div>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ALTERNATIVE */}
        <div
          className="relative rounded-3xl p-6"
          style={{
            border: "0.5px solid rgb(var(--border))",
            background: "rgb(var(--surface-1))",
          }}
        >
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "rgb(var(--surface-2))",
                color: "rgb(var(--text-2))",
              }}
            >
              Alternative
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>
                {TIER_NAMES[recommendation.alternative_tier]}
              </p>
              <p className="mt-1 text-xs" style={{ color: "rgb(var(--text-2))" }}>
                Consider this if requirements change
              </p>
            </div>
            <ul className="space-y-2 pt-1">
              {recommendation.alternative_reasons.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 text-xs leading-relaxed"
                  style={{ color: "rgb(var(--text-2))" }}
                >
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0" style={{ color: "rgb(var(--text-3))" }} />
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
