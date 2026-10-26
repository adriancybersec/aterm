"use client";

import { useSyncExternalStore } from "react";
import { loadCase, subscribeCase } from "./store";
import type { OfficeCase } from "./model";

export function useCase(): OfficeCase | null {
  return useSyncExternalStore(subscribeCase, loadCase, () => null);
}
