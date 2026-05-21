import { AccessKeysPage } from "@/features/apps/AccessKeysPage";
import { AdminLayout } from "@/features/apps/AdminLayout";
import { AppDetailPage } from "@/features/apps/AppDetailPage";
import { AppsPage } from "@/features/apps/AppsPage";
import { CollaboratorsPage } from "@/features/apps/CollaboratorsPage";
import { SessionsPage } from "@/features/apps/SessionsPage";
import { ConnectPage } from "@/features/auth/ConnectPage";
import { useAuth } from "@/lib/auth-context";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

function RequireConn({ children }: { children: React.ReactNode }) {
  const { settings, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!settings?.serverUrl || !settings.accessKey)
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/login" element={<ConnectPage />} />
          <Route
            path="/"
            element={
              <RequireConn>
                <AdminLayout />
              </RequireConn>
            }
          >
            <Route index element={<Navigate to="apps" replace />} />
            <Route path="apps" element={<AppsPage />} />
            <Route path="apps/:appName" element={<AppDetailPage />} />
            <Route path="access-keys" element={<AccessKeysPage />} />
            <Route path="collaborators" element={<CollaboratorsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/apps" replace />} />
        </Routes>
      </main>
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}
