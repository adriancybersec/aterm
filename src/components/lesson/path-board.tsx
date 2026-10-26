"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lessons, upcomingModules } from "@/lib/lessons/catalog";
import { planAllows, planName } from "@/lib/plans";
import { completedCount } from "@/lib/progress/store";
import { useAccount } from "@/lib/progress/use-account";

export function PathBoard() {
  const account = useAccount();
  const plan = account.plan;
  const total = lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0);
  const done = lessons.reduce(
    (sum, lesson) => sum + completedCount(account, lesson.slug, lesson.tasks.map((task) => task.id)),
    0,
  );
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Lesson path</p>
      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl text-amber">Five labs. Then you keep going.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Each lab is a folder, a short goal, and a handful of tasks. The terminal marks a task when the command or the filesystem matches.
          </p>
        </div>
        <div className="min-w-48">
          <p className="font-mono text-xs text-muted">
            {percent}% · {planName(plan)}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-3" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-amber" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <ol className="mt-8 grid gap-3">
        {lessons.map((lesson) => {
          const taskIds = lesson.tasks.map((task) => task.id);
          const marked = account ? completedCount(account, lesson.slug, taskIds) : 0;
          const open = planAllows(plan, lesson.minPlan);
          return (
            <li key={lesson.slug}>
              <Link
                href={`/learn/${lesson.slug}`}
                className="grid gap-3 rounded-2xl border border-line bg-ink-2/40 px-4 py-4 transition-colors hover:border-amber/50 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-5"
              >
                <span className="font-mono text-sm text-amber">{String(lesson.number).padStart(2, "0")}</span>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-2xl tracking-tight">{lesson.title}</span>
                    <Badge tone={open ? "neutral" : "amber"}>{open ? lesson.module : planName(lesson.minPlan)}</Badge>
                    {!open ? <Lock className="h-3.5 w-3.5 text-amber" aria-label="Locked" /> : null}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{lesson.goal}</span>
                </span>
                <span className="font-mono text-xs text-faint">
                  {marked}/{taskIds.length} · {lesson.minutes} min
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <h2 className="mt-12 font-serif text-2xl">Later modules</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        These are on the map so the path has a shape. They are not labs yet, and they will stay on the defensive side of the work: reading a system, not breaking into one.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {upcomingModules.map((module) => (
          <li key={module.title} className="rounded-2xl border border-dashed border-line px-4 py-4">
            <p className="font-serif text-xl">{module.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{module.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
