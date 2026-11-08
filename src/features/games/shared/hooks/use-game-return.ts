"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Returns to the exact screen from which the current game was opened. */
export function useGameReturn(): () => void {
  const router = useRouter();
  return useCallback(() => router.back(), [router]);
}
