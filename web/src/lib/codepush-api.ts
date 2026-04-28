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

export type DeploymentMetrics = Record<string, { active: number; downloaded?: number; installed?: number; failed?: number }>;
export type CollaboratorMap = Record<string, { permission?: string; isCurrentAccount?: boolean }>;
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

/** Parse CodePush REST error payloads or plain text. */
async function parseErrorBody(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { message?: string };
    if (json?.message) return json.message as string;
  } catch {
    /* ignore */
  }
  return text || res.statusText || "Request failed";
}

function endpointUrl(cfg: ConnectionSettings, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = cfg.serverUrl.replace(/\/+$/, "");
  return `${base}${p}`;
}

const acceptHeader = `application/vnd.code-push.v${API_VERSION}+json`;

async function authorizedFetch(
  cfg: ConnectionSettings,
  path: string,
  init: RequestInit & { parseJson?: boolean } = {}
): Promise<Response> {
  const { parseJson: _omit, ...rest } = init;
  return fetch(endpointUrl(cfg, path), {
    ...rest,
    headers: {
      Accept: acceptHeader,
      Authorization: `Bearer ${cfg.accessKey}`,
      ...rest.headers,
    },
  });
}

export async function checkAuthenticated(cfg: ConnectionSettings): Promise<boolean> {
  const res = await authorizedFetch(cfg, "/authenticated");
  if (res.status === 401 || res.status === 403) {
    return false;
  }
  if (!res.ok) {
    throw new ApiError(await parseErrorBody(res), res.status);
  }
  return res.ok;
}

export async function listApps(cfg: ConnectionSettings): Promise<AppRow[]> {
  const res = await authorizedFetch(cfg, "/apps");
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { apps?: AppRow[] };
  return data.apps ?? [];
}

export async function getAccount(cfg: ConnectionSettings): Promise<AccountInfo> {
  const res = await authorizedFetch(cfg, "/account");
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { account?: AccountInfo };
  return data.account ?? {};
}

export async function createApp(cfg: ConnectionSettings, name: string): Promise<void> {
  const res = await authorizedFetch(cfg, "/apps", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok && res.status !== 201) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function deleteApp(cfg: ConnectionSettings, name: string): Promise<void> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(name)}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function renameApp(cfg: ConnectionSettings, oldName: string, newName: string): Promise<void> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(oldName)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function transferApp(cfg: ConnectionSettings, appName: string, email: string): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/transfer/${encodeURIComponent(email)}`,
    { method: "POST" }
  );
  if (!res.ok && res.status !== 201) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function listCollaborators(cfg: ConnectionSettings, appName: string): Promise<CollaboratorMap> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/collaborators`);
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { collaborators?: CollaboratorMap };
  return data.collaborators ?? {};
}

export async function addCollaborator(cfg: ConnectionSettings, appName: string, email: string): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/collaborators/${encodeURIComponent(email)}`,
    { method: "POST" }
  );
  if (!res.ok && res.status !== 201) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function removeCollaborator(cfg: ConnectionSettings, appName: string, email: string): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/collaborators/${encodeURIComponent(email)}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function listAccessKeys(cfg: ConnectionSettings): Promise<AccessKeyInfo[]> {
  const res = await authorizedFetch(cfg, "/accessKeys");
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { accessKeys?: AccessKeyInfo[] };
  return data.accessKeys ?? [];
}

export async function createAccessKey(cfg: ConnectionSettings, friendlyName: string, ttlMs?: number): Promise<CreatedAccessKey> {
  const body: { friendlyName: string; ttl?: number } = { friendlyName };
  if (ttlMs && ttlMs > 0) body.ttl = ttlMs;
  const res = await authorizedFetch(cfg, "/accessKeys", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 201) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { accessKey?: AccessKeyInfo };
  return {
    key: data.accessKey?.name || "",
    friendlyName: data.accessKey?.friendlyName,
    expires: data.accessKey?.expires,
  };
}

export async function patchAccessKey(
  cfg: ConnectionSettings,
  oldName: string,
  nextName?: string,
  ttlMs?: number
): Promise<void> {
  const body: { friendlyName?: string; ttl?: number } = {};
  if (nextName && nextName.trim()) body.friendlyName = nextName.trim();
  if (ttlMs && ttlMs > 0) body.ttl = ttlMs;
  const res = await authorizedFetch(cfg, `/accessKeys/${encodeURIComponent(oldName)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function removeAccessKey(cfg: ConnectionSettings, keyName: string): Promise<void> {
  const res = await authorizedFetch(cfg, `/accessKeys/${encodeURIComponent(keyName)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function listSessions(cfg: ConnectionSettings): Promise<SessionInfo[]> {
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

export async function removeSession(cfg: ConnectionSettings, machineName: string): Promise<void> {
  const res = await authorizedFetch(cfg, `/sessions/${encodeURIComponent(machineName)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function listDeployments(cfg: ConnectionSettings, appName: string): Promise<Deployment[]> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/deployments`);
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { deployments?: Deployment[] };
  return data.deployments ?? [];
}

export async function createDeployment(cfg: ConnectionSettings, appName: string, name: string): Promise<void> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/deployments`, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok && res.status !== 201) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function renameDeployment(
  cfg: ConnectionSettings,
  appName: string,
  oldName: string,
  newName: string
): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(oldName)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ name: newName }),
    }
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function deleteDeployment(cfg: ConnectionSettings, appName: string, deploymentName: string): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function getDeployment(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string
): Promise<Deployment> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}`);
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { deployment?: Deployment };
  if (!data.deployment) throw new ApiError("Missing deployment in response", res.status);
  return data.deployment;
}

export async function getHistory(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string
): Promise<DeployHistoryPackage[]> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/history`
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { history?: DeployHistoryPackage[] };
  return data.history ?? [];
}

export async function getMetrics(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string
): Promise<DeploymentMetrics> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/metrics`
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
  const data = (await res.json()) as { metrics?: DeploymentMetrics };
  return data.metrics ?? {};
}

export async function promote(
  cfg: ConnectionSettings,
  appName: string,
  sourceName: string,
  destName: string,
  packageInfo: PackageInfo
): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(sourceName)}/promote/${encodeURIComponent(destName)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ packageInfo }),
    }
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function rollback(cfg: ConnectionSettings, appName: string, deploymentName: string, targetLabel?: string): Promise<void> {
  const tail = targetLabel ? encodeURIComponent(targetLabel) : "";
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/rollback/${tail}`,
    { method: "POST" }
  );
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function uploadRelease(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
  zipFile: File,
  meta: PackageInfo & { appVersion?: string }
): Promise<void> {
  const fd = new FormData();
  fd.append("package", zipFile);
  fd.append("packageInfo", JSON.stringify(meta));
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/release`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function patchRelease(
  cfg: ConnectionSettings,
  appName: string,
  deploymentName: string,
  packageInfo: PackageInfo & { label: string }
): Promise<void> {
  const res = await authorizedFetch(cfg, `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/release`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({ packageInfo }),
  });
  if (!res.ok && res.status !== 204) throw new ApiError(await parseErrorBody(res), res.status);
}

export async function clearDeploymentHistory(cfg: ConnectionSettings, appName: string, deploymentName: string): Promise<void> {
  const res = await authorizedFetch(
    cfg,
    `/apps/${encodeURIComponent(appName)}/deployments/${encodeURIComponent(deploymentName)}/history`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204) throw new ApiError(await parseErrorBody(res), res.status);
}
