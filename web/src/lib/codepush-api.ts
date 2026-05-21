import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ConnectionSettings } from "./auth-context";

const API_VERSION = 2;

export type AppRow = { name: string };
export type Deployment = {
  name: string;
  key?: string;
  package?: PackageInfo;
};
export type PackageInfo = {
  label?: string;
  appVersion?: string;
  description?: string;
  packageHash?: string;
  rollout?: number;
  isMandatory?: boolean;
  isDisabled?: boolean;
};
export type DeployHistoryPackage = PackageInfo & {
  releasedBy?: string;
  uploadTime?: number;
};

export type DeploymentMetrics = Record<
  string,
  { active: number; downloaded?: number; installed?: number; failed?: number }
>;
export type CollaboratorMap = Record<
  string,
  { permission?: string; isCurrentAccount?: boolean }
>;
export type AccessKeyInfo = {
  friendlyName?: string;
  name?: string;
  createdBy?: string;
  createdTime?: number;
  expires?: number;
  isSession?: boolean;
};
export type CreatedAccessKey = {
  key: string;
  friendlyName?: string;
  expires?: number;
};
export type SessionInfo = {
  machineName: string;
  loggedInTime?: number;
};
export type AccountInfo = {
  name?: string;
  email?: string;
  linkedProviders?: string[];
};

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function parseErrorBody(data: unknown, statusText?: string): string {
  if (typeof data === "string") {
    try {
      const json = JSON.parse(data) as { message?: string };
      if (json?.message) return json.message;
    } catch {
      /* ignore */
    }
    return data || statusText || "Request failed";
  }

  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return statusText || "Request failed";
}

function endpointUrl(cfg: ConnectionSettings, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = cfg.serverUrl.replace(/\/+$/, "");
  return `${base}${p}`;
}

const acceptHeader = `application/vnd.code-push.v${API_VERSION}+json`;

type AuthorizedRequestConfig = Omit<AxiosRequestConfig, "url" | "headers"> & {
  headers?: Record<string, string>;
};

async function authorizedRequest<T = unknown>(
  cfg: ConnectionSettings,
  path: string,
  init: AuthorizedRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return axios.request<T>({
    ...init,
    url: endpointUrl(cfg, path),
    headers: {
      Accept: acceptHeader,
      Authorization: `Bearer ${cfg.accessKey}`,
      ...init.headers,
    },
    validateStatus: () => true,
  });
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function assertStatusOk(
  res: AxiosResponse<unknown>,
  expectedStatuses?: number[],
): void {
  const ok = expectedStatuses
    ? expectedStatuses.includes(res.status)
    : isSuccessStatus(res.status);
  if (!ok) {
    throw new ApiError(parseErrorBody(res.data, res.statusText), res.status);
  }
}

export async function checkAuthenticated(
  cfg: ConnectionSettings,
): Promise<boolean> {
  const res = await authorizedRequest(cfg, "/authenticated");
  if (res.status === 401 || res.status === 403) {
    return false;
  }
  assertStatusOk(res);
  return true;
}

export async function listApps(cfg: ConnectionSettings): Promise<AppRow[]> {
  const res = await authorizedRequest<{ apps?: AppRow[] }>(cfg, "/apps");
  assertStatusOk(res);
  return res.data.apps ?? [];
}

export async function getAccount(
  cfg: ConnectionSettings,
): Promise<AccountInfo> {
  const res = await authorizedRequest<{ account?: AccountInfo }>(
    cfg,
    "/account",
  );
  assertStatusOk(res);
  return res.data.account ?? {};
}

export async function createApp(
  cfg: ConnectionSettings,
  name: string,
): Promise<void> {
  const res = await authorizedRequest(cfg, "/apps", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    data: { name },
  });
  assertStatusOk(res, [201]);
}

export async function deleteApp(
  cfg: ConnectionSettings,
  name: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
  assertStatusOk(res);
}

export async function renameApp(
  cfg: ConnectionSettings,
  oldName: string,
  newName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(oldName)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: { name: newName },
    },
  );
  assertStatusOk(res);
}

export async function transferApp(
  cfg: ConnectionSettings,
  appName: string,
  email: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/transfer/${encodeURIComponent(email)}`,
    { method: "POST" },
  );
  assertStatusOk(res, [201]);
}

export async function listCollaborators(
  cfg: ConnectionSettings,
  appName: string,
): Promise<CollaboratorMap> {
  const res = await authorizedRequest<{ collaborators?: CollaboratorMap }>(
    cfg,
    `/apps/${encodeURIComponent(appName)}/collaborators`,
  );
  assertStatusOk(res);
  return res.data.collaborators ?? {};
}

export async function addCollaborator(
  cfg: ConnectionSettings,
  appName: string,
  email: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/collaborators/${encodeURIComponent(email)}`,
    { method: "POST" },
  );
  assertStatusOk(res, [201]);
}

