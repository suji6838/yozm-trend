"use client";

import { useEffect, useState } from "react";
import { Trend } from "@/data/trends";
import { SAVED_STORAGE_KEY } from "@/lib/storageKeys";

export function useSavedTrends() {
  const [savedTrends, setSavedTrends] = useState<Trend[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (raw) setSavedTrends(JSON.parse(raw));
    setHydrated(true);
  }, []);

  const toggleSave = (trend: Trend) => {
    setSavedTrends((prev) => {
      const next = prev.some((t) => t.id === trend.id)
        ? prev.filter((t) => t.id !== trend.id)
        : [...prev, trend];
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const savedIds = savedTrends.map((t) => t.id);

  return { savedTrends, savedIds, toggleSave, hydrated };
}
