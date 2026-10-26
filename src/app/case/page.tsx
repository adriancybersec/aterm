import type { Metadata } from "next";
import { CaseLab } from "@/components/case/case-lab";

export const metadata: Metadata = {
  title: "Case",
  description:
    "Generate a Brightwater Office log and find the odd address and the website that is not on the list. Addresses and websites change each time.",
};

export default function CasePage() {
  return <CaseLab />;
}
