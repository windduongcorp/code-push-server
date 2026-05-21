import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import * as api from "@/lib/codepush-api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AdminLayout() {
  const { settings, setSettings } = useAuth();
  const [account, setAccount] = useState<api.AccountInfo | null>(null);

  useEffect(() => {
    if (!settings) return;
    void api
      .getAccount(settings)
      .then((next) => setAccount(next))
      .catch((error) => {
        toast.error(
          getErrorMessage(error) || "Không tải được thông tin tài khoản",
        );
      });
  }, [settings]);

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-muted",
    );

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

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="surface h-fit p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị
          </p>
          <nav className="grid gap-1">
            <NavLink to="/apps" className={navClassName}>
              Ứng dụng
            </NavLink>
            <NavLink to="/access-keys" className={navClassName}>
              Access Key
            </NavLink>
            <NavLink to="/collaborators" className={navClassName}>
              Collaborator
            </NavLink>
            <NavLink to="/sessions" className={navClassName}>
              Session
            </NavLink>
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
