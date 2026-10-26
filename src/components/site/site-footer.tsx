import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-serif text-lg text-paper">Aterx</p>
          <p className="mt-1 max-w-md leading-6">
            A practice terminal for first and second year cyber and IT students. Commands stay in the browser.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/learn" className="hover:text-paper">
            Path
          </Link>
          <Link href="/pricing" className="hover:text-paper">
            Pricing
          </Link>
          <Link href="/sandbox" className="hover:text-paper">
            Sandbox
          </Link>
          <Link href="/account" className="hover:text-paper">
            Account
          </Link>
        </div>
      </div>
    </footer>
  );
}
