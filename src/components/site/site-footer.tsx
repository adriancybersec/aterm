import Link from "next/link";
import { Logo } from "@/components/site/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Logo />
          <p>Commands stay in the browser.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/learn" className="hover:text-amber">
            lessons
          </Link>
          <Link href="/about" className="hover:text-amber">
            about
          </Link>
          <Link href="/pricing" className="hover:text-amber">
            plans
          </Link>
          <Link href="/sandbox" className="hover:text-amber">
            sandbox
          </Link>
        </div>
      </div>
    </footer>
  );
}
