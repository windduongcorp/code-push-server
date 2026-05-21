import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { SessionsManager } from "@/features/apps/components/SessionsManager";
import { toast } from "sonner";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SessionsPage() {
  const { settings } = useAuth();
  const [sessions, setSessions] = useState<api.SessionInfo[]>([]);

  const load = useCallback(async () => {
    if (!settings) return;
    try {
      setSessions(await api.listSessions(settings));
    } catch (error) {
      toast.error(getErrorMessage(error) || "Không tải được sessions");
    }
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SessionsManager
      sessions={sessions}
      onRemove={async (machine) => {
        if (!settings) return;
        await api.removeSession(settings, machine);
        await load();
      }}
    />
  );
}
