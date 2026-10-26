import makeAndRemove from "../../../content/lessons/02-make-and-remove.json";
import navigate from "../../../content/lessons/01-navigate.json";
import permissions from "../../../content/lessons/04-permissions.json";
import readFiles from "../../../content/lessons/03-read-files.json";
import search from "../../../content/lessons/05-search.json";
import type { LabSeed } from "../shell/shell";
import { lessonSchema, type Lesson } from "./schema";

const sources = [navigate, makeAndRemove, readFiles, permissions, search];

export const lessons: Lesson[] = sources
  .map((source) => lessonSchema.parse(source))
  .sort((a, b) => a.number - b.number);

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

export function seedFromLesson(lesson: Lesson): LabSeed {
  return { cwd: lesson.cwd, files: lesson.files };
}

export function totalTasks(): number {
  return lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0);
}

export const upcomingModules = [
  {
    title: "Processes",
    summary: "ps and top, and how to read what a lab machine is running.",
  },
  {
    title: "Networking basics",
    summary: "Interfaces, ports, and what a socket listing is for. No scanning.",
  },
  {
    title: "Logs",
    summary: "Where Linux keeps logs, and how to read them without changing them.",
  },
  {
    title: "SSH concepts",
    summary: "What an SSH command means, and keys versus passwords. No breaking in.",
  },
];
