import { Dispatch, SetStateAction } from "react";
import * as api from "@/lib/codepush-api";
import type { DeploymentMetrics, PackageInfo } from "@/lib/codepush-api";
import type { ConnectionSettings } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export type ModalKind =
  | "createDeployment"
  | "renameDeployment"
  | "promote"
  | "rollback"
  | "upload"
  | "metrics"
  | "editHistory"
  | null;

type Props = {
  settings: ConnectionSettings | null;
  appName: string;
  modal: ModalKind;
  setModal: Dispatch<SetStateAction<ModalKind>>;
  modalTarget: string;
  setModalTarget: Dispatch<SetStateAction<string>>;
  deploymentNames: string[];
  metricsData: DeploymentMetrics;
  refreshAll: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
  newDeploymentName: string;
  setNewDeploymentName: Dispatch<SetStateAction<string>>;
  creatingDeployment: boolean;
  setCreatingDeployment: Dispatch<SetStateAction<boolean>>;
  renameDeploymentValue: string;
  setRenameDeploymentValue: Dispatch<SetStateAction<string>>;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  promoteTarget: string;
  setPromoteTarget: Dispatch<SetStateAction<string>>;
  rollbackLabel: string;
  setRollbackLabel: Dispatch<SetStateAction<string>>;
  rollbackOptions: string[];
  uploadZipFile: File | null;
  setUploadZipFile: Dispatch<SetStateAction<File | null>>;
  uploadAppVersion: string;
  setUploadAppVersion: Dispatch<SetStateAction<string>>;
  uploadDesc: string;
  setUploadDesc: Dispatch<SetStateAction<string>>;
  uploadMandatory: boolean;
  setUploadMandatory: Dispatch<SetStateAction<boolean>>;
  historyDescription: string;
  setHistoryDescription: Dispatch<SetStateAction<string>>;
  historyMandatory: boolean;
  setHistoryMandatory: Dispatch<SetStateAction<boolean>>;
  historyDisabled: boolean;
  setHistoryDisabled: Dispatch<SetStateAction<boolean>>;
  historyRollout: string;
  setHistoryRollout: Dispatch<SetStateAction<string>>;
  initialHistoryRollout: string;
  activeDeployment: string | null;
};

