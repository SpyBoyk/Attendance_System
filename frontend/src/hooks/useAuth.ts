import { useCallback, useEffect, useState } from "react";

import { AUTH_CHANGED_EVENT, clearStoredAuth, getStoredAuth } from "@/api/client";
import type { User } from "@/types";

export function useAuth(): { user: User | null; isAuthenticated: boolean; logout: () => void } {
  const [user, setUser] = useState<User | null>(() => getStoredAuth()?.user ?? null);

  useEffect(() => {
    const sync = () => setUser(getStoredAuth()?.user ?? null);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const logout = useCallback(() => clearStoredAuth(), []);

  return { user, isAuthenticated: user !== null, logout };
}
