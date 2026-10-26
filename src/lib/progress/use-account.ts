"use client";

import { useSyncExternalStore } from "react";
import { loadAccount, serverAccount, subscribeAccount, type Account } from "./store";

export function useAccount(): Account {
  return useSyncExternalStore(subscribeAccount, loadAccount, () => serverAccount);
}
