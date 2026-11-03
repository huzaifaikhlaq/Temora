"use client";

import { useEffect, useSyncExternalStore } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";

export function useDemoState() {
  const state = useSyncExternalStore(
    demoRepository.subscribe,
    demoRepository.getSnapshot,
    demoRepository.getServerSnapshot,
  );

  useEffect(() => {
    demoRepository.hydrate();
  }, []);

  return state;
}
