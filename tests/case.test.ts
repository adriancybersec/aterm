import { describe, expect, it } from "vitest";
import { gradeCase } from "../src/lib/case/grade";
import {
  accessLog,
  allowList,
  answerValue,
  briefText,
  COMPANY_SITE,
  evidenceTimeline,
  findingGaps,
  findingReady,
  generateCase,
  isOfficeCase,
  mailLog,
  normalizeCompleted,
  resumeNote,
  seedFromCase,
  tasksFor,
  visitsLog,
  withFinding,
  type OfficeCase,
} from "../src/lib/case/model";
import { allQuestionPicks, type TaskCheck } from "../src/lib/case/questions";
import { LabShell, type GradeContext } from "../src/lib/shell/shell";

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function skeleton(spec: OfficeCase, text: string): string {
  const values = [
    spec.scannerIp,
    spec.callerIp,
    ...spec.staffIps,
    ...spec.noiseIps,
    spec.suspiciousSite,
    ...spec.sites,
    COMPANY_SITE,
  ].sort((left, right) => right.length - left.length);
  let next = text;
  for (const value of values) next = next.split(value).join("§");
  return next;
}

const sample: OfficeCase = {
  id: "abc12345",
  questions: ["odd-ip", "downloader", "mail-site"],
  scannerIp: "203.0.113.10",
  callerIp: "198.51.100.20",
  staffIps: ["192.0.2.11", "192.0.2.12", "192.0.2.13", "192.0.2.14"],
  noiseIps: ["203.0.113.40", "203.0.113.41"],
  sites: ["mail.brightwater.example", "files.brightwater.example", "maps.example"],
  suspiciousSite: "metrics-sync.example",
  notes: "",
  finding: "",
  completed: [],
};

function play(spec: OfficeCase) {
  const events: GradeContext[] = [];
  const shell = new LabShell({
    write: () => undefined,
    seed: seedFromCase(spec),
    onCommand: (event) => events.push(event),
  });
  shell.start();
  let completed = [...spec.completed];
  return {
    run(line: string) {
      shell.input(`${line}\r`);
      const event = events[events.length - 1];
      const result = gradeCase({ ...spec, completed }, event);
      completed = result.completed;
      return result;
    },
    completed: () => completed,
  };
}

