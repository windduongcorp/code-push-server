import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_SERVER = "codepush_dashboard_server_url";
const STORAGE_KEY = "codepush_dashboard_access_key";

export type ConnectionSettings = {
  serverUrl: string;
  accessKey: string;
};

type AuthCtx = {
  settings: ConnectionSettings | null;
  setSettings: (s: ConnectionSettings | null) => void;
  saveAndApply: (s: ConnectionSettings) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeServerUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings | null>(null);

  useEffect(() => {
    try {
      const serverUrl = sessionStorage.getItem(STORAGE_SERVER) ?? import.meta.env.VITE_DEFAULT_SERVER_URL ?? "";
      const accessKey = sessionStorage.getItem(STORAGE_KEY) ?? "";
      if (serverUrl && accessKey) {
        setSettingsState({ serverUrl: normalizeServerUrl(serverUrl), accessKey });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveAndApply = useCallback((s: ConnectionSettings) => {
    const next = {
      serverUrl: normalizeServerUrl(s.serverUrl),
      accessKey: s.accessKey.trim(),
    };
    sessionStorage.setItem(STORAGE_SERVER, next.serverUrl);
    sessionStorage.setItem(STORAGE_KEY, next.accessKey);
    setSettingsState(next);
  }, []);

  const setSettings = useCallback((s: ConnectionSettings | null) => {
    if (s === null) {
      sessionStorage.removeItem(STORAGE_SERVER);
      sessionStorage.removeItem(STORAGE_KEY);
      setSettingsState(null);
      return;
    }
    saveAndApply(s);
  }, [saveAndApply]);

  const value = useMemo(() => ({ settings, setSettings, saveAndApply }), [settings, setSettings, saveAndApply]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
