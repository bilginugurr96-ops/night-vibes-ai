import { useState, useCallback } from "react";

const STORAGE_KEY = "lyne_viewed_stories";
const TTL = 24 * 3600 * 1000; // 24h

function loadViewed(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { ids: string[]; ts: number };
      if (Date.now() - parsed.ts < TTL) return new Set(parsed.ids);
    }
  } catch {}
  return new Set();
}

function saveViewed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: Array.from(ids), ts: Date.now() }));
  } catch {}
}

export function useViewedStories() {
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(loadViewed);

  const markViewed = useCallback((userId: string) => {
    setViewedUserIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set([...prev, userId]);
      saveViewed(next);
      return next;
    });
  }, []);

  return { viewedUserIds, markViewed };
}
