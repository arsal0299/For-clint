import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { ThemeToggle } from "../ThemeToggle";
import { Logo } from "../Logo";

export function PublicNavbar() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "var(--panel)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <nav className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: "var(--fg-muted)" }}>
          <a href="/#how-it-works" className="hover:text-brand-400 transition">How it works</a>
          <a href="/#features" className="hover:text-brand-400 transition">Features</a>
          <a href="/#pricing" className="hover:text-brand-400 transition">Pricing</a>
          <a href="/#faq" className="hover:text-brand-400 transition">FAQ</a>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {profile ? (
            <button onClick={() => navigate("/dashboard")} className="btn btn-primary btn-sm">
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
