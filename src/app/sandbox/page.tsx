import type { Metadata } from "next";
import { SandboxLab } from "@/components/sandbox/sandbox-lab";

export const metadata: Metadata = {
  title: "Sandbox",
  description: "An unmarked Aterx terminal. Commands run in a virtual filesystem in your browser.",
};

export default function SandboxPage() {
  return <SandboxLab />;
}
