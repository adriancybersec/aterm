import { isOfficeCase, normalizeCompleted, type OfficeCase } from "./model";

const KEY = "aterx.case.v1";
const CHANGE = "aterx-case";

let cachedRaw: string | null | undefined;
let cachedCase: OfficeCase | null = null;

export function subscribeCase(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const notify = () => {
    cachedRaw = undefined;
    onChange();
  };
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", notify);
  };
}

export function loadCase(): OfficeCase | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedCase;
  cachedRaw = raw;
  if (!raw) {
    cachedCase = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isOfficeCase(parsed)) {
      cachedCase = null;
      return null;
    }
    cachedCase = {
      ...parsed,
      finding: typeof parsed.finding === "string" ? parsed.finding.slice(0, 2000) : "",
      completed: normalizeCompleted(parsed.completed, parsed.questions),
      notes: parsed.notes.slice(0, 4000),
    };
    return cachedCase;
  } catch {
    cachedCase = null;
    return null;
  }
}

export function saveCase(spec: OfficeCase): void {
  if (typeof window === "undefined") return;
  const next = {
    ...spec,
    notes: spec.notes.slice(0, 4000),
    finding: spec.finding.slice(0, 2000),
    completed: normalizeCompleted(spec.completed, spec.questions),
  };
  const raw = JSON.stringify(next);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedCase = next;
  window.dispatchEvent(new Event(CHANGE));
}

export function clearCase(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  cachedRaw = null;
  cachedCase = null;
  window.dispatchEvent(new Event(CHANGE));
}
