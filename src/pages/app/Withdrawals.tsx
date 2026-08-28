import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Banknote, Loader2, Send, Clock } from "lucide-react";
import { npApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { rs, formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface Withdrawal {
  id: number;
  amount: number;
  method: string;
  account_details: string;
  status: "pending" | "paid" | "rejected";
  admin_reply: string | null;
  created_at: string;
}

export function Withdrawals() {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Easypaisa");
  const [accountDetails, setAccountDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const enabled = settings.withdrawal_enabled === "true";
  const minAmount = Number(settings.withdrawal_min_amount || 200);

  const load = async () => {
    setLoading(true);
    try {
      const r = await npApi.myWithdrawals();
      setRows(r.withdrawals as Withdrawal[]);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast("Enter a valid amount.", "error");
    if (!accountDetails.trim()) return toast("Enter your account details.", "error");

    setSubmitting(true);
    try {
      await npApi.requestWithdrawal(amt, method, accountDetails.trim());
      toast("Withdrawal request submitted.", "success");
      setAmount("");
      setAccountDetails("");
      load();
      refreshProfile();
    } catch (e: any) {
      toast(e.message || "Could not submit withdrawal.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Cash out your referral earnings." />

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="w-5 h-5 text-brand-400" />
          <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Referral balance</h3>
        </div>
        <p className="font-display font-bold text-3xl mt-2" style={{ color: "var(--color-brand-400)" }}>{rs(profile?.referral_balance)}</p>
        <p className="text-xs mt-1" style={{ color: "var(--fg-dim)" }}>
          Minimum withdrawal Rs {minAmount}. Requires {settings.withdrawal_min_verified_referrals || 5} verified referrals.
        </p>
      </div>

      {!enabled ? (
        <div className="card p-6 mb-6 text-center">
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Withdrawals are currently unavailable. Please check back later.</p>
        </div>
      ) : (
        <div className="card p-6 mb-6">
          <h3 className="font-display font-bold text-lg mb-4" style={{ color: "var(--fg)" }}>Request a withdrawal</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Amount (Rs)</label>
                <input type="number" min={minAmount} value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder={String(minAmount)} />
              </div>
              <div>
                <label className="label">Payout method</label>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Easypaisa</option>
                  <option>JazzCash</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Account details (name, number/IBAN)</label>
              <textarea rows={2} className="input" value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} placeholder="e.g. Arslan Khan — 0300-1234567" />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit request
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Clock className="w-6 h-6 text-brand-400" />} title="No withdrawal requests yet" />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="p-4" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold" style={{ color: "var(--fg)" }}>{rs(w.amount)}</span>
                  <span className={`badge ${w.status === "paid" ? "badge-active" : w.status === "rejected" ? "badge-rejected" : "badge-pending"}`}>{w.status}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{w.method} — {w.account_details}</p>
                {w.admin_reply && <p className="text-xs mt-1" style={{ color: "var(--fg-dim)" }}>{w.admin_reply}</p>}
                <p className="text-[11px] mt-1" style={{ color: "var(--fg-dim)" }}>{formatDateTime(w.created_at)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
