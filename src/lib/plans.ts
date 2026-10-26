export type PlanId = "free" | "pro" | "plus";

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  plus: 2,
};

export function planAllows(have: PlanId, need: PlanId): boolean {
  return PLAN_RANK[have] >= PLAN_RANK[need];
}

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    blurb: "The first two labs, on this device.",
    features: [
      "Lessons 1 and 2",
      "Hints and the cheat sheet",
      "Progress saved in this browser",
      "Open sandbox, home preset",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "AUD / month",
    blurb: "The full first-year path, without the answer key.",
    features: [
      "All five lessons",
      "Hints and cheat sheets",
      "Open sandbox",
      "Progress across the path",
    ],
    highlighted: true,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$16",
    period: "AUD / month",
    blurb: "For the moment you want the worked command.",
    features: [
      "Everything in Pro",
      "Solution reveals",
      "Log shelf and permissions presets",
      "Lab notes you can copy",
    ],
  },
];

export function planName(id: PlanId): string {
  return PLANS.find((plan) => plan.id === id)?.name ?? id;
}
