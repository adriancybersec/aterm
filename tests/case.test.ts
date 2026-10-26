import { describe, expect, it } from "vitest";
import { gradeCase } from "../src/lib/case/grade";
import {
  accessLog,
  allowList,
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
  visitsLog,
  withFinding,
  type OfficeCase,
} from "../src/lib/case/model";
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
    expect(found.messages).toEqual(["marked — web log"]);
    expect(found.completed).toEqual(["find-log"]);

    const wrong = session.run("echo 192.0.2.11 > answers/scanner.txt");
    expect(wrong.messages).toEqual(["scanner.txt is not the right IP"]);
    expect(wrong.completed).toEqual(["find-log"]);

    const scanner = session.run(`echo ${sample.scannerIp} > answers/scanner.txt`);
    expect(scanner.messages).toEqual(["marked — odd IP"]);
    expect(scanner.completed).toEqual(["find-log", "scanner"]);

    const site = session.run(`echo ${sample.suspiciousSite} > answers/site.txt`);
    expect(site.completed).toEqual(["find-log", "scanner", "site"]);

    const caller = session.run(`echo ${sample.callerIp} > answers/caller.txt`);
    expect(caller.messages).toEqual(["marked — caller IP"]);
    expect(caller.completed).toEqual(["find-log", "scanner", "site", "caller"]);
  });

  it("does not open a later step until the one above is marked", () => {
    const session = play(sample);
    const early = session.run(`echo ${sample.suspiciousSite} > answers/site.txt`);
    expect(early.completed).toEqual([]);

    session.run("find . -name access.log");
    const both = session.run(`echo ${sample.scannerIp} > answers/scanner.txt`);
    expect(both.messages).toEqual(["marked — odd IP", "marked — website"]);
    expect(both.completed).toEqual(["find-log", "scanner", "site"]);
  });

  it("drops a later tick that skipped a step", () => {
    expect(normalizeCompleted(["caller", "find-log"])).toEqual(["find-log"]);
    expect(normalizeCompleted(["finding"])).toEqual([]);
  });

  it("keeps the evidence locked until that step is marked, then checks the finding", () => {
    expect(evidenceTimeline(sample, []).map((section) => section.title)).toEqual([]);
    expect(evidenceTimeline(sample, ["find-log", "scanner"]).some((section) => section.lines.some((line) => line.includes("not found")))).toBe(true);
    expect(evidenceTimeline(sample, ["find-log", "scanner"]).some((section) => section.lines.some((line) => line.includes(sample.suspiciousSite)))).toBe(false);

    const done = { ...sample, completed: ["find-log", "scanner", "site", "caller"] as OfficeCase["completed"] };
    const short = withFinding(done, `${sample.scannerIp} ${sample.suspiciousSite}`);
    expect(short.completed.includes("finding")).toBe(false);
    expect(findingGaps(done, short.finding).length).toBeGreaterThan(0);

    const note = `${sample.scannerIp} tried pages that were not found. The same notes show ${sample.callerIp} opened ${sample.suspiciousSite}, which is not allowed. I would show these log lines to the office.`;
    expect(findingReady(done, note)).toBe(true);
    expect(withFinding(done, note).completed).toEqual(["find-log", "scanner", "site", "caller", "finding"]);
    expect(withFinding(sample, note).completed.includes("finding")).toBe(false);
    expect(resumeNote()).toContain("Practice log review");

    const older = { ...generateCase(mulberry32(4)), finding: undefined };
    expect(isOfficeCase(older)).toBe(true);
  });
});
