import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Account",
  description: "Local name, plan, and lesson progress for Aterx. Stored in this browser only.",
};

export default function AccountPage() {
  return (
    <>
      <AccountPanel />
      <SiteFooter />
    </>
  );
}
