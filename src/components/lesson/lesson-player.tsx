"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { CheatSheet } from "@/components/lesson/cheat-sheet";
import { TaskPanel } from "@/components/lesson/task-panel";
import { LabTerminal } from "@/components/terminal/lab-terminal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { taskPasses, type GradeContext } from "@/lib/lessons/grader";
import { lessons, seedFromLesson } from "@/lib/lessons/catalog";
import type { Lesson } from "@/lib/lessons/schema";
import { planAllows, planName, type PlanId } from "@/lib/plans";
import { loadAccount, saveAccount } from "@/lib/progress/store";
import { useAccount } from "@/lib/progress/use-account";
import type { LabShell } from "@/lib/shell/shell";

type Panel = "tasks" | "terminal" | "sheet";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const shellRef = useRef<LabShell | null>(null);
  const account = useAccount();
  const completed = useMemo(
    () => new Set(account.completed[lesson.slug] ?? []),
    [account, lesson.slug],
  );
  const [panel, setPanel] = useState<Panel>("terminal");
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [solutions, setSolutions] = useState<Set<string>>(new Set());
  const [resetOpen, setResetOpen] = useState(false);
  const plan = account.plan;
  const allowed = planAllows(plan, lesson.minPlan);
  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const current = lesson.tasks.find((task) => !completed.has(task.id));
  const seed = seedFromLesson(lesson);

  function toggle(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((currentSet) => {
      const nextSet = new Set(currentSet);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  function onCommand(event: GradeContext) {
    const current = loadAccount();
    const done = new Set(current.completed[lesson.slug] ?? []);
    const newly = lesson.tasks.filter((task) => !done.has(task.id) && taskPasses(task.check, event));
    if (newly.length === 0) return;
    for (const task of newly) done.add(task.id);
    saveAccount({
      ...current,
      completed: { ...current.completed, [lesson.slug]: [...done] },
    });
    for (const task of newly) shellRef.current?.aside(`marked — ${task.prompt}`);
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[640px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
            Lesson {lesson.number} of {lessons.length} · {lesson.module}
          </p>
          <h1 className="truncate font-serif text-2xl tracking-tight">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm text-muted">
            {completed.size}/{lesson.tasks.length}
          </p>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} disabled={!allowed}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset lab
          </Button>
        </div>
      </div>
      <p className="border-b border-line px-4 py-3 text-sm leading-6 text-muted sm:px-5">{lesson.goal}</p>

      {!allowed ? (
        <LockedLesson lesson={lesson} plan={plan} />
      ) : (
        <>
          <div className="border-b border-line px-4 py-3 lg:hidden">
            <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
              <TabsList className="w-full">
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="sheet">Sheet</TabsTrigger>
              </TabsList>
            </Tabs>
            {current ? <p className="mt-3 text-sm leading-6">Now: {current.prompt}</p> : <p className="mt-3 text-sm text-mint">All tasks marked.</p>}
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)_270px]">
            <div className={panel === "tasks" ? "min-h-0" : "hidden lg:block lg:min-h-0"}>
              <TaskPanel
                lesson={lesson}
                completed={completed}
                plan={plan}
                hints={hints}
                solutions={solutions}
                onToggleHint={(id) => toggle(setHints, id)}
                onToggleSolution={(id) => toggle(setSolutions, id)}
              />
            </div>
            <div className={`${panel === "terminal" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}>
              <div className="min-h-0 flex-1">
                <LabTerminal
                  seed={seed}
                  seedKey={lesson.slug}
                  visible={panel === "terminal"}
                  onCommand={onCommand}
                  shellRef={shellRef}
                />
              </div>
              <p className="border-t border-line px-3 py-2 font-mono text-[11px] tracking-wide text-faint">
                Enter runs · Tab completes · Up recalls · leaving this page resets the live folder
              </p>
            </div>
            <div className={panel === "sheet" ? "min-h-0" : "hidden lg:block lg:min-h-0"}>
              <CheatSheet items={lesson.cheatSheet} />
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
        {previous ? (
          <Link href={`/learn/${previous.slug}`} className="text-muted hover:text-paper">
            ← {previous.title}
          </Link>
        ) : (
          <Link href="/learn" className="text-muted hover:text-paper">
            ← Path
          </Link>
        )}
        {next ? (
          <Link href={`/learn/${next.slug}`} className="text-muted hover:text-paper">
            {next.title} →
          </Link>
        ) : (
          <Link href="/sandbox" className="text-muted hover:text-paper">
            Open sandbox →
          </Link>
        )}
      </div>

      <Modal
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset this lab?"
        description="The folder goes back to the start. Ticks you have already earned stay saved on this device."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              shellRef.current?.reset();
              setResetOpen(false);
            }}
          >
            Restore folder
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function LockedLesson({ lesson, plan }: { lesson: Lesson; plan: PlanId }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <Lock className="h-5 w-5 text-amber" aria-hidden />
      <h2 className="mt-4 font-serif text-3xl tracking-tight">This lab is on {planName(lesson.minPlan)}.</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Your {planName(plan)} plan includes the earlier lessons. You can switch plan on this device without payment, then come back.
      </p>
      <ol className="mt-6 space-y-2 text-sm text-muted">
        {lesson.tasks.map((task, index) => (
          <li key={task.id}>
            {index + 1}. {task.prompt}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/pricing">See plans</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/learn">Back to the path</Link>
        </Button>
      </div>
    </div>
  );
}
