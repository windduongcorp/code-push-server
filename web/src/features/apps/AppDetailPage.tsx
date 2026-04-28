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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [err, setErr] = useState<string | null>(null);
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [historyMenuFor, setHistoryMenuFor] = useState<string | null>(null);
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
    setErr(null);
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
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [appName, navigate, setSettings, settings]);

  const loadHistory = useCallback(async () => {
    if (!settings || !activeDeployment) return;
    try {
      setHistory(await api.getHistory(settings, appName, activeDeployment));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
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

      {err ? <p className="error">{err}</p> : null}

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
                await api.addCollaborator(
                  settings,
                  appName,
                  newCollaboratorEmail.trim(),
                );
                setNewCollaboratorEmail("");
                await loadBase();
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
          <CardTitle className="text-base">Deployments</CardTitle>
          <div className="flex w-full justify-end">
            <Button onClick={() => setModal("createDeployment")}>
              + Thêm môi trường
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {deployments.map((d) => (
            <div
              key={d.name}
              className={`rounded-md border p-3 ${activeDeployment === d.name ? "bg-muted" : "bg-card"}`}
              style={{
                position: "relative",
                zIndex: menuFor === d.name ? 20 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="h-auto px-0 py-0 text-left font-semibold"
                  onClick={() => setActiveDeployment(d.name)}
                >
                  {d.name}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto shrink-0"
                  onClick={() =>
                    setMenuFor((prev) => (prev === d.name ? null : d.name))
                  }
                >
                  ☰
                </Button>
              </div>
              {d.key ? (
                <div className="mt-2 flex items-start gap-2">
                  <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">
                    {d.key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(d.key!)}
                  >
                    Copy
                  </Button>
                </div>
              ) : null}
              <p className="muted mt-2">
                {d.package ? (
                  <>
                    Release hiện tại: <strong>{d.package.label ?? "?"}</strong>{" "}
                    — app version{" "}
                    <span className="font-mono">
                      {d.package.appVersion ?? "—"}
                    </span>
                  </>
                ) : (
                  "Chưa có release."
                )}
              </p>

              {menuFor === d.name ? (
                <div className="absolute right-3 top-12 z-30 w-48 space-y-1 rounded-md border bg-card p-2 shadow-lg">
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={async () => {
                      if (!settings) return;
                      setMenuFor(null);
                      setModalTarget(d.name);
                      setMetricsData(
                        await api.getMetrics(settings, appName, d.name),
                      );
                      setModal("metrics");
                    }}
                  >
                    Metrics
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={() => {
                      setMenuFor(null);
                      setModalTarget(d.name);
                      setPromoteTarget("");
                      setModal("promote");
                    }}
                  >
                    Promote
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={async () => {
                      if (!settings) return;
                      setMenuFor(null);
                      const h = await api.getHistory(settings, appName, d.name);
                      setRollbackOptions(
                        h
                          .map((x) => x.label)
                          .filter((x): x is string => Boolean(x)),
                      );
                      setRollbackLabel("__PREVIOUS__");
                      setModalTarget(d.name);
                      setModal("rollback");
                    }}
                  >
                    Rollback
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={() => {
                      setMenuFor(null);
                      setModalTarget(d.name);
                      setUploadZipFile(null);
                      setUploadAppVersion("");
                      setUploadDesc("");
                      setUploadMandatory(false);
                      setModal("upload");
                    }}
                  >
                    Tải release (.zip)
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={async () => {
                      if (
                        !settings ||
                        !confirm(
                          `Clear toàn bộ lịch sử release của "${d.name}"?`,
                        )
                      )
                        return;
                      setMenuFor(null);
                      await api.clearDeploymentHistory(
                        settings,
                        appName,
                        d.name,
                      );
                      await refreshAll();
                    }}
                  >
                    Clear history
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="ghost"
                    onClick={() => {
                      setMenuFor(null);
                      setModalTarget(d.name);
                      setRenameDeploymentValue(d.name);
                      setModal("renameDeployment");
                    }}
                  >
                    Edit name
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="destructive"
                    onClick={async () => {
                      if (!settings || !confirm(`Xóa môi trường "${d.name}"?`))
                        return;
                      setMenuFor(null);
                      await api.deleteDeployment(settings, appName, d.name);
                      await refreshAll();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setHistoryMenuFor((prev) =>
                          prev === h.label ? null : (h.label ?? null),
                        )
                      }
                    >
                      ☰
                    </Button>
                    {historyMenuFor === h.label ? (
                      <div className="absolute right-0 top-10 z-30 w-56 space-y-1 rounded-md border bg-card p-2 shadow-lg">
                        <Button
                          className="w-full justify-start"
                          variant="ghost"
                          onClick={async () => {
                            if (!settings || !activeDeployment || !h.label)
                              return;
                            setHistoryMenuFor(null);
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
                        </Button>
                        <Button
                          className="w-full justify-start"
                          variant="ghost"
                          onClick={() => {
                            setHistoryMenuFor(null);
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
                        </Button>
                      </div>
                    ) : null}
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
                  const rolloutValue = rolloutRaw ? Number(rolloutRaw) : undefined;
                  if (rolloutRaw && !Number.isFinite(rolloutValue)) {
                    setErr("Rollout phải là số hợp lệ (ví dụ: 10, 50, 100).");
                    return;
                  }
                  const shouldSendRollout =
                    rolloutRaw.length > 0 &&
                    rolloutRaw !== initialHistoryRollout.trim();

                  setBusy(true);
                  setErr(null);
                  try {
                    await api.patchRelease(settings, appName, activeDeployment, {
                      label: modalTarget,
                      description: historyDescription || undefined,
                      isMandatory: historyMandatory,
                      isDisabled: historyDisabled,
                      ...(shouldSendRollout ? { rollout: rolloutValue } : {}),
                    });
                    setModal(null);
                    await refreshAll();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e));
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
