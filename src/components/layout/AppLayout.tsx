import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  Mailbox,
  Wallet,
  History,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  Shield,
  Settings as SettingsIcon,
  Gift,
  Banknote,
  Radio,
  Radar,
  MessageCircle,
  ShoppingBag,
  KeyRound,
  Megaphone,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { supabase } from "../../lib/supabase";
import { rs } from "../../lib/utils";
import { ThemeToggle } from "../ThemeToggle";
import { Logo } from "../Logo";

const NAV = [
  { to: "/overview", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard", label: "Get Number", icon: Smartphone },
  { to: "/live-otp", label: "Live OTP", icon: Radio },
  { to: "/services", label: "Services", icon: ShoppingBag },
  { to: "/referrals", label: "Refer & Earn", icon: Gift },
  { to: "/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/history", label: "History", icon: History },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/mail", label: "Temp Mail", icon: Mailbox },
  { to: "/topup", label: "Top Up", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserRound },
];

function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const { profile, isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <Link to="/" onClick={onNavigate}>
          <Logo />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 -mr-1.5 rounded-lg btn-ghost relative z-10"
          >
            <X className="w-5 h-5" style={{ color: "var(--fg-muted)" }} />
          </button>
        )}
      </div>

      {/* Wallet card */}
      <div className="p-4">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>
            Wallet balance
          </p>
          <p className="font-display font-bold text-2xl mt-1" style={{ color: "var(--fg)" }}>
            {rs(profile?.wallet_balance)}
          </p>
          {profile && profile.wallet_hold > 0 && (
            <p className="text-[11px] mt-1" style={{ color: "var(--fg-dim)" }}>
              {rs(profile.wallet_hold)} held on pending numbers
            </p>
          )}
          {profile && profile.referral_balance > 0 && (
            <p className="text-[11px] mt-1 text-brand-400">
              + {rs(profile.referral_balance)} referral credit (numbers only)
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? "text-brand-400" : ""
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "rgba(52,211,153,0.1)" : "transparent",
              color: isActive ? "var(--color-brand-400)" : "var(--fg-muted)",
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-[18px] h-[18px]" style={{ color: isActive ? "var(--color-brand-400)" : undefined }} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="h-px my-3" style={{ background: "var(--border)" }} />
            <p className="px-3.5 text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--fg-dim)" }}>
              Admin
            </p>
            <NavLink
              to="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium"
              style={{ color: "var(--fg-muted)" }}
            >
              <Shield className="w-[18px] h-[18px]" /> Admin panel
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-3 space-y-1 border-t" style={{ borderColor: "var(--border)" }}>
        {settings.contact_email && (
          <a
            href={`mailto:${settings.contact_email}`}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium btn-ghost"
            style={{ color: "var(--fg-muted)" }}
          >
            <LifeBuoy className="w-[18px] h-[18px]" /> Need help
          </a>
        )}
        <a
          href="https://whatsapp.com/channel/0029Vb871xM89inbSFzEQP18"
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium btn-ghost"
          style={{ color: "var(--fg-muted)" }}
        >
          <MessageCircle className="w-[18px] h-[18px]" /> Join us
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium btn-ghost"
          style={{ color: "var(--fg-muted)" }}
        >
          <LogOut className="w-[18px] h-[18px]" /> Log out
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  const { announcement } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dismissed, setDismissed] = useState<number | null>(() => {
    const stored = localStorage.getItem("dismissed_announcement_id");
    return stored ? Number(stored) : null;
  });

  const dismissAnnouncement = () => {
    if (!announcement) return;
    localStorage.setItem("dismissed_announcement_id", String(announcement.id));
    setDismissed(announcement.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-400/30 border-t-brand-400 animate-spin" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.status === "blocked") return <Navigate to="/login?blocked=1" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 glass"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="mobile-overlay"
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="mobile-drawer"
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 glass-solid lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <SidebarContent onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-4 glass"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" style={{ color: "var(--fg)" }} />
          </button>
          <Logo size="sm" />
          <ThemeToggle />
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-6xl w-full mx-auto">
          {announcement && dismissed !== announcement.id && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl flex items-center gap-3"
              style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}
            >
              <Megaphone className="w-4 h-4 text-brand-400 shrink-0" />
              <p className="text-sm flex-1" style={{ color: "var(--fg)" }}>{announcement.message}</p>
              <button onClick={dismissAnnouncement} className="shrink-0" aria-label="Dismiss">
                <X className="w-4 h-4" style={{ color: "var(--fg-dim)" }} />
              </button>
            </motion.div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
