import { formatEngineName, type Recommendation } from "@/lib/api";
import { TIER_NAMES } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const engineName = formatEngineName(recommendation);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <CardTitle className="text-base">Your recommendation</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Badge className="mb-2 bg-primary text-primary-foreground">Primary</Badge>
          <p className="text-xl font-semibold">{TIER_NAMES[recommendation.primary_tier]}</p>
          <p className="mt-1 text-sm font-medium text-primary">{engineName}</p>
          <ul className="mt-3 space-y-2">
            {recommendation.primary_reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Badge variant="secondary" className="mb-2">
            Alternative
          </Badge>
          <p className="text-xl font-semibold">{TIER_NAMES[recommendation.alternative_tier]}</p>
          <ul className="mt-3 space-y-2">
            {recommendation.alternative_reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
