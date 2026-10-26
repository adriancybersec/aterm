import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>aterx · commands stay in the browser</p>
        <div className="flex gap-4">
          <Link href="/learn" className="hover:text-amber">
            path
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
