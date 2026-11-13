"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Left/right arrow keys move between chapters, handy when presenting. Ignored while typing. */
export function KeyboardNav({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && next) router.push(next);
      if (e.key === "ArrowLeft" && prev) router.push(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev, next]);
  return null;
}
