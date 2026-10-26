import type { LabSeed } from "../shell/shell";
import type { SeedFile } from "../shell/vfs";
import {
  findingName,
  pickQuestions,
  questionGroup,
  tasksForIds,
  type AnswerKey,
  type AnswerTaskId,
  type CaseTask,
  type CaseTaskId,
} from "./questions";

export type { AnswerTaskId, CaseTask, CaseTaskId };

export const CASE_COMPANY = "Brightwater Office";
export const COMPANY_SITE = "brightwater.example";

const DOC_BLOCKS = ["203.0.113", "198.51.100", "192.0.2"] as const;

const BENIGN_SITES = [
  "mail.brightwater.example",
  "files.brightwater.example",
  "docs.brightwater.example",
  "status.brightwater.example",
  "maps.example",
  "weather.example",
  "calendar.example",
  "fonts.example",
];

const ODD_SITES = [
  "metrics-sync.example",
  "cdn-refresh.example",
  "license-check.example",
  "asset-update.example",
  "telemetry-edge.example",
  "patch-mirror.example",
  "sync-gateway.example",
  "edge-collector.example",
];

export type OfficeCase = {
  id: string;
  questions: AnswerTaskId[];
  scannerIp: string;
  callerIp: string;
  staffIps: string[];
  noiseIps: string[];
  sites: string[];
  suspiciousSite: string;
  notes: string;
  finding: string;
  completed: CaseTaskId[];
};

export function tasksFor(spec: Pick<OfficeCase, "questions">): CaseTask[] {
  return tasksForIds(spec.questions);
}

const IP_PATTERN = /^(203\.0\.113|198\.51\.100|192\.0\.2)\.(?:[1-9]|[1-9]\d|1\d{2}|2[0-4]\d|25[0-4])$/;
const SITE_PATTERN = /^[a-z0-9.-]+\.example$/;

export function randomUnit(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}

function take<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function pickIps(count: number, rng: () => number): string[] {
  const pool: string[] = [];
  for (const block of DOC_BLOCKS) {
    for (let host = 1; host <= 254; host += 1) pool.push(`${block}.${host}`);
  }
  return take(pool, count, rng);
}

function caseId(rng: () => number): string {
  let id = "";
  for (let index = 0; index < 8; index += 1) id += Math.floor(rng() * 16).toString(16);
  return id;
}

export function generateCase(rng: () => number = randomUnit, avoid?: readonly string[]): OfficeCase {
  const questions = pickQuestions(rng, avoid);
  const ips = pickIps(8, rng);
  const scannerIp = ips[0];
  const callerIp = rng() < 0.5 ? scannerIp : ips[1];
  return {
    id: caseId(rng),
    questions,
    scannerIp,
    callerIp,
    staffIps: ips.slice(2, 6),
    noiseIps: ips.slice(6, 8),
    sites: take(BENIGN_SITES, 3, rng),
    suspiciousSite: take(ODD_SITES, 1, rng)[0],
    notes: "",
    finding: "",
    completed: [],
  };
}

type Role = "staff0" | "staff1" | "staff2" | "staff3" | "noise0" | "noise1" | "scanner" | "caller";

const ACCESS_SCRIPT: Array<[Role, string]> = [
  ["staff0", "opened the home page"],
  ["staff1", "opened the about page"],
  ["scanner", "tried /.env — page not found"],
  ["staff2", "opened the contact page"],
  ["noise0", "opened the home page"],
  ["scanner", "tried /admin — page not found"],
  ["staff3", "downloaded the price list"],
  ["caller", "opened the home page"],
  ["staff0", "signed in"],
  ["scanner", "tried /wp-login.php — page not found"],
  ["noise1", "opened the home page"],
  ["scanner", "tried /backup.zip — page not found"],
  ["staff1", "opened the contact page"],
  ["scanner", "tried /server-status — page not found"],
  ["staff2", "signed in"],
  ["scanner", "tried /config.php — page not found"],
  ["staff3", "opened the about page"],
  ["staff0", "downloaded the price list"],
];

