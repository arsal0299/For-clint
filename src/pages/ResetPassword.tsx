import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { Spinner } from "../components/ui/Spinner";

export function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase puts the recovery session in the URL hash and needs a moment
  // to establish it client-side before updateUser() will work.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast("Password must be at least 6 characters.", "error");
    if (password !== confirm) return toast("Passwords don't match.", "error");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Password updated — you're logged in.", "success");
    navigate("/dashboard", { replace: true });
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
              Set a new password
            </h1>
            <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
              Choose something you haven't used before.
            </p>
          </div>

          <form onSubmit={submit} className="card p-6 sm:p-7 space-y-5">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={loading || !ready} className="btn btn-primary w-full">
              {loading ? <Spinner /> : <>Update password <ArrowRight className="w-4 h-4" /></>}
            </button>
            {!ready && (
              <p className="text-xs text-center" style={{ color: "var(--fg-dim)" }}>
                Verifying your reset link…
              </p>
            )}
          </form>
        </motion.div>
      </div>

      <div className="fixed bottom-5 right-5">
        <ThemeToggle />
      </div>
    </>
  );
}
