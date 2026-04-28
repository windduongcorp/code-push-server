import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Server } from "lucide-react";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PLACEHOLDER = "https://codepush.example.com";

export function ConnectPage() {
  const navigate = useNavigate();
  const { settings, saveAndApply } = useAuth();
  const [useDevProxy, setUseDevProxy] = useState(
    (settings?.serverUrl ?? "") === "/__cp",
  );
  const [serverUrl, setServerUrl] = useState(
    (settings?.serverUrl ?? "") === "/__cp" ? "" : (settings?.serverUrl ?? ""),
  );
  const [accessKey, setAccessKey] = useState(settings?.accessKey ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setErr(null);
    setPending(true);
    const cfg = {
      serverUrl: useDevProxy ? "/__cp" : serverUrl.trim() || PLACEHOLDER,
      accessKey: accessKey.trim(),
    };
    try {
      const ok = await api.checkAuthenticated(cfg);
      if (!ok) {
        setErr("Access key không hợp lệ hoặc đã hết hạn.");
        return;
      }
      saveAndApply(cfg);
      navigate("/apps", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không kết nối được máy chủ.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Server className="h-5 w-5" />
            CodePush Dashboard
          </CardTitle>
          <CardDescription>
            Đăng nhập bằng access key để quản lý app, deployment và release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useDevProxy}
                onChange={(ev) => setUseDevProxy(ev.target.checked)}
              />
              Dùng dev proxy (né CORS)
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL máy chủ</label>
              <Input
                type="url"
                value={serverUrl}
                placeholder={PLACEHOLDER}
                required={!useDevProxy}
                disabled={useDevProxy}
                onChange={(ev) => setServerUrl(ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Access key</label>
              <Input
                type="password"
                value={accessKey}
                required
                onChange={(ev) => setAccessKey(ev.target.value)}
              />
            </div>
            {err ? <p className="error">{err}</p> : null}
            <Button className="w-full" disabled={pending} type="submit">
              {pending ? "Đang kiểm tra..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