const GATEWAY_SCRIPT: Array<[Role, "company" | "site0" | "site1" | "site2" | "odd"]> = [
  ["staff0", "company"],
  ["staff1", "site0"],
  ["staff2", "site1"],
  ["caller", "odd"],
  ["staff3", "site2"],
  ["staff0", "site0"],
  ["caller", "odd"],
  ["noise0", "company"],
  ["staff1", "company"],
  ["caller", "odd"],
  ["staff2", "site2"],
  ["caller", "odd"],
  ["staff3", "site1"],
  ["noise1", "site0"],
  ["caller", "odd"],
  ["staff0", "site1"],
  ["caller", "odd"],
  ["staff1", "site2"],
  ["caller", "odd"],
  ["staff2", "company"],
  ["caller", "odd"],
  ["staff3", "site0"],
  ["caller", "odd"],
];

function roleIp(spec: OfficeCase, role: Role): string {
  switch (role) {
    case "scanner":
      return spec.scannerIp;
    case "caller":
      return spec.callerIp;
    case "staff0":
      return spec.staffIps[0];
    case "staff1":
      return spec.staffIps[1];
    case "staff2":
      return spec.staffIps[2];
    case "staff3":
      return spec.staffIps[3];
    case "noise0":
      return spec.noiseIps[0];
    case "noise1":
      return spec.noiseIps[1];
  }
}

function siteName(spec: OfficeCase, site: "company" | "site0" | "site1" | "site2" | "odd"): string {
  if (site === "company") return COMPANY_SITE;
  if (site === "odd") return spec.suspiciousSite;
  if (site === "site0") return spec.sites[0];
  if (site === "site1") return spec.sites[1];
  return spec.sites[2];
}

const MAIL_SCRIPT: Array<[Role, "company" | "site0" | "site1" | "site2"]> = [
  ["staff0", "company"],
  ["staff1", "site0"],
  ["staff2", "site1"],
  ["noise0", "company"],
  ["staff3", "site2"],
  ["staff0", "site1"],
  ["noise1", "site0"],
  ["staff2", "company"],
];

function clock(index: number): string {
  return `09:${String(index).padStart(2, "0")}`;
}

export function accessLog(spec: OfficeCase): string {
  return ACCESS_SCRIPT.map(([role, action], index) => `${clock(index + 1)}  ${roleIp(spec, role)}  ${action}`).join("\n") + "\n";
}

export function visitsLog(spec: OfficeCase): string {
  return GATEWAY_SCRIPT.map(([role, site], index) => {
    return `${clock(index)}  ${roleIp(spec, role)}  opened ${siteName(spec, site)}`;
  }).join("\n") + "\n";
}

export function mailLog(spec: OfficeCase): string {
  return MAIL_SCRIPT.map(([role, site], index) => {
    return `${clock(index + 5)}  ${roleIp(spec, role)}  sent mail to team@${siteName(spec, site)}`;
  }).join("\n") + "\n";
}

export function allowList(spec: OfficeCase): string {
  return ["# Websites staff may open.", COMPANY_SITE, ...spec.sites, ""].join("\n");
}

export function briefText(): string {
  return [
    "Brightwater Office",
    "Morning logs, 26 Oct 2026.",
    "",
    "Every line is a time, an IP address, and what that person did.",
    "web/access.log is the office website.",
    "visits/sites.log is other websites people opened.",
    "mail/sent.log is mail people sent.",
    "allow.txt lists the websites staff may open.",
    "",
    "The questions are on the left. A new case asks different ones.",
    "Write one answer per file in the answers folder.",
    "Use find and grep. Do not change the logs.",
    "",
  ].join("\n");
}

