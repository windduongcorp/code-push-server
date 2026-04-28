import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppsManager } from "@/features/apps/components/AppsManager";
import { AccessKeysManager } from "@/features/apps/components/AccessKeysManager";
import { CollaboratorsManager } from "@/features/apps/components/CollaboratorsManager";
import { SessionsManager } from "@/features/apps/components/SessionsManager";
import type { AdminTab } from "@/features/apps/types/admin";

export function AppsPage() {
  const { settings, setSettings } = useAuth();
  const [tab, setTab] = useState<AdminTab>("apps");
  const [apps, setApps] = useState<api.AppRow[]>([]);
  const [accessKeys, setAccessKeys] = useState<api.AccessKeyInfo[]>([]);
  const [account, setAccount] = useState<api.AccountInfo | null>(null);
  const [sessions, setSessions] = useState<api.SessionInfo[]>([]);
  const [selectedAppForCollaborators, setSelectedAppForCollaborators] = useState("");
  const [collaborators, setCollaborators] = useState<api.CollaboratorMap>({});
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [newAccessKeyName, setNewAccessKeyName] = useState("");
  const [newAccessKeyTtlDays, setNewAccessKeyTtlDays] = useState("");
  const [createdAccessKey, setCreatedAccessKey] = useState<api.CreatedAccessKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renameAppTarget, setRenameAppTarget] = useState<string | null>(null);
  const [renameAppValue, setRenameAppValue] = useState("");
  const [transferAppTarget, setTransferAppTarget] = useState<string | null>(null);
  const [transferAppEmail, setTransferAppEmail] = useState("");
  const [renameKeyTarget, setRenameKeyTarget] = useState<string | null>(null);
  const [renameKeyValue, setRenameKeyValue] = useState("");
  const [rotateKeyTarget, setRotateKeyTarget] = useState<string | null>(null);
  const [rotateKeyName, setRotateKeyName] = useState("");
  const [rotateKeyTtlDays, setRotateKeyTtlDays] = useState("");

  const load = useCallback(async () => {
    if (!settings) return;
    try {
      setError(null);
      const list = await api.listApps(settings);
      setApps(list);
      setAccount(await api.getAccount(settings));
      const keys = await api.listAccessKeys(settings);
      setAccessKeys(keys.filter((k) => !k.isSession));
      setSessions(await api.listSessions(settings));
      if (!selectedAppForCollaborators && list[0]) setSelectedAppForCollaborators(list[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selectedAppForCollaborators, settings]);

  const loadCollaborators = useCallback(async () => {
    if (!settings || !selectedAppForCollaborators) return setCollaborators({});
    try {
      setCollaborators(await api.listCollaborators(settings, selectedAppForCollaborators));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selectedAppForCollaborators, settings]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  async function copyCreated() {
    if (!createdAccessKey?.key) return;
    await navigator.clipboard.writeText(createdAccessKey.key);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">CodePush Admin</h1>
          {account?.email ? <p className="muted">{account.email}</p> : null}
        </div>
        <Button variant="outline" onClick={() => setSettings(null)}>
          Đăng xuất
        </Button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="surface h-fit p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quản trị</p>
          <div className="grid gap-1">
            <Button variant={tab === "apps" ? "default" : "ghost"} className="justify-start" onClick={() => setTab("apps")}>
              Ứng dụng
            </Button>
            <Button variant={tab === "access-keys" ? "default" : "ghost"} className="justify-start" onClick={() => setTab("access-keys")}>
              Access Key
            </Button>
            <Button
              variant={tab === "collaborators" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setTab("collaborators")}>
              Collaborator
            </Button>
            <Button variant={tab === "sessions" ? "default" : "ghost"} className="justify-start" onClick={() => setTab("sessions")}>
              Session
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          {tab === "apps" ? (
          <AppsManager
            apps={apps}
            newName={newAppName}
            setNewName={setNewAppName}
            onAdd={async () => {
              if (!settings || !newAppName.trim()) return;
              await api.createApp(settings, newAppName.trim());
              setNewAppName("");
              await load();
            }}
            onRename={async (name) => {
              setRenameAppTarget(name);
              setRenameAppValue(name);
            }}
            onTransfer={async (name) => {
              setTransferAppTarget(name);
              setTransferAppEmail("");
            }}
            onDelete={async (name) => {
              if (!settings || !confirm(`Xóa app "${name}"?`)) return;
              await api.deleteApp(settings, name);
              await load();
            }}
          />
          ) : null}

          {tab === "access-keys" ? (
          <AccessKeysManager
            accessKeys={accessKeys}
            newName={newAccessKeyName}
            ttlDays={newAccessKeyTtlDays}
            createdAccessKey={createdAccessKey}
            setNewName={setNewAccessKeyName}
            setTtlDays={setNewAccessKeyTtlDays}
            onCreate={async () => {
              if (!settings || !newAccessKeyName.trim()) return;
              const days = Number(newAccessKeyTtlDays);
              const ttlMs = Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 * 1000 : undefined;
              const created = await api.createAccessKey(settings, newAccessKeyName.trim(), ttlMs);
              setCreatedAccessKey(created.key ? created : null);
              setNewAccessKeyName("");
              setNewAccessKeyTtlDays("");
              await load();
            }}
            onRename={async (name) => {
              setRenameKeyTarget(name);
              setRenameKeyValue(name);
            }}
            onRotate={async (name) => {
              setRotateKeyTarget(name);
              setRotateKeyName(`${name}-rotated`);
              setRotateKeyTtlDays("");
            }}
            onDelete={async (name) => {
              if (!settings || !confirm(`Xóa key "${name}"?`)) return;
              await api.removeAccessKey(settings, name);
              await load();
            }}
            onCopyCreated={copyCreated}
            onDismissCreated={() => setCreatedAccessKey(null)}
          />
          ) : null}

          {tab === "collaborators" ? (
          <CollaboratorsManager
            apps={apps}
            selectedApp={selectedAppForCollaborators}
            collaborators={collaborators}
            email={newCollaboratorEmail}
            setSelectedApp={setSelectedAppForCollaborators}
            setEmail={setNewCollaboratorEmail}
            onAdd={async () => {
              if (!settings || !selectedAppForCollaborators || !newCollaboratorEmail.trim()) return;
              await api.addCollaborator(settings, selectedAppForCollaborators, newCollaboratorEmail.trim());
              setNewCollaboratorEmail("");
              await loadCollaborators();
            }}
            onRemove={async (email) => {
              if (!settings || !selectedAppForCollaborators) return;
              await api.removeCollaborator(settings, selectedAppForCollaborators, email);
              await loadCollaborators();
            }}
          />
          ) : null}

          {tab === "sessions" ? (
          <SessionsManager
            sessions={sessions}
            onRemove={async (machine) => {
              if (!settings) return;
              await api.removeSession(settings, machine);
              await load();
            }}
          />
          ) : null}
        </section>
      </div>

      <Dialog open={Boolean(renameAppTarget)} onOpenChange={(open) => !open && setRenameAppTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên ứng dụng</DialogTitle>
            <DialogDescription>{renameAppTarget ? `App hiện tại: ${renameAppTarget}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={renameAppValue} onChange={(e) => setRenameAppValue(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameAppTarget(null)}>Hủy</Button>
              <Button
                disabled={!renameAppTarget || !renameAppValue.trim() || !settings}
                onClick={async () => {
                  if (!settings || !renameAppTarget || !renameAppValue.trim()) return;
                  await api.renameApp(settings, renameAppTarget, renameAppValue.trim());
                  setRenameAppTarget(null);
                  await load();
                }}>
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(transferAppTarget)} onOpenChange={(open) => !open && setTransferAppTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chuyển ownership ứng dụng</DialogTitle>
            <DialogDescription>{transferAppTarget ? `App: ${transferAppTarget}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="owner@example.com" value={transferAppEmail} onChange={(e) => setTransferAppEmail(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferAppTarget(null)}>Hủy</Button>
              <Button
                disabled={!transferAppTarget || !transferAppEmail.trim() || !settings}
                onClick={async () => {
                  if (!settings || !transferAppTarget || !transferAppEmail.trim()) return;
                  await api.transferApp(settings, transferAppTarget, transferAppEmail.trim());
                  setTransferAppTarget(null);
                  await load();
                }}>
                Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameKeyTarget)} onOpenChange={(open) => !open && setRenameKeyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên access-key</DialogTitle>
            <DialogDescription>{renameKeyTarget ? `Key hiện tại: ${renameKeyTarget}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={renameKeyValue} onChange={(e) => setRenameKeyValue(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameKeyTarget(null)}>Hủy</Button>
              <Button
                disabled={!renameKeyTarget || !renameKeyValue.trim() || !settings}
                onClick={async () => {
                  if (!settings || !renameKeyTarget || !renameKeyValue.trim()) return;
                  await api.patchAccessKey(settings, renameKeyTarget, renameKeyValue.trim());
                  setRenameKeyTarget(null);
                  await load();
                }}>
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rotateKeyTarget)} onOpenChange={(open) => !open && setRotateKeyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate access-key</DialogTitle>
            <DialogDescription>
              {rotateKeyTarget ? `Tạo key mới rồi xóa key cũ: ${rotateKeyTarget}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={rotateKeyName} onChange={(e) => setRotateKeyName(e.target.value)} />
            <Input placeholder="TTL ngày (optional)" value={rotateKeyTtlDays} onChange={(e) => setRotateKeyTtlDays(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRotateKeyTarget(null)}>Hủy</Button>
              <Button
                disabled={!rotateKeyTarget || !rotateKeyName.trim() || !settings}
                onClick={async () => {
                  if (!settings || !rotateKeyTarget || !rotateKeyName.trim()) return;
                  const days = Number(rotateKeyTtlDays);
                  const ttlMs = Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 * 1000 : undefined;
                  const created = await api.createAccessKey(settings, rotateKeyName.trim(), ttlMs);
                  setCreatedAccessKey(created.key ? created : null);
                  await api.removeAccessKey(settings, rotateKeyTarget);
                  setRotateKeyTarget(null);
                  await load();
                }}>
                Rotate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
