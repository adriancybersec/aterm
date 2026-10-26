import type { GradeContext } from "../lessons/grader";
import type { SnapshotFile } from "../shell/vfs";
import { CASE_TASKS, type CaseTaskId, type OfficeCase } from "./model";

const ANSWERS: Record<Exclude<CaseTaskId, "find-log">, string> = {
  scanner: "/home/student/case/answers/scanner.txt",
  site: "/home/student/case/answers/site.txt",
  caller: "/home/student/case/answers/caller.txt",
};

export type CaseGrade = {
  completed: CaseTaskId[];
  messages: string[];
};

function usesCommand(line: string, name: string): boolean {
  return line.split(/&&|\|\||[|;]/).some((part) => part.trim().split(/\s+/)[0] === name);
}

function fileAt(files: SnapshotFile[], path: string): SnapshotFile | undefined {
  return files.find((file) => file.path === path && file.type === "file");
}

function singleLine(files: SnapshotFile[], path: string): string | null {
  const file = fileAt(files, path);
  if (!file) return null;
  const lines = file.content.split("\n").filter((line) => line.trim() !== "");
  if (lines.length !== 1) return null;
  return lines[0].trim();
}

function expected(spec: OfficeCase, id: Exclude<CaseTaskId, "find-log">): string {
  if (id === "scanner") return spec.scannerIp;
  if (id === "site") return spec.suspiciousSite;
  return spec.callerIp;
}

function passes(id: CaseTaskId, spec: OfficeCase, event: GradeContext): boolean {
  if (id === "find-log") {
    return usesCommand(event.line, "find") && `${event.stdout}${event.stderr}`.includes("access.log");
  }
  return singleLine(event.files, ANSWERS[id]) === expected(spec, id);
}

function mismatch(id: CaseTaskId, spec: OfficeCase, event: GradeContext): string | null {
  if (id === "find-log") return null;
  const filename = ANSWERS[id].split("/").pop() ?? "";
  if (!event.line.includes(filename)) return null;
  const file = fileAt(event.files, ANSWERS[id]);
  if (!file) return null;
  const value = singleLine(event.files, ANSWERS[id]);
  if (value === null) return `${filename} should be one line only`;
  if (value === expected(spec, id)) return null;
  return id === "site" ? "site.txt is not the right website" : `${filename} is not the right IP`;
}

export function gradeCase(spec: OfficeCase, event: GradeContext): CaseGrade {
  const completed = [...spec.completed];
  const messages: string[] = [];
  for (const task of CASE_TASKS) {
    if (completed.includes(task.id)) continue;
    if (passes(task.id, spec, event)) {
      completed.push(task.id);
      messages.push(`marked — ${task.marked}`);
      continue;
    }
    const wrong = mismatch(task.id, spec, event);
    if (wrong) messages.push(wrong);
    break;
  }
  return { completed, messages };
}
