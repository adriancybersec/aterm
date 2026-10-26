"use client";

import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/lib/lessons/schema";
import { planAllows, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function TaskPanel({
  lesson,
  completed,
  plan,
  hints,
  solutions,
  onToggleHint,
  onToggleSolution,
}: {
  lesson: Lesson;
  completed: Set<string>;
  plan: PlanId;
  hints: Set<string>;
  solutions: Set<string>;
  onToggleHint: (id: string) => void;
  onToggleSolution: (id: string) => void;
}) {
  const canSolve = planAllows(plan, "plus");
  const current = lesson.tasks.find((task) => !completed.has(task.id))?.id;

  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-ink lg:border-r">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Tasks</p>
        <p className="mt-1 text-sm text-muted">
          {completed.size} of {lesson.tasks.length} marked
        </p>
      </div>
      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {lesson.tasks.map((task, index) => {
          const done = completed.has(task.id);
          return (
            <li
              key={task.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                done ? "border-mint/30 bg-mint/5" : current === task.id ? "border-amber/50 bg-ink-2" : "border-line",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]",
                    done ? "border-mint bg-mint text-ink" : "border-line text-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
                </span>
                <p className="text-sm leading-6">{task.prompt}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-7">
                {done ? <Badge tone="mint">Marked</Badge> : null}
                <button
                  type="button"
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-paper"
                  onClick={() => onToggleHint(task.id)}
                >
                  {hints.has(task.id) ? "Hide hint" : "Hint"}
                </button>
                <button
                  type="button"
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-paper"
                  onClick={() => onToggleSolution(task.id)}
                >
                  {solutions.has(task.id) ? "Hide solution" : "Solution"}
                </button>
              </div>
              {hints.has(task.id) ? <p className="mt-3 pl-7 text-sm leading-6 text-muted">{task.hint}</p> : null}
              {solutions.has(task.id) ? (
                canSolve ? (
                  <div className="mt-3 ml-7 rounded-lg border border-line bg-[#14120f] px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Worked command</p>
                    <code className="mt-1 block font-mono text-sm text-amber">{task.solution}</code>
                  </div>
                ) : (
                  <p className="mt-3 pl-7 text-sm leading-6 text-muted">
                    <Lock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Solutions are on Plus.{" "}
                    <Link href="/pricing" className="text-amber underline-offset-2 hover:underline">
                      See plans
                    </Link>
                  </p>
                )
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
