import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, User, ArrowRight, AtSign } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { Spinner } from "../components/ui/Spinner";

export function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref")?.trim() || undefined;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_]{3,}$/.test(username)) {
      toast("Username must be 3+ characters (letters, numbers, underscore).", "error");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, ref: refCode } },
    });
    setLoading(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    if (data.user && !data.session) {
      toast("Account created! Check your email to confirm, then log in.", "success");
      navigate("/login");
    } else {
      toast("Account created — welcome to Numera!", "success");
    }
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
              Create your account
            </h1>
            <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
              Get a wallet, request numbers, and receive OTPs in seconds.
            </p>
            {refCode && (
              <p className="mt-3 text-sm font-medium text-brand-400">
                Invited by @{refCode}
              </p>
            )}
          </div>

          <form onSubmit={submit} className="card p-6 sm:p-7 space-y-5">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="arslan0299"
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
                <input
                  type="email"
                  required
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <Spinner /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--fg-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Log in
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
