import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_SERVER = "codepush_dashboard_server_url";
const STORAGE_KEY = "codepush_dashboard_access_key";
const STORAGE_PERSIST = "codepush_dashboard_persist_v1";

type PersistedAuth = {
  serverUrl: string;
  accessKey: string;
  expiresAt: number;
};

export type ConnectionSettings = {
  serverUrl: string;
  accessKey: string;
};

type AuthCtx = {
  settings: ConnectionSettings | null;
  hydrated: boolean;
  setSettings: (s: ConnectionSettings | null) => void;
  saveAndApply: (
    s: ConnectionSettings,
    options?: { rememberDays?: number },
  ) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed === "/__cp") return trimmed;

  let candidate = trimmed;

  // Auto-fix common malformed patterns such as "https://.//domain".
  candidate = candidate.replace(/^https?:\/\/\.?\/+/i, (matched) =>
    matched.toLowerCase().startsWith("https://") ? "https://" : "http://",
  );
  candidate = candidate.replace(/^\.?\/\//, "");

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function sanitizeServerUrlForRuntime(raw: string): string {
  const normalized = normalizeServerUrl(raw);
  if (normalized !== "/__cp") return normalized;
  if (import.meta.env.DEV) return normalized;
  const fallback = import.meta.env.VITE_DEFAULT_SERVER_URL ?? "";
  return normalizeServerUrl(fallback);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const serverUrl =
        sessionStorage.getItem(STORAGE_SERVER) ??
        import.meta.env.VITE_DEFAULT_SERVER_URL ??
        "";
      const accessKey = sessionStorage.getItem(STORAGE_KEY) ?? "";
      const sessionServerUrl = sanitizeServerUrlForRuntime(serverUrl);
      if (sessionServerUrl && accessKey) {
        setSettingsState({ serverUrl: sessionServerUrl, accessKey });
        return;
      }

      const persistedRaw = localStorage.getItem(STORAGE_PERSIST);
      if (!persistedRaw) return;

      const persisted = JSON.parse(persistedRaw) as PersistedAuth;
      if (
        !persisted.serverUrl ||
        !persisted.accessKey ||
        !persisted.expiresAt ||
        persisted.expiresAt <= Date.now()
      ) {
        localStorage.removeItem(STORAGE_PERSIST);
        return;
      }

      const next = {
        serverUrl: sanitizeServerUrlForRuntime(persisted.serverUrl),
        accessKey: persisted.accessKey.trim(),
      };
      if (!next.serverUrl) {
        localStorage.removeItem(STORAGE_PERSIST);
        return;
      }
      sessionStorage.setItem(STORAGE_SERVER, next.serverUrl);
      sessionStorage.setItem(STORAGE_KEY, next.accessKey);
      setSettingsState(next);
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  const saveAndApply = useCallback(
    (s: ConnectionSettings, options?: { rememberDays?: number }) => {
      const next = {
        serverUrl: sanitizeServerUrlForRuntime(s.serverUrl),
        accessKey: s.accessKey.trim(),
      };
      sessionStorage.setItem(STORAGE_SERVER, next.serverUrl);
      sessionStorage.setItem(STORAGE_KEY, next.accessKey);
      const rememberDays = options?.rememberDays ?? 0;
      if (rememberDays > 0) {
        const persisted: PersistedAuth = {
          serverUrl: next.serverUrl,
          accessKey: next.accessKey,
          expiresAt: Date.now() + rememberDays * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_PERSIST, JSON.stringify(persisted));
      } else {
        localStorage.removeItem(STORAGE_PERSIST);
      }
      setSettingsState(next);
    },
    [],
  );

  const setSettings = useCallback(
    (s: ConnectionSettings | null) => {
      if (s === null) {
        sessionStorage.removeItem(STORAGE_SERVER);
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_PERSIST);
        setSettingsState(null);
        return;
      }
      saveAndApply(s);
    },
    [saveAndApply],
  );

  const value = useMemo(
    () => ({ settings, hydrated, setSettings, saveAndApply }),
    [settings, hydrated, setSettings, saveAndApply],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
