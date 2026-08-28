import { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Mail, Lock, UserRound, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";

export function Profile() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const currentEmail = profile?.email || "";

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed) return toast("Enter a new email address.", "error");
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      return toast("That's already your current email.", "error");
    }

    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      toast("Confirmation link sent to your new email. Click it to finish the change.", "success");
      setNewEmail("");
    } catch (e: any) {
      toast(e.message || "Could not update email.", "error");
    } finally {
      setEmailSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return toast("Enter your current password.", "error");
    if (newPassword.length < 6) return toast("New password must be at least 6 characters.", "error");
    if (newPassword !== confirmPassword) return toast("New passwords do not match.", "error");

    setPasswordSaving(true);
    try {
      // Re-authenticate with the current password first — Supabase's
      // updateUser() doesn't require it, but we ask for it here as a
      // safety check before allowing the change.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      if (signInErr) {
        toast("Current password is incorrect.", "error");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast("Password updated.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast(e.message || "Could not update password.", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account details." />

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr", maxWidth: 560 }}>

        {/* Account summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "var(--brand-500-10, rgba(99,102,241,0.12))" }}>
              <UserRound className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="font-semibold" style={{ color: "var(--fg)" }}>{profile?.username}</div>
              <div className="text-xs" style={{ color: "var(--fg-faint)" }}>
                Member since {profile?.created_at ? formatDateTime(profile.created_at) : "—"}
              </div>
            </div>
          </div>
          <div className="text-xs px-3 py-2 rounded-lg flex items-start gap-2" style={{ background: "var(--bg-subtle, rgba(255,255,255,0.04))", color: "var(--fg-muted)" }}>
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Your username can't be changed. Email and password can be updated below.
          </div>
        </motion.div>

        {/* Change email */}
        <motion.form
          onSubmit={submitEmail}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-1" style={{ color: "var(--fg)" }}>
            <Mail className="w-4 h-4 text-brand-400" /> Email address
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--fg-faint)" }}>
            Current: <span style={{ color: "var(--fg-muted)" }}>{currentEmail}</span>
          </p>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>New email</label>
          <input
            type="email"
            className="input w-full mb-3"
            placeholder="you@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" disabled={emailSaving} className="btn btn-primary btn-sm">
            {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update email"}
          </button>
        </motion.form>

        {/* Change password */}
        <motion.form
          onSubmit={submitPassword}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--fg)" }}>
            <Lock className="w-4 h-4 text-brand-400" /> Password
          </h2>

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>Current password</label>
          <input
            type="password"
            className="input w-full mb-3"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>New password</label>
          <input
            type="password"
            className="input w-full mb-3"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>Confirm new password</label>
          <input
            type="password"
            className="input w-full mb-4"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          <button type="submit" disabled={passwordSaving} className="btn btn-primary btn-sm">
            {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
          </button>
        </motion.form>

      </div>
    </div>
  );
}