export async function removeCollaborator(
  cfg: ConnectionSettings,
  appName: string,
  email: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/collaborators/${encodeURIComponent(email)}`,
    { method: "DELETE" },
  );
  assertStatusOk(res, [204]);
}

export async function listAccessKeys(
  cfg: ConnectionSettings,
): Promise<AccessKeyInfo[]> {
  const res = await authorizedRequest<{ accessKeys?: AccessKeyInfo[] }>(
    cfg,
    "/accessKeys",
  );
  assertStatusOk(res);
  return res.data.accessKeys ?? [];
}

export async function createAccessKey(
  cfg: ConnectionSettings,
  friendlyName: string,
  ttlMs?: number,
): Promise<CreatedAccessKey> {
  const body: { friendlyName: string; ttl?: number } = { friendlyName };
  if (ttlMs && ttlMs > 0) body.ttl = ttlMs;
  const res = await authorizedRequest<{ accessKey?: AccessKeyInfo }>(
    cfg,
    "/accessKeys",
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: body,
    },
  );
  assertStatusOk(res, [201]);
  return {
    key: res.data.accessKey?.name || "",
    friendlyName: res.data.accessKey?.friendlyName,
    expires: res.data.accessKey?.expires,
  };
}

export async function patchAccessKey(
  cfg: ConnectionSettings,
  oldName: string,
  nextName?: string,
  ttlMs?: number,
): Promise<void> {
  const body: { friendlyName?: string; ttl?: number } = {};
  if (nextName && nextName.trim()) body.friendlyName = nextName.trim();
  if (ttlMs && ttlMs > 0) body.ttl = ttlMs;
  const res = await authorizedRequest(
    cfg,
    `/accessKeys/${encodeURIComponent(oldName)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: body,
    },
  );
  assertStatusOk(res);
}

export async function removeAccessKey(
  cfg: ConnectionSettings,
  keyName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/accessKeys/${encodeURIComponent(keyName)}`,
    { method: "DELETE" },
  );
  assertStatusOk(res, [204]);
}

export async function listSessions(
  cfg: ConnectionSettings,
): Promise<SessionInfo[]> {
  const keys = await listAccessKeys(cfg);
  const now = Date.now();
  const sessionMap = new Map<string, SessionInfo>();
  for (const k of keys) {
    if (!k.isSession) continue;
    if (k.expires && k.expires <= now) continue;
    const machineName = k.createdBy || "unknown";
    sessionMap.set(machineName, {
      machineName,
      loggedInTime: k.createdTime,
    });
  }
  return Array.from(sessionMap.values());
}

export async function removeSession(
  cfg: ConnectionSettings,
  machineName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/sessions/${encodeURIComponent(machineName)}`,
    { method: "DELETE" },
  );
  assertStatusOk(res, [204]);
}

export async function listDeployments(
  cfg: ConnectionSettings,
  appName: string,
): Promise<Deployment[]> {
  const res = await authorizedRequest<{ deployments?: Deployment[] }>(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments`,
  );
  assertStatusOk(res);
  return res.data.deployments ?? [];
}

export async function createDeployment(
  cfg: ConnectionSettings,
  appName: string,
  name: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: { name },
    },
  );
  assertStatusOk(res, [201]);
}

export async function renameDeployment(
  cfg: ConnectionSettings,
  appName: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(oldName)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: { name: newName },
    },
  );
  assertStatusOk(res);
}

export async function deleteDeployment(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}`,
    { method: "DELETE" },
  );
  assertStatusOk(res);
}

export async function getDeployment(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
): Promise<Deployment> {
  const res = await authorizedRequest<{ deployment?: Deployment }>(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}`,
  );
  assertStatusOk(res);
  if (!res.data.deployment)
    throw new ApiError("Missing deployment in response", res.status);
  return res.data.deployment;
}

export async function getHistory(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
): Promise<DeployHistoryPackage[]> {
  const res = await authorizedRequest<{ history?: DeployHistoryPackage[] }>(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/history`,
  );
  assertStatusOk(res);
  return res.data.history ?? [];
}

export async function getMetrics(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
): Promise<DeploymentMetrics> {
  const res = await authorizedRequest<{ metrics?: DeploymentMetrics }>(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/metrics`,
  );
  assertStatusOk(res);
  return res.data.metrics ?? {};
}

export async function promote(
  cfg: ConnectionSettings,
  appName: string,
  sourceName: string,
  destName: string,
  packageInfo: PackageInfo,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(sourceName)}/promote/${encodeURIComponent(destName)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: { packageInfo },
    },
  );
  assertStatusOk(res);
}

export async function rollback(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
  targetLabel?: string,
): Promise<void> {
  const tail = targetLabel ? encodeURIComponent(targetLabel) : "";
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/rollback/${tail}`,
    { method: "POST" },
  );
  assertStatusOk(res);
}

export async function uploadRelease(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
  zipFile: File,
  meta: PackageInfo & { appVersion?: string },
): Promise<void> {
  const fd = new FormData();
  fd.append("package", zipFile);
  fd.append("packageInfo", JSON.stringify(meta));
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/release`,
    {
      method: "POST",
      data: fd,
    },
  );
  assertStatusOk(res);
}

export async function patchRelease(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
  packageInfo: PackageInfo & { label: string },
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/release`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      data: { packageInfo },
    },
  );
  assertStatusOk(res, [204]);
}

export async function clearDeploymentHistory(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
): Promise<void> {
  const res = await authorizedRequest(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/history`,
    { method: "DELETE" },
  );
  assertStatusOk(res, [204]);
}
