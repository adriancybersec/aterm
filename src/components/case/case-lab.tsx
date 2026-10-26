"use client";

import { useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { LabTerminal } from "@/components/terminal/lab-terminal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gradeCase } from "@/lib/case/grade";
import {
  CASE_COMPANY,
  CASE_TASKS,
  evidenceTimeline,
  findingGaps,
  generateCase,
  resumeNote,
  seedFromCase,
  withFinding,
  type CaseTaskId,
  type OfficeCase,
} from "@/lib/case/model";
import { loadCase, saveCase } from "@/lib/case/store";
import { useCase } from "@/lib/case/use-case";
import type { GradeContext } from "@/lib/lessons/grader";
import type { LabShell } from "@/lib/shell/shell";
import { cn } from "@/lib/utils";

type Panel = "tasks" | "terminal" | "notes" | "report";
type Side = "notes" | "report";

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
            Make a practice log for this office. You read what each IP address did. The questions stay the same. A new case only changes the IP addresses, which ones look wrong, and the website names.
          </p>
          <p>
            Use grep and find to read the logs. Open a hint if you get stuck. There is more than one hint on each step. A step ticks when you are right, and the next step stays locked until then.
          </p>
          <p>
            When you finish, Report holds the log lines you found, a short finding, and a resume note you can copy. That is the write-up a junior security internship asks you to talk through.
          </p>
          <p>The IP addresses and websites are fake. They are only for this lab. Notes stay on this device with the case.</p>
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
  const [side, setSide] = useState<Side>(() => {
    const saved = loadCase();
    if (!saved) return "notes";
    const open = CASE_TASKS.find((task) => !saved.completed.includes(task.id));
    return !open || open.id === "finding" ? "report" : "notes";
  });
  const [confirm, setConfirm] = useState(false);
  const [notes, setNotes] = useState(() => loadCase()?.notes ?? "");
  const [finding, setFinding] = useState(() => loadCase()?.finding ?? "");
  const [copied, setCopied] = useState(false);

  if (!spec) return null;

  const completed = new Set(spec.completed);
  const openIndex = CASE_TASKS.findIndex((task) => !completed.has(task.id));
  const current = openIndex === -1 ? null : CASE_TASKS[openIndex];
  const seed = seedFromCase(spec);

  function onCommand(event: GradeContext) {
    const currentCase = loadCase();
    if (!currentCase) return;
    const result = gradeCase(currentCase, event);
    const next = withFinding({ ...currentCase, completed: result.completed }, currentCase.finding);
    const same =
      next.completed.length === currentCase.completed.length &&
      next.completed.every((id, index) => id === currentCase.completed[index]);
    if (!same) saveCase(next);
    for (const message of result.messages) shellRef.current?.aside(message);
    if (!currentCase.completed.includes("finding") && next.completed.includes("finding")) {
      shellRef.current?.aside("marked — finding");
    }
    if (!currentCase.completed.includes("scanner") && next.completed.includes("scanner")) {
      setSide("report");
    }
    if (!currentCase.completed.includes("caller") && next.completed.includes("caller")) {
      setSide("report");
      setPanel("report");
    }
  }

  function writeNotes(value: string) {
    const next = value.slice(0, 4000);
    setNotes(next);
    const currentCase = loadCase();
    if (currentCase) saveCase({ ...currentCase, notes: next });
  }

  const showNotes = panel === "report" ? false : panel === "notes" ? true : side === "notes";
  const showReport = panel === "notes" ? false : panel === "report" ? true : side === "report";

  function writeFinding(value: string) {
    const currentCase = loadCase();
    if (!currentCase) return;
    const next = withFinding(currentCase, value);
    setFinding(next.finding);
    const marked = !currentCase.completed.includes("finding") && next.completed.includes("finding");
    saveCase(next);
    if (marked) shellRef.current?.aside("marked — finding");
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
          ? current.id === "finding"
            ? "Last step. Write the finding in Report. It ticks when the odd IP, the website, and what they did are in the note."
            : "Each log line is a time, an IP address, and what that person did. The next step stays locked until this one is right."
          : "Case closed. Copy the resume note in Report, or make a new case."}
      </p>

      <div className="border-b border-line px-3 py-2 lg:hidden">
        <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
          <TabsList className="w-full">
            <TabsTrigger className="h-11 px-1 text-xs" value="tasks">Tasks</TabsTrigger>
            <TabsTrigger className="h-11 px-1 text-xs" value="terminal">Terminal</TabsTrigger>
            <TabsTrigger className="h-11 px-1 text-xs" value="notes">Notes</TabsTrigger>
            <TabsTrigger className="h-11 px-1 text-xs" value="report">Report</TabsTrigger>
          </TabsList>
        </Tabs>
        {current ? (
          <p className="mt-3 text-sm leading-6">Now: {current.prompt}</p>
        ) : (
          <p className="mt-3 text-sm text-mint">All steps done.</p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className={panel === "tasks" ? "min-h-0" : "hidden lg:block lg:min-h-0"}>
          <TaskList completed={completed} openIndex={openIndex} />
        </div>
        <div className={`${panel === "terminal" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden lg:flex`}>
          <div className="min-h-0 flex-1 overflow-hidden">
            <LabTerminal seed={seed} seedKey={spec.id} visible={panel === "terminal"} onCommand={onCommand} shellRef={shellRef} />
          </div>
          <p className="border-t border-line px-3 py-2 font-mono text-[11px] tracking-wide text-faint">
            <span className="sm:hidden">Tap the screen to type · Enter runs the line</span>
            <span className="hidden sm:inline">Enter runs the line · open a hint if you get stuck · leaving this page resets the live folder</span>
          </p>
        </div>
        <div
          className={cn(
            "h-full min-h-0 flex-col border-line lg:flex lg:border-l",
            panel === "notes" || panel === "report" ? "flex" : "hidden",
          )}
        >
          <div className="hidden gap-2 border-b border-line px-3 py-2 lg:flex">
            <SideButton active={side === "notes"} onClick={() => setSide("notes")}>
              Notes
            </SideButton>
            <SideButton active={side === "report"} onClick={() => setSide("report")}>
              Report
            </SideButton>
          </div>
          {showNotes ? <Notes notes={notes} onChange={writeNotes} /> : null}
          {showReport ? (
            <Report spec={spec} completed={completed} finding={finding} copied={copied} onChange={writeFinding} onCopy={() => copyResume(setCopied)} />
          ) : null}
        </div>
      </div>

      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Generate a new case?"
        description="This replaces the IP addresses, the websites, your ticks, your notes, and your finding. The questions stay the same."
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

function TaskList({ completed, openIndex }: { completed: Set<CaseTaskId>; openIndex: number }) {
  return (
    <aside className="flex h-full min-h-0 flex-1 flex-col border-line bg-ink lg:border-r">
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
                <p className="text-sm leading-6">{locked ? "Locked. Finish the step above first." : task.prompt}</p>
              </div>
              {done ? <p className="mt-3 pl-7 font-mono text-[11px] uppercase tracking-[0.12em] text-mint">Marked</p> : null}
              {current ? <HintSteps key={task.id} hints={task.hints} /> : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function SideButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 flex-1 rounded-full border text-sm",
        active ? "border-amber bg-ink-3 text-paper" : "border-line text-muted hover:text-paper",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Report({
  spec,
  completed,
  finding,
  copied,
  onChange,
  onCopy,
}: {
  spec: OfficeCase;
  completed: Set<CaseTaskId>;
  finding: string;
  copied: boolean;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  const sections = evidenceTimeline(spec, [...completed]);
  const shellDone = CASE_TASKS.filter((task) => task.id !== "finding").every((task) => completed.has(task.id));
  const gaps = shellDone ? findingGaps(spec, finding) : [];
  const done = completed.has("finding");

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-ink">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Report</p>
        <p className="mt-1 text-sm text-muted">The log lines you found, then a note you could show a senior.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <section>
          <h2 className="text-sm text-paper">Timeline</h2>
          {sections.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted">Nothing here yet. When a step is marked, the log lines for it show up. That is your evidence.</p>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mt-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{section.title}</p>
                <ul className="mt-1 space-y-1">
                  {section.lines.map((line) => (
                    <li key={line} className="font-mono text-[11px] leading-5 text-muted">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
        <section>
          <h2 className="text-sm text-paper">Finding</h2>
          {shellDone ? (
            <>
              <label className="sr-only" htmlFor="case-finding">
                Finding
              </label>
              <textarea
                id="case-finding"
                value={finding}
                maxLength={2000}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Say the odd IP, what it did, the website that is not allowed, and what you would tell the office."
                className="mt-2 h-36 w-full resize-none rounded-xl border border-line bg-transparent px-3 py-2 text-base leading-6 text-paper outline-none placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber sm:text-sm"
              />
              {done ? (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mint">Marked</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm leading-6 text-muted">
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">Locked. Finish the log steps first, then write what you would tell the office.</p>
          )}
        </section>
        {done ? (
          <section>
            <h2 className="text-sm text-paper">For your resume</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{resumeNote()}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onCopy}>
              {copied ? "Copied" : "Copy resume note"}
            </Button>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

async function copyResume(setCopied: (value: boolean) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(resumeNote());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  } catch {
    setCopied(false);
  }
}

function HintSteps({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  const left = hints.length - shown;

  return (
    <div className="mt-3 pl-7">
      {shown > 0 ? (
        <ol className="space-y-2">
          {hints.slice(0, shown).map((hint, index) => (
            <li key={hint} className="text-sm leading-6 text-muted">
              <span className="font-mono text-[11px] text-amber">Hint {index + 1}. </span>
              {hint}
            </li>
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-paper",
          shown > 0 && "mt-3",
        )}
        onClick={() => setShown(shown >= hints.length ? 0 : shown + 1)}
      >
        {shown === 0 ? `Show a hint (${hints.length})` : shown >= hints.length ? "Hide hints" : `Another hint (${left} left)`}
      </button>
    </div>
  );
}

function Notes({ notes, onChange }: { notes: string; onChange: (value: string) => void }) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col border-line bg-ink lg:border-l">
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
        placeholder="Write the IP addresses you see, and what each person did."
        className="min-h-0 w-full flex-1 resize-none bg-transparent px-4 py-3 text-base leading-6 text-paper outline-none placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber sm:text-sm"
      />
    </aside>
  );
}
