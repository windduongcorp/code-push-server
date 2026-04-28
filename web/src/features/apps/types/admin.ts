import type * as api from "@/lib/codepush-api";

export type AdminTab = "apps" | "access-keys" | "collaborators" | "sessions";

export type AdminData = {
  apps: api.AppRow[];
  accessKeys: api.AccessKeyInfo[];
  sessions: api.SessionInfo[];
  collaborators: api.CollaboratorMap;
  selectedAppForCollaborators: string;
};
