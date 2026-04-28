import { Navigate, Route, Routes } from "react-router-dom";
import { ConnectPage } from "@/features/auth/ConnectPage";
import { AppsPage } from "@/features/apps/AppsPage";
import { AppDetailPage } from "@/features/apps/AppDetailPage";
import { useAuth } from "@/lib/auth-context";

function RequireConn({ children }: { children: React.ReactNode }) {
  const { settings } = useAuth();
  if (!settings?.serverUrl || !settings.accessKey)
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Routes>
        <Route path="/login" element={<ConnectPage />} />
        <Route
          path="/apps"
          element={
            <RequireConn>
              <AppsPage />
            </RequireConn>
          }
        />
        <Route
          path="/apps/:appName"
          element={
            <RequireConn>
              <AppDetailPage />
            </RequireConn>
          }
        />
        <Route path="/" element={<Navigate to="/apps" replace />} />
        <Route path="*" element={<Navigate to="/apps" replace />} />
      </Routes>
    </main>
  );
}