export function AppDetailModals({
  settings,
  appName,
  modal,
  setModal,
  modalTarget,
  deploymentNames,
  metricsData,
  refreshAll,
  getErrorMessage,
  newDeploymentName,
  setNewDeploymentName,
  creatingDeployment,
  setCreatingDeployment,
  renameDeploymentValue,
  setRenameDeploymentValue,
  busy,
  setBusy,
  promoteTarget,
  setPromoteTarget,
  rollbackLabel,
  setRollbackLabel,
  rollbackOptions,
  uploadZipFile,
  setUploadZipFile,
  uploadAppVersion,
  setUploadAppVersion,
  uploadDesc,
  setUploadDesc,
  uploadMandatory,
  setUploadMandatory,
  historyDescription,
  setHistoryDescription,
  historyMandatory,
  setHistoryMandatory,
  historyDisabled,
  setHistoryDisabled,
  historyRollout,
  setHistoryRollout,
  initialHistoryRollout,
  activeDeployment,
}: Props) {
  return (
    <>
      <Dialog
        open={modal === "createDeployment"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm môi trường</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newDeploymentName}
              onChange={(e) => setNewDeploymentName(e.target.value)}
              placeholder="VD: QA, UAT..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                disabled={
                  !settings || !newDeploymentName.trim() || creatingDeployment
                }
                onClick={async () => {
                  if (!settings || !newDeploymentName.trim()) return;
                  setCreatingDeployment(true);
                  await api.createDeployment(
                    settings,
                    appName,
                    newDeploymentName.trim(),
                  );
                  setCreatingDeployment(false);
                  setNewDeploymentName("");
                  setModal(null);
                  await refreshAll();
                }}
              >
                Tạo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "renameDeployment"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên môi trường</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameDeploymentValue}
              onChange={(e) => setRenameDeploymentValue(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                disabled={
                  !settings ||
                  !modalTarget ||
                  !renameDeploymentValue.trim() ||
                  busy
                }
                onClick={async () => {
                  if (
                    !settings ||
                    !modalTarget ||
                    !renameDeploymentValue.trim()
                  )
                    return;
                  setBusy(true);
                  await api.renameDeployment(
                    settings,
                    appName,
                    modalTarget,
                    renameDeploymentValue.trim(),
                  );
                  setBusy(false);
                  setModal(null);
                  await refreshAll();
                }}
              >
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "promote"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote từ {modalTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={promoteTarget}
              onChange={(e) => setPromoteTarget(e.target.value)}
            >
              <option value="">Chọn deployment đích</option>
              {deploymentNames
                .filter((x) => x !== modalTarget)
                .map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                disabled={!settings || !modalTarget || !promoteTarget}
                onClick={async () => {
                  if (!settings || !modalTarget || !promoteTarget) return;
                  await api.promote(
                    settings,
                    appName,
                    modalTarget,
                    promoteTarget,
                    {} as PackageInfo,
                  );
                  setModal(null);
                  await refreshAll();
                }}
              >
                Promote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "rollback"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback {modalTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={rollbackLabel}
              onChange={(e) => setRollbackLabel(e.target.value)}
            >
              <option value="__PREVIOUS__">Previous release</option>
              {rollbackOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!settings || !modalTarget}
                onClick={async () => {
                  if (!settings || !modalTarget) return;
                  await api.rollback(
                    settings,
                    appName,
                    modalTarget,
                    rollbackLabel === "__PREVIOUS__"
                      ? undefined
                      : rollbackLabel,
                  );
                  setModal(null);
                  await refreshAll();
                }}
              >
                Rollback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "upload"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tải release vào {modalTarget}</DialogTitle>
            <DialogDescription>
              Chọn file zip và app version binary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setUploadZipFile(e.target.files?.[0] ?? null)}
            />
            <Input
              placeholder="App version (vd: 1.0.0)"
              value={uploadAppVersion}
              onChange={(e) => setUploadAppVersion(e.target.value)}
            />
            <Input
              placeholder="Mô tả (optional)"
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={uploadMandatory}
                onChange={(e) => setUploadMandatory(e.target.checked)}
              />
              Bản cập nhật bắt buộc
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                disabled={
                  !settings ||
                  !modalTarget ||
                  !uploadZipFile ||
                  !uploadAppVersion.trim()
                }
                onClick={async () => {
                  if (
                    !settings ||
                    !modalTarget ||
                    !uploadZipFile ||
                    !uploadAppVersion.trim()
                  )
                    return;
                  await api.uploadRelease(
                    settings,
                    appName,
                    modalTarget,
                    uploadZipFile,
                    {
                      appVersion: uploadAppVersion.trim(),
                      description: uploadDesc || undefined,
                      isMandatory: uploadMandatory || undefined,
                    },
                  );
                  setModal(null);
                  await refreshAll();
                }}
              >
                Tải release
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "metrics"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Metrics — {modalTarget}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label / version</TableHead>
                <TableHead>active</TableHead>
                <TableHead>downloaded</TableHead>
                <TableHead>installed</TableHead>
                <TableHead>failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(metricsData).map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="font-mono">{k}</TableCell>
                  <TableCell>{v.active}</TableCell>
                  <TableCell>{v.downloaded ?? "—"}</TableCell>
                  <TableCell>{v.installed ?? "—"}</TableCell>
                  <TableCell>{v.failed ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "editHistory"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa release {modalTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Description"
              value={historyDescription}
              onChange={(e) => setHistoryDescription(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={historyMandatory}
                onChange={(e) => setHistoryMandatory(e.target.checked)}
              />{" "}
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={historyDisabled}
                onChange={(e) => setHistoryDisabled(e.target.checked)}
              />{" "}
              Disabled
            </label>
            <Input
              placeholder="Rollout % (optional)"
              value={historyRollout}
              onChange={(e) => setHistoryRollout(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button
                disabled={
                  !settings || !activeDeployment || !modalTarget || busy
                }
                onClick={async () => {
                  if (!settings || !activeDeployment || !modalTarget) return;
                  const rolloutRaw = historyRollout.trim();
                  const rolloutValue = rolloutRaw
                    ? Number(rolloutRaw)
                    : undefined;
                  if (rolloutRaw && !Number.isFinite(rolloutValue)) {
                    toast.error(
                      "Rollout phải là số hợp lệ (ví dụ: 10, 50, 100).",
                    );
                    return;
                  }
                  const shouldSendRollout =
                    rolloutRaw.length > 0 &&
                    rolloutRaw !== initialHistoryRollout.trim();

                  setBusy(true);
                  try {
                    await api.patchRelease(
                      settings,
                      appName,
                      activeDeployment,
                      {
                        label: modalTarget,
                        description: historyDescription || undefined,
                        isMandatory: historyMandatory,
                        isDisabled: historyDisabled,
                        ...(shouldSendRollout ? { rollout: rolloutValue } : {}),
                      },
                    );
                    setModal(null);
                    await refreshAll();
                  } catch (e) {
                    toast.error(
                      getErrorMessage(e) || "Cập nhật release thất bại",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
