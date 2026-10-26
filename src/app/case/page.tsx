import type { Metadata } from "next";
import { CaseLab } from "@/components/case/case-lab";

export const metadata: Metadata = {
  title: "Case",
  description:
    "Read a practice log. Each line is an IP address and what that person did. Find the odd IP and the website that is not allowed.",
};

export default function CasePage() {
  return <CaseLab />;
}