describe("office case", () => {
  it("keeps the same log shape and only swaps addresses and websites", () => {
    const first = generateCase(mulberry32(1));
    const second = generateCase(mulberry32(2));
    expect(generateCase(mulberry32(1))).toEqual(first);
    expect(first.scannerIp).toMatch(/^(203\.0\.113|198\.51\.100|192\.0\.2)\./);
    expect(first.suspiciousSite.endsWith(".example")).toBe(true);
    expect(allowList(first)).toContain(COMPANY_SITE);
    expect(allowList(first)).not.toContain(first.suspiciousSite);
    expect(skeleton(first, accessLog(first))).toEqual(skeleton(second, accessLog(second)));
    expect(skeleton(first, visitsLog(first))).toEqual(skeleton(second, visitsLog(second)));
    expect(skeleton(first, mailLog(first))).toEqual(skeleton(second, mailLog(second)));
    expect(skeleton(first, allowList(first))).toEqual(skeleton(second, allowList(second)));
    expect(briefText()).toBe(briefText());

    const scanners = new Set([1, 2, 3, 4, 5].map((seed) => generateCase(mulberry32(seed)).scannerIp));
    const sites = new Set([1, 2, 3, 4, 5].map((seed) => generateCase(mulberry32(seed)).suspiciousSite));
    expect(scanners.size).toBeGreaterThan(1);
    expect(sites.size).toBeGreaterThan(1);
  });

  it("asks different questions on every generate", () => {
    const prompts = (spec: OfficeCase) => tasksFor(spec).map((task) => task.prompt).join("\n");
    const picks = allQuestionPicks();
    expect(picks.length).toBeGreaterThan(20);
    for (const questions of picks) {
      const list = tasksFor({ questions }).map((task) => task.prompt);
      expect(new Set(list).size).toBe(list.length);
    }
    expect(new Set(picks.map((questions) => prompts({ ...sample, questions }))).size).toBe(picks.length);

    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const spec = generateCase(mulberry32(seed));
      const key = [...spec.questions].sort().join(",");
      seen.add(key);
      const next = generateCase(mulberry32(seed), spec.questions);
      expect([...next.questions].sort().join(",")).not.toBe(key);
      expect(prompts(next)).not.toBe(prompts(spec));
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it("puts the missing pages on one address and the odd website on one caller", () => {
    const spec = generateCase(mulberry32(9));
    const missing = accessLog(spec)
      .trim()
      .split("\n")
      .filter((line) => line.includes("not found"));
    expect(missing.length).toBeGreaterThan(1);
    for (const line of missing) expect(line.split(/\s+/)[1]).toBe(spec.scannerIp);
    for (const line of accessLog(spec).trim().split("\n")) {
      expect(line).toMatch(/opened|tried|signed in|downloaded/);
      expect(line.split(/\s+/)[1]).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }
    const oddLines = visitsLog(spec)
      .trim()
      .split("\n")
      .filter((line) => line.endsWith(`opened ${spec.suspiciousSite}`));
    expect(oddLines.length).toBeGreaterThan(1);
    expect(oddLines.every((line) => line.split(/\s+/)[1] === spec.callerIp)).toBe(true);
    for (const staff of spec.staffIps) {
      expect(oddLines.some((line) => line.split(/\s+/)[1] === staff)).toBe(false);
    }
    expect(mailLog(spec)).toContain("sent mail");
    expect(mailLog(spec)).not.toContain(spec.suspiciousSite);
    expect(mailLog(spec)).not.toContain("not found");
  });

  it("marks the steps in order and says when an answer is wrong", () => {
    const session = play(sample);
    expect(session.run("ls").completed).toEqual([]);
    expect(session.run('grep "not found" web/access.log').messages).toEqual([]);
    expect(session.run("find . -name allow.txt").completed).toEqual([]);

    const found = session.run("find . -name access.log");
    expect(found.messages).toEqual(["marked — website log"]);
    expect(found.completed).toEqual(["find-access"]);

    const wrong = session.run("echo 192.0.2.11 > answers/odd-ip.txt");
    expect(wrong.messages).toEqual(["odd-ip.txt is not the right IP"]);
    expect(wrong.completed).toEqual(["find-access"]);

    const scanner = session.run(`echo ${sample.scannerIp} > answers/odd-ip.txt`);
    expect(scanner.messages).toEqual(["marked — odd IP"]);
    expect(scanner.completed).toEqual(["find-access", "odd-ip"]);

    const download = session.run(`echo ${answerValue(sample, "downloader")} > answers/download.txt`);
    expect(download.completed).toEqual(["find-access", "odd-ip", "downloader"]);

    const mailed = session.run(`echo ${sample.sites[0]} > answers/mail-site.txt`);
    expect(mailed.messages).toEqual(["marked — mailed website"]);
    expect(mailed.completed).toEqual(["find-access", "odd-ip", "downloader", "mail-site"]);
  });

  it("does not open a later step until the one above is marked", () => {
    const session = play(sample);
    const early = session.run(`echo ${answerValue(sample, "downloader")} > answers/download.txt`);
    expect(early.completed).toEqual([]);

    session.run("find . -name access.log");
    const both = session.run(`echo ${sample.scannerIp} > answers/odd-ip.txt`);
    expect(both.messages).toEqual(["marked — odd IP", "marked — download"]);
    expect(both.completed).toEqual(["find-access", "odd-ip", "downloader"]);
  });

  it("solves every question mix from the logs", () => {
    const base = generateCase(mulberry32(7));
    for (const questions of allQuestionPicks()) {
      const spec: OfficeCase = { ...base, questions, completed: [], finding: "" };
      const session = play(spec);
      for (const task of tasksFor(spec)) {
        const check: TaskCheck = task.check;
        if (check.kind === "finding") break;
        if (check.kind === "find") session.run(`find . -name ${check.name}`);
        else if (check.kind === "exact") session.run(`echo ${answerValue(spec, check.key)} > ${check.file}`);
        else session.run(`echo ${spec.sites[0]} > ${check.file}`);
      }
      expect(session.completed()).toEqual(tasksFor(spec).filter((task) => task.id !== "finding").map((task) => task.id));
    }
  });

  it("drops a later tick that skipped a step", () => {
    expect(normalizeCompleted(["opener", "find-access"], sample.questions)).toEqual(["find-access"]);
    expect(normalizeCompleted(["finding"], sample.questions)).toEqual([]);
    expect(normalizeCompleted(["first-open", "find-visits"], ["opener", "mail-ip", "sign-in"])).toEqual(["find-visits"]);
  });

  it("keeps the evidence locked until that step is marked, then checks the finding", () => {
    expect(evidenceTimeline(sample, []).map((section) => section.title)).toEqual([]);
    expect(evidenceTimeline(sample, ["find-access", "odd-ip"]).some((section) => section.lines.some((line) => line.includes("not found")))).toBe(true);
    expect(evidenceTimeline(sample, ["find-access", "odd-ip"]).some((section) => section.lines.some((line) => line.includes(sample.suspiciousSite)))).toBe(false);
    const siteOnly = evidenceTimeline(sample, ["odd-site"]);
    expect(siteOnly.some((section) => section.lines.includes(sample.suspiciousSite))).toBe(true);
    expect(siteOnly.some((section) => section.lines.some((line) => line.includes(sample.callerIp)))).toBe(false);

    const shell = ["find-access", "odd-ip", "downloader", "mail-site"] as OfficeCase["completed"];
    const done = { ...sample, completed: shell };
    const short = withFinding(done, `${sample.scannerIp} tried pages`);
    expect(short.completed.includes("finding")).toBe(false);
    expect(findingGaps(done, short.finding).length).toBeGreaterThan(0);

    const note = `${sample.scannerIp} tried pages that were not found. ${answerValue(sample, "downloader")} downloaded the price list. The mail log also names ${sample.sites[0]}. I would tell the office to check those lines.`;
    expect(findingReady(done, note)).toBe(true);
    expect(withFinding(done, note).completed).toEqual([...shell, "finding"]);
    expect(withFinding(sample, note).completed.includes("finding")).toBe(false);
    expect(findingReady(done, note.replace(sample.sites[0], sample.suspiciousSite))).toBe(false);
    expect(resumeNote()).toContain("Practice log review");

    const older = { ...generateCase(mulberry32(4)), finding: undefined };
    expect(isOfficeCase(older)).toBe(true);
    expect(isOfficeCase({ ...sample, questions: undefined })).toBe(false);
    expect(isOfficeCase({ ...sample, questions: ["odd-ip", "first-page", "miss-count"] })).toBe(false);
  });
});
