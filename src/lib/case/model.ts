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
  hint: string;
  marked: string;
};

export const CASE_TASKS: CaseTask[] = [
  {
    id: "find-log",
    prompt: "The morning web log is somewhere under this folder. Use find so its path is on screen.",
    hint: "find . -name access.log",
    marked: "web log",
  },
  {
    id: "scanner",
    prompt:
      "One address asked for pages this site does not have. The others did not. Write only that address to answers/scanner.txt.",
    hint: "grep ' 404 ' web/access.log, then echo that address into the file.",
    marked: "odd address",
  },
  {
    id: "site",
    prompt: "One website in the gateway log is not on the list in allow.txt. Write only that website to answers/site.txt.",
    hint: "Read allow.txt and gateway/office.log. Write the name that is missing from the list.",
    marked: "website",
  },
  {
    id: "caller",
    prompt: "Find the address that called the website you just wrote down. Write only that address to answers/caller.txt.",
    hint: "grep that website in gateway/office.log.",
    marked: "calling address",
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

const ACCESS_SCRIPT: Array<[Role, string, number]> = [
  ["staff0", "/", 200],
  ["staff1", "/about", 200],
  ["scanner", "/.env", 404],
  ["staff2", "/contact", 200],
  ["noise0", "/", 200],
  ["scanner", "/admin", 404],
  ["staff3", "/careers", 200],
  ["caller", "/", 200],
  ["staff0", "/about", 200],
  ["scanner", "/wp-login.php", 404],
  ["noise1", "/", 200],
  ["scanner", "/backup.zip", 404],
  ["staff1", "/contact", 200],
  ["scanner", "/server-status", 404],
  ["staff2", "/", 200],
  ["scanner", "/config.php", 404],
  ["staff3", "/about", 200],
  ["staff0", "/careers", 200],
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

export function accessLog(spec: OfficeCase): string {
  return ACCESS_SCRIPT.map(([role, path, status], index) => {
    const minute = String(index + 1).padStart(2, "0");
    const size = status === 200 ? 1820 : 412;
    return `${roleIp(spec, role)} - - [26/Oct/2026:09:${minute}:12 +1100] "GET ${path} HTTP/1.1" ${status} ${size}`;
  }).join("\n") + "\n";
}

export function gatewayLog(spec: OfficeCase): string {
  return GATEWAY_SCRIPT.map(([role, site], index) => {
    const minute = String(index).padStart(2, "0");
    return `2026-10-26T09:${minute}:30 ${roleIp(spec, role)} ${siteName(spec, site)}`;
  }).join("\n") + "\n";
}

export function allowList(spec: OfficeCase): string {
  return ["# Names Brightwater Office is allowed to open.", COMPANY_SITE, ...spec.sites, ""].join("\n");
}

export function briefText(): string {
  return [
    "Brightwater Office",
    "Morning export, 26 Oct 2026.",
    "",
    "The web log and the gateway log are in this folder.",
    "Staff should only open the names in allow.txt.",
    "One address asked for pages this site does not have.",
    "One website in the gateway log is not on that list.",
    "Write each answer as a single line in the answers folder.",
    "Use grep and find. Leave the logs as they are.",
    "",
  ].join("\n");
}

export function seedFromCase(spec: OfficeCase): LabSeed {
  const files: SeedFile[] = [
    { path: "/home/student/case/brief.txt", content: briefText() },
    { path: "/home/student/case/allow.txt", content: allowList(spec) },
    { path: "/home/student/case/web/access.log", content: accessLog(spec) },
    { path: "/home/student/case/gateway/office.log", content: gatewayLog(spec) },
    {
      path: "/home/student/case/archive/monday.txt",
      content: "Roster from last Monday. Not part of this morning's export.\n",
    },
    {
      path: "/home/student/case/answers/readme.txt",
      content: "One answer per file, one line, nothing else. The open task names the file.\n",
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
