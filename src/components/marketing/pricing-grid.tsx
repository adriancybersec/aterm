"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, planName, type PlanId } from "@/lib/plans";
import { useAccount } from "@/lib/progress/use-account";
import { loadAccount, saveAccount } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

export function PricingGrid({ mode = "select" }: { mode?: "select" | "link" }) {
  const router = useRouter();
  const current = useAccount().plan;

  function choose(plan: PlanId) {
    const account = loadAccount();
    saveAccount({ ...account, plan });
    if (mode === "select") router.push("/learn");
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const active = current === plan.id;
          return (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-5",
                plan.highlighted ? "border-amber bg-ink-2" : "border-line bg-ink/40",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl">{plan.name}</h3>
                {active ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mint">On this device</span> : null}
              </div>
              <p className="mt-3 flex items-end gap-2">
                <span className="font-serif text-4xl tracking-tight">{plan.price}</span>
                {plan.period ? <span className="pb-1 text-sm text-muted">{plan.period}</span> : null}
              </p>
              <p className="mt-3 min-h-12 text-sm leading-6 text-muted">{plan.blurb}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                onClick={() => choose(plan.id)}
              >
                {active ? `Keep ${planName(plan.id)}` : `Use ${plan.name} on this device`}
              </Button>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-sm leading-6 text-faint">
        Example student pricing in AUD. Choosing a plan only updates this browser. Aterx does not take payment in this build.
      </p>
    </div>
  );
}
