import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

import { AppShell } from '@/components/layout/AppShell';
import { Logo } from '@/components/ui/Logo';
import { QueryProvider } from '@/providers/QueryProvider';

function LoadingScreen() {
  return (
    <div className="grid h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Logo className="size-14 animate-pulse rounded-2xl" />
        <div className="text-sm font-medium text-muted-foreground">ArgoDeep</div>
      </div>
    </div>
  );
}

// Route-based code-splitting: heavy deps (Leaflet, Recharts, TanStack Table)
// load only with the pages that use them.
const MapPage = lazy(() => import('@/pages/MapPage').then((m) => ({ default: m.MapPage })));
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const ExplorerPage = lazy(() => import('@/pages/ExplorerPage').then((m) => ({ default: m.ExplorerPage })));
const FloatDetailsPage = lazy(() => import('@/pages/FloatDetailsPage').then((m) => ({ default: m.FloatDetailsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage').then((m) => ({ default: m.KnowledgePage })));
const SqlPage = lazy(() => import('@/pages/SqlPage').then((m) => ({ default: m.SqlPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MonitorPage = lazy(() => import('@/pages/MonitorPage').then((m) => ({ default: m.MonitorPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })));

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Auth routes render without the app shell */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route element={<AppShell />}>
              <Route index element={<MapPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="explorer" element={<ExplorerPage />} />
              <Route path="floats/:id" element={<FloatDetailsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="sql" element={<SqlPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="monitor" element={<MonitorPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Analytics />
    </QueryProvider>
  );
}
