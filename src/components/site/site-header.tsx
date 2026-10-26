"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/site/logo";

const links = [
  { href: "/learn", label: "lessons" },
  { href: "/case", label: "case" },
  { href: "/about", label: "about" },
  { href: "/pricing", label: "plans" },
  { href: "/sandbox", label: "sandbox" },
  { href: "/account", label: "account" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-black">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" onClick={() => setOpen(false)} aria-label="Aterx home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-faint md:flex xl:gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-amber">
              {link.label}
            </Link>
          ))}
          <Link href="/learn/navigate" className="text-amber hover:text-amber-2">
            [ start ]
          </Link>
        </nav>
        <button
          type="button"
          className="h-10 px-2 text-sm text-amber md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "[ close ]" : "[ menu ]"}
        </button>
      </div>
      {open ? (
        <nav className="flex flex-col border-t border-line px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-3 text-sm text-muted hover:text-amber"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/learn/navigate" className="py-3 text-sm text-amber" onClick={() => setOpen(false)}>
            [ start ]
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
