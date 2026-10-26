"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/learn", label: "Path" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-md bg-amber font-mono text-sm text-ink">
            &gt;_
          </span>
          <span className="font-serif text-xl tracking-tight">Aterx</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-paper">
              {link.label}
            </Link>
          ))}
          <Link href="/learn/navigate" className="rounded-full bg-amber px-4 py-2 font-medium text-ink hover:bg-amber-2">
            Start lab
          </Link>
        </nav>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-line md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-3 text-sm hover:bg-ink-3"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/learn/navigate"
            className="mt-1 rounded-full bg-amber px-4 py-3 text-center text-sm font-medium text-ink"
            onClick={() => setOpen(false)}
          >
            Start lab
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