export function seedFromCase(spec: OfficeCase): LabSeed {
  const files: SeedFile[] = [
    { path: "/home/student/case/brief.txt", content: briefText() },
    { path: "/home/student/case/allow.txt", content: allowList(spec) },
    { path: "/home/student/case/web/access.log", content: accessLog(spec) },
    { path: "/home/student/case/visits/sites.log", content: visitsLog(spec) },
    { path: "/home/student/case/mail/sent.log", content: mailLog(spec) },
    {
      path: "/home/student/case/archive/monday.txt",
      content: "Old roster. Not this morning's log.\n",
    },
    {
      path: "/home/student/case/answers/readme.txt",
      content: "One line in each file. Nothing else. The task tells you the file name.\n",
    },
  ];
  return { cwd: "/home/student/case", files };
}

export function answerValue(spec: OfficeCase, key: AnswerKey): string {
  const access = accessLog(spec).trim().split("\n");
  const visits = visitsLog(spec).trim().split("\n");
  const mail = mailLog(spec).trim().split("\n");
  const ipOn = (line: string) => line.split(/\s+/)[1] ?? "";
  if (key === "odd-ip") return spec.scannerIp;
  if (key === "odd-site") return spec.suspiciousSite;
  if (key === "opener") return spec.callerIp;
  if (key === "first-page") {
    const line = access.find((item) => item.includes("not found")) ?? "";
    return line.split(/\s+/).find((part) => part.startsWith("/")) ?? "";
  }
  if (key === "miss-count") return String(access.filter((line) => line.includes("not found")).length);
  if (key === "first-open") return (visits.find((line) => line.endsWith(`opened ${spec.suspiciousSite}`)) ?? "").split(/\s+/)[0] ?? "";
  if (key === "mail-ip") return ipOn(mail.find((line) => line.includes(`team@${COMPANY_SITE}`)) ?? "");
  if (key === "mail-count") return String(mail.length);
  if (key === "downloader") return ipOn(access.find((line) => line.includes("downloaded")) ?? "");
  if (key === "sign-in") return ipOn(access.find((line) => line.includes("signed in")) ?? "");
  if (key === "last-page") {
    const line = [...access].reverse().find((item) => item.includes("not found")) ?? "";
    return line.split(/\s+/).find((part) => part.startsWith("/")) ?? "";
  }
  if (key === "odd-count") return String(visits.filter((line) => line.endsWith(`opened ${spec.suspiciousSite}`)).length);
  if (key === "contact-ip") return ipOn(access.find((line) => line.includes("opened the contact page")) ?? "");
  return String(access.filter((line) => line.includes("opened the home page")).length);
}

export function evidenceTimeline(spec: OfficeCase, completed: readonly string[]): { title: string; lines: string[] }[] {
  const sections: { title: string; lines: string[] }[] = [];
  const access = accessLog(spec).trim().split("\n");
  const has = (id: string) => completed.includes(id);
  if (has("odd-ip") || has("first-page") || has("miss-count") || has("last-page")) {
    sections.push({ title: "Pages that were not found", lines: access.filter((line) => line.includes("not found")) });
  }
  if (has("odd-site")) sections.push({ title: "Not on the allow list", lines: [spec.suspiciousSite] });
  if (has("opener") || has("first-open") || has("odd-count")) {
    sections.push({
      title: "Who opened it",
      lines: visitsLog(spec)
        .trim()
        .split("\n")
        .filter((line) => line.includes(spec.suspiciousSite)),
    });
  }
  if (has("mail-ip") || has("mail-count") || has("mail-site")) {
    sections.push({ title: "Mail", lines: mailLog(spec).trim().split("\n") });
  }
  if (has("downloader")) sections.push({ title: "Downloaded", lines: access.filter((line) => line.includes("downloaded")) });
  if (has("sign-in")) sections.push({ title: "Signed in", lines: access.filter((line) => line.includes("signed in")) });
  if (has("contact-ip")) sections.push({ title: "Contact page", lines: access.filter((line) => line.includes("opened the contact page")) });
  if (has("home-count")) sections.push({ title: "Home page", lines: access.filter((line) => line.includes("opened the home page")) });
  return sections;
}

