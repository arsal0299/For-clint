import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { Spinner } from "../components/ui/Spinner";

export function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setSent(true);
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
              Reset your password
            </h1>
            <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
              We'll email you a link to set a new one.
            </p>
          </div>

          {sent ? (
            <div className="card p-6 sm:p-7 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-brand-400 mx-auto" />
              <p className="font-medium" style={{ color: "var(--fg)" }}>Check your inbox</p>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
              </p>
            </div>
          ) : (
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
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? <Spinner /> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="text-center text-sm mt-6" style={{ color: "var(--fg-muted)" }}>
            <Link to="/login" className="text-brand-400 font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
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
