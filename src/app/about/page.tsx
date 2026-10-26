import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: "Aterx is a browser Linux lab for first and second year cyber and IT students.",
};

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-faint">ABOUT</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-paper">About Aterx</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-muted">
          <p>
            Aterx is a Linux lab for first and second year cyber security and IT students. You learn the commands by typing them: list a folder, move around, read a file, set permissions, search a log.
          </p>
          <p>
            The terminal looks like a shell and behaves like a small one. It runs in this browser. Commands stay in the tab. They never touch the computer you are sitting at, and nothing is sent to a server.
          </p>
          <p>
            Five lessons are live. Free covers the first two. Pro opens the rest. Plus shows the worked command. Your plan and ticks stay on this device.
          </p>
          <p>
            Case is a practice log for Brightwater Office. Each line is an IP address and what that person did. You finish with the log lines, a short finding, and a resume note you can copy. A new case changes the questions, the IP addresses, which ones look wrong, and the website names.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-6 text-sm">
          <Link href="/learn" className="text-amber hover:text-amber-2">
            [ lessons ]
          </Link>
          <Link href="/learn/navigate" className="text-muted hover:text-paper">
            [ start lesson 1 ]
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
