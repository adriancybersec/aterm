import { splitLines } from "../shell/format";
import type { SnapshotFile } from "../shell/vfs";
import type { Check } from "./schema";

export type GradeContext = {
  line: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  files: SnapshotFile[];
};

function fileAt(files: SnapshotFile[], path: string): SnapshotFile | undefined {
  return files.find((file) => file.path === path);
}

export function taskPasses(check: Check, ctx: GradeContext): boolean {
  switch (check.type) {
    case "command":
      return safeTest(check.pattern, ctx.line.trim());
    case "cwd":
      return ctx.cwd === check.equals;
    case "outputIncludes":
      return `${ctx.stdout}${ctx.stderr}`.includes(check.text);
    case "outputExcludes":
      return !`${ctx.stdout}${ctx.stderr}`.includes(check.text);
    case "outputMatches":
      return safeTest(check.pattern, ctx.stdout);
    case "stdoutEquals":
      return ctx.stdout.trim() === check.text;
    case "stdoutLineCount": {
      const count = splitLines(ctx.stdout).length;
      if (check.min !== undefined && count < check.min) return false;
      if (check.max !== undefined && count > check.max) return false;
      return true;
    }
    case "exitCode":
      return ctx.exitCode === check.equals;
    case "pathExists": {
      const file = fileAt(ctx.files, check.path);
      if (!file) return false;
      return check.kind ? file.type === check.kind : true;
    }
    case "pathMissing":
      return !fileAt(ctx.files, check.path);
    case "fileContains": {
      const file = fileAt(ctx.files, check.path);
      return Boolean(file && file.content.includes(check.text));
    }
    case "mode": {
      const file = fileAt(ctx.files, check.path);
      if (!file) return false;
      const actual = (file.mode & 0o777).toString(8).padStart(check.octal.length, "0");
      return actual === check.octal;
    }
    case "owner": {
      const file = fileAt(ctx.files, check.path);
      return Boolean(file && file.owner === check.user);
    }
    case "ownerExec": {
      const file = fileAt(ctx.files, check.path);
      return Boolean(file && (file.mode & 0o100) !== 0);
    }
    case "all":
      return check.checks.every((item) => taskPasses(item, ctx));
    case "any":
      return check.checks.some((item) => taskPasses(item, ctx));
    default:
      return false;
  }
}

function safeTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return false;
  }
}
