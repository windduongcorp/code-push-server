import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/dialog";
import { AppsManager } from "@/features/apps/components/AppsManager";
import { toast } from "sonner";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AppsPage() {
  const { settings } = useAuth();
  const [apps, setApps] = useState<api.AppRow[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [renameAppTarget, setRenameAppTarget] = useState<string | null>(null);
  const [renameAppValue, setRenameAppValue] = useState("");
  const [transferAppTarget, setTransferAppTarget] = useState<string | null>(
    null,
  );
  const [transferAppEmail, setTransferAppEmail] = useState("");

  const load = useCallback(async () => {
    if (!settings) return;
    try {
      setApps(await api.listApps(settings));
    } catch (error) {
      toast.error(getErrorMessage(error) || "Không tải được danh sách app");
    }
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
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

      <AppDialog
        open={Boolean(renameAppTarget)}
        onOpenChange={(open) => !open && setRenameAppTarget(null)}
        title="Đổi tên ứng dụng"
        description={
          renameAppTarget ? `App hiện tại: ${renameAppTarget}` : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setRenameAppTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={!renameAppTarget || !renameAppValue.trim() || !settings}
              onClick={async () => {
                if (!settings || !renameAppTarget || !renameAppValue.trim())
                  return;
                await api.renameApp(
                  settings,
                  renameAppTarget,
                  renameAppValue.trim(),
                );
                setRenameAppTarget(null);
                await load();
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <Input
          value={renameAppValue}
          onChange={(e) => setRenameAppValue(e.target.value)}
        />
      </AppDialog>

      <AppDialog
        open={Boolean(transferAppTarget)}
        onOpenChange={(open) => !open && setTransferAppTarget(null)}
        title="Chuyển ownership ứng dụng"
        description={
          transferAppTarget ? `App: ${transferAppTarget}` : undefined
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setTransferAppTarget(null)}
            >
              Hủy
            </Button>
            <Button
              disabled={
                !transferAppTarget || !transferAppEmail.trim() || !settings
              }
              onClick={async () => {
                if (!settings || !transferAppTarget || !transferAppEmail.trim())
                  return;
                await api.transferApp(
                  settings,
                  transferAppTarget,
                  transferAppEmail.trim(),
                );
                setTransferAppTarget(null);
                await load();
              }}
            >
              Transfer
            </Button>
          </>
        }
      >
        <Input
          placeholder="owner@example.com"
          value={transferAppEmail}
          onChange={(e) => setTransferAppEmail(e.target.value)}
        />
      </AppDialog>
    </>
  );
}
