import Link from "next/link";
import { HeroSession } from "@/components/marketing/hero-session";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { lessons } from "@/lib/lessons/catalog";

const steps = [
  {
    number: "01",
    title: "A goal, not a chapter",
    body: "Each lab opens with one or two sentences and a folder that is already laid out.",
  },
  {
    number: "02",
    title: "You type the command",
    body: "The terminal is xterm.js. ls, pipes, chmod, and grep run against a virtual filesystem.",
  },
  {
    number: "03",
    title: "The lab marks it",
    body: "A task ticks when the output or the filesystem matches. Hints sit beside the work.",
  },
];

export default function HomePage() {
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
              For first and second year cyber and IT
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">
              Learn the shell by typing it.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              Aterx is a browser lab for university Linux classes. Short tasks, a terminal that answers back, and a cheat sheet that stays in view.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/learn/navigate"
                className="inline-flex h-12 items-center justify-center rounded-full bg-amber px-5 text-sm font-medium text-ink hover:bg-amber-2"
              >
                Start lesson 1
              </Link>
              <Link
                href="/learn"
                className="inline-flex h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-medium hover:bg-ink-3"
              >
                See the path
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Lessons</dt>
                <dd className="mt-1 font-serif text-2xl">{lessons.length}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Time</dt>
                <dd className="mt-1 font-serif text-2xl">{minutes} min</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Install</dt>
                <dd className="mt-1 font-serif text-2xl">None</dd>
              </div>
            </dl>
          </div>
          <HeroSession />
        </section>

        <section className="border-y border-line bg-ink-2/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number}>
                <p className="font-mono text-xs text-amber">{step.number}</p>
                <h2 className="mt-2 font-serif text-2xl tracking-tight">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">The path</p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">Start with the directory you are in.</h2>
            </div>
            <Link href="/learn" className="hidden text-sm text-muted hover:text-paper sm:inline">
              Open the path →
            </Link>
          </div>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={`/learn/${lesson.slug}`} className="grid gap-2 py-4 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline">
                  <span className="font-mono text-sm text-amber">{String(lesson.number).padStart(2, "0")}</span>
                  <span>
                    <span className="font-serif text-2xl">{lesson.title}</span>
                    <span className="mt-1 block text-sm text-muted">{lesson.goal}</span>
                  </span>
                  <span className="font-mono text-xs text-faint">{lesson.minPlan === "free" ? "Free" : "Pro"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Sandbox</p>
            <h2 className="mt-2 font-serif text-4xl tracking-tight">Nothing you type leaves the tab.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Aterx does not run a Linux kernel and does not shell out on the server. Keystrokes go to an in-browser shell. That shell only knows a fixed list of commands, and those commands only see an in-memory filesystem. <code className="font-mono text-paper">curl</code>, compilers, and anything else come back as command not found.
            </p>
            <Link href="/sandbox" className="mt-6 inline-flex text-sm text-amber hover:text-amber-2">
              Open the sandbox →
            </Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["Browser", "xterm.js draws the screen. It does not execute the line."],
              ["Aterx shell", "Parses quotes, pipes, and redirects, then calls a built-in."],
              ["Virtual files", "Permissions, owners, and paths live in memory for this tab."],
            ].map(([title, body]) => (
              <li key={title} className="rounded-2xl border border-line px-4 py-4">
                <p className="font-serif text-xl">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" id="pricing">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Plans</p>
          <h2 className="mt-2 max-w-xl font-serif text-4xl tracking-tight">Free to start. Pro for the full path. Plus when you want the worked command.</h2>
          <div className="mt-8">
            <PricingGrid />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
