"use client";

import { useEffect, useState } from "react";
import { SUBSCRIPTION_STORAGE_KEY } from "@/lib/storageKeys";

export function useSubscription() {
  const [email, setEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { email?: string };
      setEmail(parsed.email ?? "");
    }
    setHydrated(true);
  }, []);

  return { isSubscribed: email.trim().length > 0, hydrated };
}
