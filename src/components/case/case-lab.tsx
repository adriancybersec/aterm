"use client";

import { useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { LabTerminal } from "@/components/terminal/lab-terminal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gradeCase } from "@/lib/case/grade";
import { CASE_COMPANY, CASE_TASKS, generateCase, seedFromCase, type CaseTaskId } from "@/lib/case/model";
import { loadCase, saveCase } from "@/lib/case/store";
import { useCase } from "@/lib/case/use-case";
import type { GradeContext } from "@/lib/lessons/grader";
import type { LabShell } from "@/lib/shell/shell";
import { cn } from "@/lib/utils";

type Panel = "tasks" | "terminal" | "notes";

export function CaseLab() {
  const spec = useCase();
  if (!spec) return <CaseStart />;
  return <CaseSession key={spec.id} />;
}

function CaseStart() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-faint">CASE</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-paper">{CASE_COMPANY}</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-muted">
          <p>
            Generate a log for this office and find the suspicious activity. The questions stay the same. Each generate swaps the addresses, which of them are the odd ones, and the website names.
          </p>
          <p>
            Search with grep and find. A step marks when the answer is right, and the next one stays closed until then. Notes stay on this device with the case.
          </p>
          <p>The addresses are documentation ranges, and the websites end in .example. Nothing here is a real network.</p>
        </div>
        <Button className="mt-8" onClick={() => saveCase(generateCase())}>
          Generate case
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}

function CaseSession() {
  const spec = useCase();
  const shellRef = useRef<LabShell | null>(null);
  const [panel, setPanel] = useState<Panel>("terminal");
  const [hintFor, setHintFor] = useState<CaseTaskId | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [notes, setNotes] = useState(() => loadCase()?.notes ?? "");

  if (!spec) return null;

  const completed = new Set(spec.completed);
  const openIndex = CASE_TASKS.findIndex((task) => !completed.has(task.id));
  const current = openIndex === -1 ? null : CASE_TASKS[openIndex];
  const seed = seedFromCase(spec);

  function onCommand(event: GradeContext) {
    const currentCase = loadCase();
    if (!currentCase) return;
    const result = gradeCase(currentCase, event);
    const same =
      result.completed.length === currentCase.completed.length &&
      result.completed.every((id, index) => id === currentCase.completed[index]);
    if (!same) saveCase({ ...currentCase, completed: result.completed });
    for (const message of result.messages) shellRef.current?.aside(message);
  }

  function writeNotes(value: string) {
    const next = value.slice(0, 4000);
    setNotes(next);
    const currentCase = loadCase();
    if (currentCase) saveCase({ ...currentCase, notes: next });
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 sm:gap-3 sm:px-5 sm:py-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
            Case {spec.id} · {completed.size}/{CASE_TASKS.length}
          </p>
          <h1 className="truncate text-xl tracking-tight text-paper sm:text-2xl">{CASE_COMPANY}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
          New case
        </Button>
      </div>
      <p className="border-b border-line px-3 py-2 text-sm leading-5 text-muted sm:px-5 sm:py-3 sm:leading-6">
        {current
          ? openIndex < CASE_TASKS.length - 1
            ? "Read this morning's export. The next question stays closed until this one is marked."
            : "Last question. It marks when the address is right."
          : "Case closed. Generate another for a new set of addresses and websites."}
      </p>

      <div className="border-b border-line px-3 py-2 lg:hidden">
        <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
          <TabsList className="w-full">
            <TabsTrigger className="h-11" value="tasks">Tasks</TabsTrigger>
            <TabsTrigger className="h-11" value="terminal">Terminal</TabsTrigger>
            <TabsTrigger className="h-11" value="notes">Notes</TabsTrigger>
          </TabsList>
        </Tabs>
        {current ? (
          <p className="mt-3 text-sm leading-6">Now: {current.prompt}</p>
        ) : (
          <p className="mt-3 text-sm text-mint">All steps marked.</p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_280px]">
        <div className={panel === "tasks" ? "min-h-0" : "hidden lg:block lg:min-h-0"}>
          <TaskList
            completed={completed}
            openIndex={openIndex}
            hintFor={hintFor}
            onToggleHint={(id) => setHintFor((currentId) => (currentId === id ? null : id))}
          />
        </div>
        <div className={`${panel === "terminal" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden lg:flex`}>
          <div className="min-h-0 flex-1 overflow-hidden">
            <LabTerminal seed={seed} seedKey={spec.id} visible={panel === "terminal"} onCommand={onCommand} shellRef={shellRef} />
          </div>
          <p className="border-t border-line px-3 py-2 font-mono text-[11px] tracking-wide text-faint">
            <span className="sm:hidden">Tap the screen to type · Enter runs the line</span>
            <span className="hidden sm:inline">Enter runs · a tick is the only way on · leaving this page resets the live folder</span>
          </p>
        </div>
        <div className={panel === "notes" ? "min-h-0" : "hidden lg:block lg:min-h-0"}>
          <Notes notes={notes} onChange={writeNotes} />
        </div>
      </div>

      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Generate a new case?"
        description="This replaces the addresses, the websites, your ticks, and your notes. The questions stay the same."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              saveCase(generateCase());
            }}
          >
            Generate
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TaskList({
  completed,
  openIndex,
  hintFor,
  onToggleHint,
}: {
  completed: Set<CaseTaskId>;
  openIndex: number;
  hintFor: CaseTaskId | null;
  onToggleHint: (id: CaseTaskId) => void;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-ink lg:border-r">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Tasks</p>
        <p className="mt-1 text-sm text-muted" aria-live="polite">
          {completed.size} of {CASE_TASKS.length} marked
        </p>
      </div>
      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {CASE_TASKS.map((task, index) => {
          const done = completed.has(task.id);
          const locked = openIndex !== -1 && index > openIndex;
          const current = index === openIndex;
          return (
            <li
              key={task.id}
              className={cn(
                "border px-3 py-3",
                done ? "border-mint/30 bg-mint/5" : current ? "border-amber/50 bg-ink-2" : "border-line",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]",
                    done ? "border-mint bg-mint text-ink" : "border-line text-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : locked ? <Lock className="h-3 w-3" aria-hidden /> : index + 1}
                </span>
                <p className="text-sm leading-6">
                  {locked ? "Closed until the step above is marked." : task.prompt}
                </p>
              </div>
              {done ? <p className="mt-3 pl-7 font-mono text-[11px] uppercase tracking-[0.12em] text-mint">Marked</p> : null}
              {current ? (
                <div className="mt-3 pl-7">
                  <button
                    type="button"
                    className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-paper"
                    onClick={() => onToggleHint(task.id)}
                  >
                    {hintFor === task.id ? "Hide hint" : "Hint"}
                  </button>
                  {hintFor === task.id ? <p className="mt-3 text-sm leading-6 text-muted">{task.hint}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function Notes({ notes, onChange }: { notes: string; onChange: (value: string) => void }) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-ink lg:border-l">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Notes</p>
        <p className="mt-1 text-sm text-muted">Saved on this device with this case.</p>
      </div>
      <label className="sr-only" htmlFor="case-notes">
        Case notes
      </label>
      <textarea
        id="case-notes"
        value={notes}
        maxLength={4000}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write what you notice. Which address looks wrong, and which website is not on the list."
        className="min-h-0 w-full flex-1 resize-none bg-transparent px-4 py-3 text-base leading-6 text-paper outline-none placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber sm:text-sm"
      />
    </aside>
  );
}
