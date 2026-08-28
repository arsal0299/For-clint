import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuth, AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { Background } from "./components/Background";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Maintenance } from "./pages/Maintenance";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const Register = lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
import { AppLayout } from "./components/layout/AppLayout";
const Overview = lazy(() => import("./pages/app/Overview").then((m) => ({ default: m.Overview })));
const Withdrawals = lazy(() => import("./pages/app/Withdrawals").then((m) => ({ default: m.Withdrawals })));
const Dashboard = lazy(() => import("./pages/app/Dashboard").then((m) => ({ default: m.Dashboard })));
const TopUp = lazy(() => import("./pages/app/TopUp").then((m) => ({ default: m.TopUp })));
const TempMail = lazy(() => import("./pages/app/TempMail").then((m) => ({ default: m.TempMail })));
const Referrals = lazy(() => import("./pages/app/Referrals").then((m) => ({ default: m.Referrals })));
const Services = lazy(() => import("./pages/app/Services").then((m) => ({ default: m.Services })));
const ApiKeys = lazy(() => import("./pages/app/ApiKeys").then((m) => ({ default: m.ApiKeys })));
const History = lazy(() => import("./pages/app/History").then((m) => ({ default: m.History })));
const Profile = lazy(() => import("./pages/app/Profile").then((m) => ({ default: m.Profile })));

import { AdminLayout } from "./components/layout/AdminLayout";
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail").then((m) => ({ default: m.AdminUserDetail })));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments").then((m) => ({ default: m.AdminPayments })));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons").then((m) => ({ default: m.AdminCoupons })));
const AdminSmmServices = lazy(() => import("./pages/admin/AdminSmmServices").then((m) => ({ default: m.AdminSmmServices })));
const AdminSmmOrders = lazy(() => import("./pages/admin/AdminSmmOrders").then((m) => ({ default: m.AdminSmmOrders })));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements").then((m) => ({ default: m.AdminAnnouncements })));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog").then((m) => ({ default: m.AdminAuditLog })));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals").then((m) => ({ default: m.AdminWithdrawals })));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })));

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-400/30 border-t-brand-400 animate-spin" />
    </div>
  );
}

const MAINTENANCE_EXEMPT_PATHS = ["/login", "/forgot-password", "/reset-password"];

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const { profile, loading: authLoading } = useAuth();
  const location = useLocation();

  if (settingsLoading || authLoading) return <>{children}</>;

  const enabled = settings.maintenance_enabled === "true";
  if (!enabled) return <>{children}</>;

  const now = Date.now();
  const start = settings.maintenance_start ? new Date(settings.maintenance_start).getTime() : null;
  const end = settings.maintenance_end ? new Date(settings.maintenance_end).getTime() : null;
  const withinWindow = (!start || now >= start) && (!end || now < end);
  if (!withinWindow) return <>{children}</>;

  if (profile?.is_admin) return <>{children}</>;
  if (MAINTENANCE_EXEMPT_PATHS.includes(location.pathname)) return <>{children}</>;

  return <Maintenance />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <BrowserRouter>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <Background />
              <MaintenanceGate>
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/register" element={<Register />} />

                {/* User app */}
                <Route
                  path="/overview"
                  element={
                    <AppLayout>
                      <Overview />
                    </AppLayout>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  }
                />
                <Route
                  path="/topup"
                  element={
                    <AppLayout>
                      <TopUp />
                    </AppLayout>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <AppLayout>
                      <Services />
                    </AppLayout>
                  }
                />
                <Route
                  path="/api-keys"
                  element={
                    <AppLayout>
                      <ApiKeys />
                    </AppLayout>
                  }
                />
                <Route
                  path="/mail"
                  element={
                    <AppLayout>
                      <TempMail />
                    </AppLayout>
                  }
                />
                <Route
                  path="/referrals"
                  element={
                    <AppLayout>
                      <Referrals />
                    </AppLayout>
                  }
                />
                <Route
                  path="/withdrawals"
                  element={
                    <AppLayout>
                      <Withdrawals />
                    </AppLayout>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <AppLayout>
                      <History />
                    </AppLayout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin"
                  element={
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/users/:id"
                  element={
                    <AdminLayout>
                      <AdminUserDetail />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/payments"
                  element={
                    <AdminLayout>
                      <AdminPayments />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/coupons"
                  element={
                    <AdminLayout>
                      <AdminCoupons />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/services"
                  element={
                    <AdminLayout>
                      <AdminSmmServices />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <AdminLayout>
                      <AdminSmmOrders />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/announcements"
                  element={
                    <AdminLayout>
                      <AdminAnnouncements />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/audit-log"
                  element={
                    <AdminLayout>
                      <AdminAuditLog />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/withdrawals"
                  element={
                    <AdminLayout>
                      <AdminWithdrawals />
                    </AdminLayout>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminLayout>
                      <AdminSettings />
                    </AdminLayout>
                  }
                />

                <Route path="*" element={<Home />} />
              </Routes>
              </Suspense>
              </MaintenanceGate>
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
