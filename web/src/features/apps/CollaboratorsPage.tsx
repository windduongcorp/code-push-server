import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { CollaboratorsManager } from "@/features/apps/components/CollaboratorsManager";
import { toast } from "sonner";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function CollaboratorsPage() {
  const { settings } = useAuth();
  const [apps, setApps] = useState<api.AppRow[]>([]);
  const [selectedAppForCollaborators, setSelectedAppForCollaborators] =
    useState("");
  const [collaborators, setCollaborators] = useState<api.CollaboratorMap>({});
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");

  const loadApps = useCallback(async () => {
    if (!settings) return;
    try {
      const list = await api.listApps(settings);
      setApps(list);
      if (!selectedAppForCollaborators && list[0]) {
        setSelectedAppForCollaborators(list[0].name);
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || "Không tải được danh sách app");
    }
  }, [selectedAppForCollaborators, settings]);

  const loadCollaborators = useCallback(async () => {
    if (!settings || !selectedAppForCollaborators) {
      setCollaborators({});
      return;
    }
    try {
      setCollaborators(
        await api.listCollaborators(settings, selectedAppForCollaborators),
      );
    } catch (error) {
      toast.error(getErrorMessage(error) || "Không tải được collaborator");
    }
  }, [selectedAppForCollaborators, settings]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  return (
    <CollaboratorsManager
      apps={apps}
      selectedApp={selectedAppForCollaborators}
      collaborators={collaborators}
      email={newCollaboratorEmail}
      setSelectedApp={setSelectedAppForCollaborators}
      setEmail={setNewCollaboratorEmail}
      onAdd={async () => {
        if (
          !settings ||
          !selectedAppForCollaborators ||
          !newCollaboratorEmail.trim()
        )
          return;
        try {
          await api.addCollaborator(
            settings,
            selectedAppForCollaborators,
            newCollaboratorEmail.trim(),
          );
          setNewCollaboratorEmail("");
          await loadCollaborators();
        } catch (error) {
          toast.error(getErrorMessage(error) || "Thêm collaborator thất bại");
        }
      }}
      onRemove={async (email) => {
        if (!settings || !selectedAppForCollaborators) return;
        await api.removeCollaborator(
          settings,
          selectedAppForCollaborators,
          email,
        );
        await loadCollaborators();
      }}
    />
  );
}
