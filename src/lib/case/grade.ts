import type { GradeContext } from "../lessons/grader";
import type { SnapshotFile } from "../shell/vfs";
import { answerValue, tasksFor, type CaseTaskId, type OfficeCase } from "./model";
import type { TaskCheck } from "./questions";

const ROOT = "/home/student/case/";

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

function answerPath(file: string): string {
  return `${ROOT}${file}`;
}

function matches(check: TaskCheck, spec: OfficeCase, event: GradeContext): boolean {
  if (check.kind === "find") {
    return usesCommand(event.line, "find") && `${event.stdout}${event.stderr}`.includes(check.name);
  }
  if (check.kind === "finding") return false;
  const value = singleLine(event.files, answerPath(check.file));
  if (value === null) return false;
  if (check.kind === "exact") return value === answerValue(spec, check.key);
  return spec.sites.includes(value);
}

function mismatch(check: TaskCheck, spec: OfficeCase, event: GradeContext): string | null {
  if (check.kind === "find" || check.kind === "finding") return null;
  const filename = check.file.split("/").pop() ?? "";
  if (!event.line.includes(filename)) return null;
  if (!fileAt(event.files, answerPath(check.file))) return null;
  const value = singleLine(event.files, answerPath(check.file));
  if (value === null) return `${filename} should be one line only`;
  const right = check.kind === "exact" ? value === answerValue(spec, check.key) : spec.sites.includes(value);
  if (right) return null;
  return check.wrong;
}

export function gradeCase(spec: OfficeCase, event: GradeContext): CaseGrade {
  const completed = [...spec.completed];
  const messages: string[] = [];
  for (const task of tasksFor(spec)) {
    if (completed.includes(task.id)) continue;
    if (task.check.kind === "finding") break;
    if (matches(task.check, spec, event)) {
      completed.push(task.id);
      messages.push(`marked — ${task.marked}`);
      continue;
    }
    const wrong = mismatch(task.check, spec, event);
    if (wrong) messages.push(wrong);
    break;
  }
  return { completed, messages };
}
