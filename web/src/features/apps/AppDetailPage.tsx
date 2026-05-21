import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "@/lib/codepush-api";
import type {
  CollaboratorMap,
  DeployHistoryPackage,
  DeploymentMetrics,
} from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fmtTime(ms?: number): string {
  if (ms == null) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

type ModalKind =
  | "createDeployment"
  | "renameDeployment"
  | "promote"
  | "rollback"
  | "upload"
  | "metrics"
  | "editHistory"
  | null;

export function AppDetailPage() {
  const { appName: rawName } = useParams<{ appName: string }>();
  const appName = rawName ?? "";
  const navigate = useNavigate();
  const { settings, setSettings } = useAuth();

  const [deployments, setDeployments] = useState<api.Deployment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorMap>({});
  const [history, setHistory] = useState<DeployHistoryPackage[]>([]);
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<DeploymentMetrics>({});
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalTarget, setModalTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [creatingDeployment, setCreatingDeployment] = useState(false);

  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [newDeploymentName, setNewDeploymentName] = useState("");
  const [renameDeploymentValue, setRenameDeploymentValue] = useState("");
  const [promoteTarget, setPromoteTarget] = useState("");
  const [rollbackLabel, setRollbackLabel] = useState("__PREVIOUS__");
  const [rollbackOptions, setRollbackOptions] = useState<string[]>([]);
  const [uploadZipFile, setUploadZipFile] = useState<File | null>(null);
  const [uploadAppVersion, setUploadAppVersion] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadMandatory, setUploadMandatory] = useState(false);

  const [historyDescription, setHistoryDescription] = useState("");
  const [historyMandatory, setHistoryMandatory] = useState(false);
  const [historyDisabled, setHistoryDisabled] = useState(false);
  const [historyRollout, setHistoryRollout] = useState("");
  const [initialHistoryRollout, setInitialHistoryRollout] = useState("");

  const loadBase = useCallback(async () => {
    if (!settings || !appName) return;
    try {
      const [d, c] = await Promise.all([
        api.listDeployments(settings, appName),
        api.listCollaborators(settings, appName),
      ]);
      setDeployments(d);
      setCollaborators(c);
      setActiveDeployment((prev) =>
        prev && d.some((x) => x.name === prev) ? prev : (d[0]?.name ?? null),
      );
    } catch (e) {
      if (
        e instanceof api.ApiError &&
        (e.statusCode === 401 || e.statusCode === 403)
      ) {
        setSettings(null);
        navigate("/login", { replace: true });
        return;
      }
      toast.error(getErrorMessage(e) || "Không tải được dữ liệu ứng dụng");
    }
  }, [appName, navigate, setSettings, settings]);

  const loadHistory = useCallback(async () => {
    if (!settings || !activeDeployment) return;
    try {
      setHistory(await api.getHistory(settings, appName, activeDeployment));
    } catch (e) {
      toast.error(getErrorMessage(e) || "Không tải được lịch sử release");
    }
  }, [activeDeployment, appName, settings]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const deploymentNames = useMemo(
    () => deployments.map((d) => d.name),
    [deployments],
  );
  const selectedDeployment = useMemo(
    () => deployments.find((d) => d.name === activeDeployment) ?? null,
    [activeDeployment, deployments],
  );

  async function refreshAll() {
    await loadBase();
    await loadHistory();
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:underline"
            to="/"
          >
            ← Quay lại ứng dụng
          </Link>
          <h1 className="mt-1 text-xl font-semibold break-all">
            {decodeURIComponent(appName)}
          </h1>
        </div>
        <Button variant="outline" onClick={() => void refreshAll()}>
          Làm mới
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collaborators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="name@example.com"
              value={newCollaboratorEmail}
              onChange={(e) => setNewCollaboratorEmail(e.target.value)}
            />
            <Button
              disabled={!newCollaboratorEmail.trim() || !settings}
              onClick={async () => {
                if (!settings || !newCollaboratorEmail.trim()) return;
                try {
                  await api.addCollaborator(
                    settings,
                    appName,
                    newCollaboratorEmail.trim(),
                  );
                  setNewCollaboratorEmail("");
                  await loadBase();
                } catch (error) {
                  const message = getErrorMessage(error);
                  toast.error(message || "Thêm collaborator thất bại");
                }
              }}
            >
              Thêm collaborator
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Quyền</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(collaborators).map(([email, info]) => (
                <TableRow key={email}>
                  <TableCell>{email}</TableCell>
                  <TableCell>
                    {info.permission ?? "Collaborator"}
                    {info.isCurrentAccount ? " (you)" : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (
                          !settings ||
                          !confirm(`Xóa collaborator "${email}"?`)
                        )
                          return;
                        await api.removeCollaborator(settings, appName, email);
                        await loadBase();
                      }}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Deployments</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <select
                className="h-10 min-w-[220px] rounded-md border bg-background px-3 text-sm"
                value={activeDeployment ?? ""}
                onChange={(e) => {
                  setActiveDeployment(e.target.value || null);
                }}
                disabled={!deployments.length}
              >
                {deploymentNames.length ? null : (
                  <option value="">Chưa có môi trường</option>
                )}
                {deploymentNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <Button onClick={() => setModal("createDeployment")}>
                + Thêm môi trường
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!selectedDeployment ? (
            <p className="text-sm text-muted-foreground">
              Chưa có môi trường nào.
            </p>
          ) : (
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{selectedDeployment.name}</h3>
                <HamburgerMenu
                  triggerClassName="ml-auto"
                  contentClassName="w-52"
                  ariaLabel="Deployment actions"
                >
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!settings) return;
                      setModalTarget(selectedDeployment.name);
                      setMetricsData(
                        await api.getMetrics(
                          settings,
                          appName,
                          selectedDeployment.name,
                        ),
                      );
                      setModal("metrics");
                    }}
                  >
                    Metrics
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setModalTarget(selectedDeployment.name);
                      setPromoteTarget("");
                      setModal("promote");
                    }}
                  >
                    Promote
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!settings) return;
                      const h = await api.getHistory(
                        settings,
                        appName,
                        selectedDeployment.name,
                      );
                      setRollbackOptions(
                        h
                          .map((x) => x.label)
                          .filter((x): x is string => Boolean(x)),
                      );
                      setRollbackLabel("__PREVIOUS__");
                      setModalTarget(selectedDeployment.name);
                      setModal("rollback");
                    }}
                  >
                    Rollback
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setModalTarget(selectedDeployment.name);
                      setUploadZipFile(null);
                      setUploadAppVersion("");
                      setUploadDesc("");
                      setUploadMandatory(false);
                      setModal("upload");
                    }}
                  >
                    Tải release (.zip)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      if (
                        !settings ||
                        !confirm(
                          `Clear toàn bộ lịch sử release của "${selectedDeployment.name}"?`,
                        )
                      )
                        return;
                      await api.clearDeploymentHistory(
                        settings,
                        appName,
                        selectedDeployment.name,
                      );
                      await refreshAll();
                    }}
                  >
                    Clear history
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setModalTarget(selectedDeployment.name);
                      setRenameDeploymentValue(selectedDeployment.name);
                      setModal("renameDeployment");
                    }}
                  >
                    Edit name
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      if (
                        !settings ||
                        !confirm(`Xóa môi trường "${selectedDeployment.name}"?`)
                      )
                        return;
                      await api.deleteDeployment(
                        settings,
                        appName,
                        selectedDeployment.name,
                      );
                      await refreshAll();
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </HamburgerMenu>
              </div>
              {selectedDeployment.key ? (
                <div className="mt-2 flex items-start gap-2">
                  <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">
                    {selectedDeployment.key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(selectedDeployment.key!)}
                  >
                    Copy
                  </Button>
                </div>
              ) : null}
              <p className="muted mt-2">
                {selectedDeployment.package ? (
                  <>
                    Release hiện tại:{" "}
                    <strong>{selectedDeployment.package.label ?? "?"}</strong> —
                    app version{" "}
                    <span className="font-mono">
                      {selectedDeployment.package.appVersion ?? "—"}
                    </span>
                  </>
                ) : (
                  "Chưa có release."
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lịch sử {activeDeployment ? `(${activeDeployment})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>App ver</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={`${h.label}-${h.uploadTime}`}>
                  <TableCell className="font-mono">{h.label}</TableCell>
                  <TableCell className="font-mono">{h.appVersion}</TableCell>
                  <TableCell>{fmtTime(h.uploadTime)}</TableCell>
                  <TableCell>{h.description ?? "—"}</TableCell>
                  <TableCell
                    className="text-right"
                    style={{ position: "relative" }}
                  >
                    <HamburgerMenu
                      contentClassName="w-56"
                      ariaLabel="History row actions"
                    >
                      <DropdownMenuItem
                        onClick={async () => {
                          if (!settings || !activeDeployment || !h.label)
                            return;
                          await api.rollback(
                            settings,
                            appName,
                            activeDeployment,
                            h.label,
                          );
                          await refreshAll();
                        }}
                      >
                        Rollback về label này
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setModalTarget(h.label ?? "");
                          setHistoryDescription(h.description ?? "");
                          setHistoryMandatory(Boolean(h.isMandatory));
                          setHistoryDisabled(Boolean(h.isDisabled));
                          const rolloutText =
                            h.rollout == null ? "" : String(h.rollout);
                          setHistoryRollout(rolloutText);
                          setInitialHistoryRollout(rolloutText);
                          setModal("editHistory");
                        }}
                      >
                        Sửa metadata release
                      </DropdownMenuItem>
                    </HamburgerMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </CardContent>
      </Card>

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
                    {},
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
    </div>
  );
}
