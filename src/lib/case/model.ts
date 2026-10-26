import type { LabSeed } from "../shell/shell";
import type { SeedFile } from "../shell/vfs";

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

export type CaseTaskId = "find-log" | "scanner" | "site" | "caller";

export type CaseTask = {
  id: CaseTaskId;
  prompt: string;
  hints: string[];
  marked: string;
};

export const CASE_TASKS: CaseTask[] = [
  {
    id: "find-log",
    prompt: "Find the log of what people did on the office website. Use find so the file path shows on screen.",
    hints: [
      "The file is named access.log. It sits in a folder under here.",
      "find looks through folders. A dot means start in this folder.",
      "Type find . -name access.log and press Enter.",
    ],
    marked: "web log",
  },
  {
    id: "scanner",
    prompt: "One IP address tried pages that are not real. The others did not. Write only that IP in answers/scanner.txt.",
    hints: [
      "Open web/access.log. Each line is a time, an IP address, and what that person did.",
      "Normal lines say opened, signed in, or downloaded. The odd lines say not found.",
      "Type grep \"not found\" web/access.log. One IP is on every one of those lines.",
      "Save only that IP. Type echo THE-IP > answers/scanner.txt",
    ],
    marked: "odd IP",
  },
  {
    id: "site",
    prompt: "People also opened other websites. One of them is not on the allow.txt list. Write only that website in answers/site.txt.",
    hints: [
      "allow.txt is the list of websites staff may open.",
      "visits/sites.log is another log. Each line is a time, an IP address, and the website they opened.",
      "Type cat allow.txt and then cat visits/sites.log. Look for the website that is missing from the list.",
      "You can check a name with grep. Type grep website-name allow.txt. No match means it is not allowed.",
      "Save only the website. Type echo the-website > answers/site.txt",
    ],
    marked: "website",
  },
  {
    id: "caller",
    prompt: "Which IP address opened that website? Write only that IP in answers/caller.txt.",
    hints: [
      "Use the website you just wrote down.",
      "Type grep the-website visits/sites.log",
      "On each matching line the IP address is the number after the time.",
      "Save only that IP. Type echo THE-IP > answers/caller.txt",
    ],
    marked: "caller IP",
  },
];

export type OfficeCase = {
  id: string;
  scannerIp: string;
  callerIp: string;
  staffIps: string[];
  noiseIps: string[];
  sites: string[];
  suspiciousSite: string;
  notes: string;
  completed: CaseTaskId[];
};

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

export function generateCase(rng: () => number = randomUnit): OfficeCase {
  const ips = pickIps(8, rng);
  const scannerIp = ips[0];
  const callerIp = rng() < 0.5 ? scannerIp : ips[1];
  return {
    id: caseId(rng),
    scannerIp,
    callerIp,
    staffIps: ips.slice(2, 6),
    noiseIps: ips.slice(6, 8),
    sites: take(BENIGN_SITES, 3, rng),
    suspiciousSite: take(ODD_SITES, 1, rng)[0],
    notes: "",
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
    "One IP tried pages that are not real.",
    "One website in the visits log is not on allow.txt.",
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

export function isOfficeCase(value: unknown): value is OfficeCase {
  if (!value || typeof value !== "object") return false;
  const spec = value as Partial<OfficeCase>;
  if (typeof spec.id !== "string" || !/^[0-9a-f]{8}$/.test(spec.id)) return false;
  if (typeof spec.notes !== "string" || spec.notes.length > 4000) return false;
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

export function normalizeCompleted(ids: unknown): CaseTaskId[] {
  const have = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  const completed: CaseTaskId[] = [];
  for (const task of CASE_TASKS) {
    if (!have.has(task.id)) break;
    completed.push(task.id);
  }
  return completed;
}
