import type { Metadata } from "next";
import { PathBoard } from "@/components/lesson/path-board";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Lessons",
  description: "Linux labs for files, permissions, and search. Tasks are marked from the terminal.",
};

export default function LearnPage() {
  return (
    <>
      <PathBoard />
      <SiteFooter />
    </>
  );
}
