import type { PlanId } from "../plans";

export type Account = {
  name: string;
  plan: PlanId;
  completed: Record<string, string[]>;
};

const KEY = "aterx.account.v1";
const CHANGE = "aterx-account";

export const serverAccount: Account = { name: "Student", plan: "free", completed: {} };

let cachedRaw: string | null | undefined;
let cachedAccount: Account = serverAccount;

export function emptyAccount(): Account {
  return { name: "Student", plan: "free", completed: {} };
}

export function subscribeAccount(onChange: () => void): () => void {
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

export function loadAccount(): Account {
  if (typeof window === "undefined") return serverAccount;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedAccount;
  cachedRaw = raw;
  if (!raw) {
    cachedAccount = serverAccount;
    return cachedAccount;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Account>;
    const plan = parsed.plan === "pro" || parsed.plan === "plus" ? parsed.plan : "free";
    const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 40) : "Student";
    const completed: Record<string, string[]> = {};
    if (parsed.completed && typeof parsed.completed === "object") {
      for (const [slug, ids] of Object.entries(parsed.completed)) {
        if (Array.isArray(ids)) completed[slug] = ids.filter((id) => typeof id === "string");
      }
    }
    cachedAccount = { name, plan, completed };
    return cachedAccount;
  } catch {
    cachedAccount = serverAccount;
    return cachedAccount;
  }
}

export function saveAccount(account: Account): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(account);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedAccount = account;
  window.dispatchEvent(new Event(CHANGE));
}

export function completedCount(account: Account, slug: string, taskIds: string[]): number {
  const saved = new Set(account.completed[slug] ?? []);
  return taskIds.filter((id) => saved.has(id)).length;
}
