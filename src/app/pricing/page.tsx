import type { Metadata } from "next";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free, Pro, and Plus plans for the Aterx Linux lab. Billing is not connected in this build.",
};

export default function PricingPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-faint">PLANS</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-paper">Three plans. One terminal.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
          Free is the first two labs. Pro opens every lesson. Plus shows the worked command and the extra sandbox presets. Pick one on this device to try the gates. No card, no account server.
        </p>
        <div className="mt-8">
          <PricingGrid mode="link" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
