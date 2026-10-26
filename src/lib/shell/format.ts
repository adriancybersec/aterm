import type { FsNode } from "./vfs";

export const SEED_TIME = Date.parse("2026-10-26T09:00:00+11:00");

const UID_NAMES: Record<number, string> = {
  0: "root",
  1000: "student",
  1001: "lab",
};

const GID_NAMES: Record<number, string> = {
  0: "root",
  1000: "student",
  1001: "lab",
};

export function userName(uid: number): string {
  return UID_NAMES[uid] ?? String(uid);
}

export function groupName(gid: number): string {
  return GID_NAMES[gid] ?? String(gid);
}

export function formatMode(node: Pick<FsNode, "type" | "mode">): string {
  const bits = node.mode & 0o777;
  let out = node.type === "dir" ? "d" : "-";
  const chars = "rwx";
  for (let i = 0; i < 9; i++) {
    out += bits & (1 << (8 - i)) ? chars[i % 3] : "-";
  }
  return out;
}

export function formatMtime(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")} ${get("day")} ${get("hour")}:${get("minute")}`;
}

export function octalMode(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, "0");
}

export function applyMode(mode: number, spec: string): number {
  if (/^[0-7]{3,4}$/.test(spec)) {
    return parseInt(spec, 8) & 0o777;
  }

  let next = mode & 0o777;
  for (const clause of spec.split(",")) {
    const match = /^([ugoa]*)([+-=])([rwx]+)$/.exec(clause);
    if (!match) {
      throw new Error(`chmod: invalid mode: '${spec}'`);
    }
    const who = match[1] || "a";
    const op = match[2];
    const perms = match[3];
    const targets = who.includes("a") ? ["u", "g", "o"] : [...new Set(who)];

    if (op === "=") {
      for (const target of targets) {
        const shift = target === "u" ? 6 : target === "g" ? 3 : 0;
        let bits = 0;
        for (const perm of perms) {
          bits |= (perm === "r" ? 4 : perm === "w" ? 2 : 1) << shift;
        }
        next = (next & ~(0o7 << shift)) | bits;
      }
      continue;
    }

    let bits = 0;
    for (const target of targets) {
      const shift = target === "u" ? 6 : target === "g" ? 3 : 0;
      for (const perm of perms) {
        bits |= (perm === "r" ? 4 : perm === "w" ? 2 : 1) << shift;
      }
    }
    next = op === "+" ? next | bits : next & ~bits;
  }

  return next & 0o777;
}

export function splitLines(text: string): string[] {
  if (text === "") return [];
  const parts = text.split("\n");
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

export function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (const char of pattern) {
    if (char === "*") source += ".*";
    else if (char === "?") source += ".";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}

const FS_WHY: Record<string, string> = {
  ENOENT: "No such file or directory",
  EACCES: "Permission denied",
  EEXIST: "File exists",
  ENOTDIR: "Not a directory",
  EISDIR: "Is a directory",
  ENOTEMPTY: "Directory not empty",
  EINVAL: "Invalid argument",
};

export function fsWhy(code: string, fallback?: string): string {
  return FS_WHY[code] ?? fallback ?? code;
}
