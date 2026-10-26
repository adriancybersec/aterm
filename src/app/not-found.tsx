import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">404</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">That page is not on the path.</h1>
      <p className="mt-3 text-sm leading-6 text-muted">The lab you asked for is not one of the five lessons.</p>
      <Link href="/learn" className="mt-6 text-sm text-amber hover:text-amber-2">
        Back to the path →
      </Link>
    </main>
  );
}
