import { z } from "zod";

export type Check =
  | { type: "command"; pattern: string }
  | { type: "cwd"; equals: string }
  | { type: "outputIncludes"; text: string }
  | { type: "outputExcludes"; text: string }
  | { type: "outputMatches"; pattern: string }
  | { type: "stdoutEquals"; text: string }
  | { type: "stdoutLineCount"; min?: number; max?: number }
  | { type: "exitCode"; equals: number }
  | { type: "pathExists"; path: string; kind?: "file" | "dir" }
  | { type: "pathMissing"; path: string }
  | { type: "fileContains"; path: string; text: string }
  | { type: "mode"; path: string; octal: string }
  | { type: "owner"; path: string; user: string }
  | { type: "ownerExec"; path: string }
  | { type: "all"; checks: Check[] }
  | { type: "any"; checks: Check[] };

export const checkSchema: z.ZodType<Check> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("command"), pattern: z.string().min(1) }),
    z.object({ type: z.literal("cwd"), equals: z.string().min(1) }),
    z.object({ type: z.literal("outputIncludes"), text: z.string() }),
    z.object({ type: z.literal("outputExcludes"), text: z.string() }),
    z.object({ type: z.literal("outputMatches"), pattern: z.string().min(1) }),
    z.object({ type: z.literal("stdoutEquals"), text: z.string() }),
    z.object({
      type: z.literal("stdoutLineCount"),
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().nonnegative().optional(),
    }),
    z.object({ type: z.literal("exitCode"), equals: z.number().int() }),
    z.object({
      type: z.literal("pathExists"),
      path: z.string().min(1),
      kind: z.enum(["file", "dir"]).optional(),
    }),
    z.object({ type: z.literal("pathMissing"), path: z.string().min(1) }),
    z.object({
      type: z.literal("fileContains"),
      path: z.string().min(1),
      text: z.string(),
    }),
    z.object({ type: z.literal("mode"), path: z.string().min(1), octal: z.string().regex(/^[0-7]{3,4}$/) }),
    z.object({ type: z.literal("owner"), path: z.string().min(1), user: z.string().min(1) }),
    z.object({ type: z.literal("ownerExec"), path: z.string().min(1) }),
    z.object({ type: z.literal("all"), checks: z.array(checkSchema).min(1) }),
    z.object({ type: z.literal("any"), checks: z.array(checkSchema).min(1) }),
  ]),
);

export const lessonSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  title: z.string().min(1),
  module: z.string().min(1),
  minutes: z.number().int().positive(),
  minPlan: z.enum(["free", "pro", "plus"]),
  goal: z.string().min(1),
  cwd: z.string().min(1),
  cheatSheet: z
    .array(
      z.object({
        command: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string().optional(),
      mode: z.string().regex(/^[0-7]{3,4}$/).optional(),
      owner: z.string().optional(),
      group: z.string().optional(),
      type: z.enum(["file", "dir"]).optional(),
    }),
  ),
  tasks: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        prompt: z.string().min(1),
        hint: z.string().min(1),
        solution: z.string().min(1),
        check: checkSchema,
      }),
    )
    .min(3)
    .max(6),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type LessonTask = Lesson["tasks"][number];
