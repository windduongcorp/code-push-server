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
import { toast } from "sonner";

const PLACEHOLDER = "https://codepush.example.com";
const DEFAULT_SERVER_URL =
  import.meta.env.VITE_DEFAULT_SERVER_URL?.trim() ?? "";
const DEV_PROXY_AVAILABLE = import.meta.env.DEV;

function normalizeServerUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let candidate = trimmed;
  candidate = candidate.replace(/^https?:\/\/\.?\/+/i, (matched) =>
    matched.toLowerCase().startsWith("https://") ? "https://" : "http://",
  );
  candidate = candidate.replace(/^\.?\/\//, "");

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function ConnectPage() {
  const navigate = useNavigate();
  const { settings, saveAndApply } = useAuth();
  const [useDevProxy, setUseDevProxy] = useState(
    DEV_PROXY_AVAILABLE && (settings?.serverUrl ?? "") === "/__cp",
  );
  const [serverUrl, setServerUrl] = useState(
    (settings?.serverUrl ?? "") === "/__cp"
      ? DEFAULT_SERVER_URL
      : (settings?.serverUrl ?? ""),
  );
  const [accessKey, setAccessKey] = useState(settings?.accessKey ?? "");
  const [remember30Days, setRemember30Days] = useState(true);
  const [pending, setPending] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setPending(true);
    const normalizedServerUrl = normalizeServerUrlInput(
      serverUrl.trim() || DEFAULT_SERVER_URL || PLACEHOLDER,
    );
    const targetServerUrl =
      DEV_PROXY_AVAILABLE && useDevProxy ? "/__cp" : normalizedServerUrl;

    if (!targetServerUrl) {
      toast.error("URL máy chủ không hợp lệ.");
      setPending(false);
      return;
    }

    const cfg = {
      serverUrl: targetServerUrl,
      accessKey: accessKey.trim(),
    };
    try {
      const ok = await api.checkAuthenticated(cfg);
      if (!ok) {
        toast.error("Access key không hợp lệ hoặc đã hết hạn.");
        return;
      }
      saveAndApply(cfg, { rememberDays: remember30Days ? 30 : 0 });
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không kết nối được máy chủ.",
      );
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
            {DEV_PROXY_AVAILABLE ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useDevProxy}
                  onChange={(ev) => setUseDevProxy(ev.target.checked)}
                />
                Dùng dev proxy (né CORS)
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember30Days}
                onChange={(ev) => setRemember30Days(ev.target.checked)}
              />
              Ghi nhớ đăng nhập trong 30 ngày
            </label>
            <Button className="w-full" loading={pending} type="submit">
              Đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
