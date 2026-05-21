import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/dialog";
import { AccessKeysManager } from "@/features/apps/components/AccessKeysManager";
import { toast } from "sonner";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AccessKeysPage() {
  const { settings } = useAuth();
  const [accessKeys, setAccessKeys] = useState<api.AccessKeyInfo[]>([]);
  const [newAccessKeyName, setNewAccessKeyName] = useState("");
  const [newAccessKeyTtlDays, setNewAccessKeyTtlDays] = useState("");
  const [createdAccessKey, setCreatedAccessKey] =
    useState<api.CreatedAccessKey | null>(null);
  const [renameKeyTarget, setRenameKeyTarget] = useState<string | null>(null);
  const [renameKeyValue, setRenameKeyValue] = useState("");
  const [rotateKeyTarget, setRotateKeyTarget] = useState<string | null>(null);
  const [rotateKeyName, setRotateKeyName] = useState("");
  const [rotateKeyTtlDays, setRotateKeyTtlDays] = useState("");

  const load = useCallback(async () => {
    if (!settings) return;
    try {
      const keys = await api.listAccessKeys(settings);
      setAccessKeys(keys.filter((k) => !k.isSession));
    } catch (error) {
      toast.error(getErrorMessage(error) || "Không tải được access key");
    }
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyCreated() {
    if (!createdAccessKey?.key) return;
    await navigator.clipboard.writeText(createdAccessKey.key);
  }

  return (
    <>
      <AccessKeysManager
        accessKeys={accessKeys}
        newName={newAccessKeyName}
        ttlDays={newAccessKeyTtlDays}
        createdAccessKey={createdAccessKey}
        setNewName={setNewAccessKeyName}
        setTtlDays={setNewAccessKeyTtlDays}
        onCreate={async () => {
          if (!settings || !newAccessKeyName.trim()) return;
          try {
            const days = Number(newAccessKeyTtlDays);
            const ttlMs =
              Number.isFinite(days) && days > 0
                ? days * 24 * 60 * 60 * 1000
                : undefined;
            const created = await api.createAccessKey(
              settings,
              newAccessKeyName.trim(),
              ttlMs,
            );
            setCreatedAccessKey(created.key ? created : null);
            setNewAccessKeyName("");
            setNewAccessKeyTtlDays("");
            await load();
          } catch (error) {
            toast.error(getErrorMessage(error) || "Tạo access key thất bại");
          }
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

      <AppDialog
        open={Boolean(renameKeyTarget)}
        onOpenChange={(open) => !open && setRenameKeyTarget(null)}
        title="Đổi tên access-key"
        description={
          renameKeyTarget ? `Key hiện tại: ${renameKeyTarget}` : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setRenameKeyTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={!renameKeyTarget || !renameKeyValue.trim() || !settings}
              onClick={async () => {
                if (!settings || !renameKeyTarget || !renameKeyValue.trim())
                  return;
                await api.patchAccessKey(
                  settings,
                  renameKeyTarget,
                  renameKeyValue.trim(),
                );
                setRenameKeyTarget(null);
                await load();
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <Input
          value={renameKeyValue}
          onChange={(e) => setRenameKeyValue(e.target.value)}
        />
      </AppDialog>

      <AppDialog
        open={Boolean(rotateKeyTarget)}
        onOpenChange={(open) => !open && setRotateKeyTarget(null)}
        title="Rotate access-key"
        description={
          rotateKeyTarget
            ? `Tạo key mới rồi xóa key cũ: ${rotateKeyTarget}`
            : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setRotateKeyTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={!rotateKeyTarget || !rotateKeyName.trim() || !settings}
              onClick={async () => {
                if (!settings || !rotateKeyTarget || !rotateKeyName.trim())
                  return;
                const days = Number(rotateKeyTtlDays);
                const ttlMs =
                  Number.isFinite(days) && days > 0
                    ? days * 24 * 60 * 60 * 1000
                    : undefined;
                const created = await api.createAccessKey(
                  settings,
                  rotateKeyName.trim(),
                  ttlMs,
                );
                setCreatedAccessKey(created.key ? created : null);
                await api.removeAccessKey(settings, rotateKeyTarget);
                setRotateKeyTarget(null);
                await load();
              }}
            >
              Rotate
            </Button>
          </>
        }
      >
        <Input
          value={rotateKeyName}
          onChange={(e) => setRotateKeyName(e.target.value)}
        />
        <Input
          placeholder="TTL ngày (optional)"
          value={rotateKeyTtlDays}
          onChange={(e) => setRotateKeyTtlDays(e.target.value)}
        />
      </AppDialog>
    </>
  );
}
