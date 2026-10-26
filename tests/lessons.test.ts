import { describe, expect, it } from "vitest";
import { taskPasses } from "../src/lib/lessons/grader";
import { lessons, seedFromLesson } from "../src/lib/lessons/catalog";
import { LabShell, type GradeContext } from "../src/lib/shell/shell";

function open(lessonIndex: number) {
  const lesson = lessons[lessonIndex];
  const events: GradeContext[] = [];
  const shell = new LabShell({
    write: () => undefined,
    seed: seedFromLesson(lesson),
    onCommand: (event) => events.push(event),
  });
  shell.start();
  return {
    lesson,
    run(line: string) {
      shell.input(`${line}\r`);
      return events[events.length - 1];
    },
  };
}

describe("seeded lessons", () => {
  it("parses five lessons with three to six tasks each", () => {
    expect(lessons.map((lesson) => lesson.slug)).toEqual([
      "navigate",
      "make-and-remove",
      "read-files",
      "permissions",
      "search",
    ]);
    for (const lesson of lessons) {
      expect(lesson.tasks.length).toBeGreaterThanOrEqual(3);
      expect(lesson.tasks.length).toBeLessThanOrEqual(6);
    }
  });

  it("marks every task when the published solution is run in order", () => {
    for (const lesson of lessons) {
      const events: GradeContext[] = [];
      const shell = new LabShell({
        write: () => undefined,
        seed: seedFromLesson(lesson),
        onCommand: (event) => events.push(event),
      });
      shell.start();
      const done = new Set<string>();
      for (const task of lesson.tasks) {
        shell.input(`${task.solution}\r`);
        if (shell.isPaging()) shell.input("q");
        const event = events[events.length - 1];
        expect(event, task.solution).toBeTruthy();
        expect(event.exitCode, `${lesson.slug} ${task.id}: ${task.solution}\n${event.stderr}`).toBe(0);
        for (const candidate of lesson.tasks) {
          if (!done.has(candidate.id) && taskPasses(candidate.check, event)) done.add(candidate.id);
        }
        expect(done.has(task.id), `${lesson.slug} ${task.id} did not pass for: ${task.solution}\n${event.stdout}\n${event.stderr}`).toBe(
          true,
        );
      }
      expect([...done].sort()).toEqual(lesson.tasks.map((task) => task.id).sort());
    }
  });

  it("does not mark the home pwd task when already inside week 1", () => {
    const lab = open(0);
    lab.run("cd labs/week1");
    const event = lab.run("pwd");
    const home = lessons[0].tasks.find((task) => task.id === "print-home");
    const here = lessons[0].tasks.find((task) => task.id === "print-week1");
    expect(home && taskPasses(home.check, event)).toBe(false);
    expect(here && taskPasses(here.check, event)).toBe(true);
  });
});
