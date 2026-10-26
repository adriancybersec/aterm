import Link from "next/link";
import { HeroSession } from "@/components/marketing/hero-session";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { lessons } from "@/lib/lessons/catalog";

export default function HomePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section className="grid items-end gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div>
            <p className="text-xs tracking-[0.22em] text-faint">LINUX LAB</p>
            <h1 className="mt-4 text-4xl font-medium leading-tight tracking-tight text-paper sm:text-5xl">Type the command.</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">
              Short labs for first and second year cyber students. A folder, a few tasks, and a terminal that marks the work.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Link href="/learn/navigate" className="text-amber hover:text-amber-2">
                [ start lesson 1 ]
              </Link>
              <Link href="/learn" className="text-muted hover:text-paper">
                [ lessons ]
              </Link>
              <Link href="/case" className="text-muted hover:text-paper">
                [ case ]
              </Link>
            </div>
          </div>
          <HeroSession />
        </section>

        <section className="border-t border-line py-10">
          <p className="text-xs tracking-[0.22em] text-faint">LESSONS</p>
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={`/learn/${lesson.slug}`} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-3 hover:text-amber">
                  <span className="text-faint">{String(lesson.number).padStart(2, "0")}</span>
                  <span>{lesson.title}</span>
                  <span className="text-xs text-faint">{lesson.minPlan}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line py-12" id="pricing">
          <p className="text-xs tracking-[0.22em] text-faint">PLANS</p>
          <h2 className="mt-3 text-2xl text-paper">Free, Pro, Plus. Nothing is charged.</h2>
          <div className="mt-6">
            <PricingGrid />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
