import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, ArrowRight, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { Spinner } from "../components/ui/Spinner";

export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const blocked = params.get("blocked") === "1";

  useEffect(() => {
    if (profile) {
      navigate(params.get("next") || "/dashboard", { replace: true });
    }
  }, [profile, navigate, params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Welcome back!", "success");
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen grid place-items-center px-5 pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl" style={{ color: "var(--fg)" }}>
              Welcome back
            </h1>
            <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
              Log in to your Numera dashboard.
            </p>
          </div>

          {blocked && (
            <div className="card p-4 mb-5 flex items-start gap-3" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Your account has been blocked. Please contact support.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="card p-6 sm:p-7 space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <Spinner /> : <>Log in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--fg-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" className="text-brand-400 font-semibold hover:underline">
              Create one
            </Link>
          </p>
          <p className="text-center text-sm mt-2">
            <Link to="/forgot-password" className="text-sm" style={{ color: "var(--fg-dim)" }}>
              Forgot your password?
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="fixed bottom-5 right-5">
        <ThemeToggle />
      </div>
    </>
  );
}
