import { type ReactNode } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  ArrowLeft,
  Tag,
  ShoppingBag,
  Package,
  Megaphone,
  ScrollText,
  Banknote,
  Layers,
  Server,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { ThemeToggle } from "../ThemeToggle";
import { Logo } from "../Logo";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, end: false },
  { to: "/admin/coupons", label: "Coupons", icon: Tag, end: false },
  { to: "/admin/services", label: "Services", icon: ShoppingBag, end: false },
  { to: "/admin/orders", label: "Orders", icon: Package, end: false },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, end: false },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText, end: false },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote, end: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-400/30 border-t-brand-400 animate-spin" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/login?next=/admin" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-40 glass"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/30">
              Admin
            </span>
            <Link to="/">
              <Logo size="sm" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 text-sm font-medium btn-ghost btn-sm">
              <ArrowLeft className="w-4 h-4" /> Exit
            </Link>
            <ThemeToggle />
            <button onClick={logout} className="btn btn-outline btn-sm">Log out</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-7 flex flex-col lg:flex-row gap-7">
        {/* Sidebar nav */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-56 shrink-0"
        >
          <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap"
                style={({ isActive }) => ({
                  background: isActive ? "rgba(52,211,153,0.1)" : "transparent",
                  color: isActive ? "var(--color-brand-400)" : "var(--fg-muted)",
                })}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </motion.aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