function mentions(body: string, value: string): boolean {
  if (/^\d+$/.test(value)) return new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(body);
  return body.includes(value);
}

export function findingGaps(spec: OfficeCase, text: string): string[] {
  const body = text.trim();
  const gaps: string[] = [];
  for (const id of spec.questions) {
    const task = tasksForIds([id]).find((item) => item.id === id);
    if (task?.check.kind === "one-of") {
      if (!spec.sites.some((site) => body.includes(site))) gaps.push(`Add ${findingName(id)}.`);
      continue;
    }
    if (task?.check.kind !== "exact") continue;
    if (!mentions(body, answerValue(spec, task.check.key))) gaps.push(`Add ${findingName(id)}.`);
  }
  if (!/tell the office|i would/i.test(body)) gaps.push("Say what you would tell the office.");
  if (body.length < 80) gaps.push("Write at least two sentences.");
  return gaps;
}

export function findingReady(spec: OfficeCase, text: string): boolean {
  return findingGaps(spec, text).length === 0;
}

export function withFinding(spec: OfficeCase, text: string): OfficeCase {
  const finding = text.slice(0, 2000);
  const shellDone = tasksFor(spec)
    .filter((task) => task.id !== "finding")
    .every((task) => spec.completed.includes(task.id));
  const completed: CaseTaskId[] = spec.completed.filter((id) => id !== "finding");
  if (shellDone && findingReady(spec, finding)) completed.push("finding");
  return { ...spec, finding, completed };
}

export function resumeNote(): string {
  return "Practice log review (Aterx, Brightwater Office). Read logs of what people did, answered a fresh set of questions, and wrote a short finding with the log lines as evidence.";
}

export function isOfficeCase(value: unknown): value is OfficeCase {
  if (!value || typeof value !== "object") return false;
  const spec = value as Partial<OfficeCase>;
  if (typeof spec.id !== "string" || !/^[0-9a-f]{8}$/.test(spec.id)) return false;
  if (!Array.isArray(spec.questions) || spec.questions.length !== 3) return false;
  const groups = spec.questions.map((id) => (typeof id === "string" ? questionGroup(id) : -1));
  if (groups.some((group) => group < 0) || new Set(groups).size !== 3) return false;
  if (typeof spec.notes !== "string" || spec.notes.length > 4000) return false;
  if (spec.finding !== undefined && (typeof spec.finding !== "string" || spec.finding.length > 2000)) return false;
  const ips = [spec.scannerIp, spec.callerIp, ...(spec.staffIps ?? []), ...(spec.noiseIps ?? [])];
  if (!spec.staffIps || spec.staffIps.length !== 4 || !spec.noiseIps || spec.noiseIps.length !== 2) return false;
  if (!ips.every((ip) => typeof ip === "string" && IP_PATTERN.test(ip))) return false;
  const unique = new Set(ips);
  const expected = spec.callerIp === spec.scannerIp ? 7 : 8;
  if (unique.size !== expected) return false;
  if (!spec.sites || spec.sites.length !== 3) return false;
  const sites = [...spec.sites, spec.suspiciousSite];
  if (!sites.every((site) => typeof site === "string" && SITE_PATTERN.test(site))) return false;
  if (sites.includes(COMPANY_SITE)) return false;
  if (new Set(sites).size !== 4) return false;
  if (!Array.isArray(spec.completed)) return false;
  return true;
}

export function normalizeCompleted(ids: unknown, questions: readonly AnswerTaskId[]): CaseTaskId[] {
  const have = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  const completed: CaseTaskId[] = [];
  for (const task of tasksForIds(questions)) {
    if (!have.has(task.id)) break;
    completed.push(task.id);
  }
  return completed;
}
