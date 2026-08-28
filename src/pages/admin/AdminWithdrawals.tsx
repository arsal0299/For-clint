import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Banknote, Check, X } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface Row {
  id: number;
  username: string;
  amount: number;
  method: string;
  account_details: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

export function AdminWithdrawals() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.withdrawals();
      setRows(r.withdrawals as Row[]);
    } catch {
      toast("Could not load withdrawals.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: number, status: "paid" | "rejected") => {
    setBusyId(id);
    try {
      await adminApi.updateWithdrawalStatus(id, status);
      toast(`Withdrawal ${status}.`, "success");
      load();
    } catch (e: any) {
      toast(e.message || "Could not update withdrawal.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Review and pay out referral withdrawal requests." />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Banknote className="w-6 h-6 text-brand-400" />} title="No withdrawal requests" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">User</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Amount</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Method / Details</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Requested</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w, i) => (
                  <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3.5 font-medium" style={{ color: "var(--fg)" }}>{w.username}</td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: "var(--fg)" }}>{rs(w.amount)}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{w.method} — {w.account_details}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{formatDateTime(w.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${w.status === "paid" ? "badge-active" : w.status === "rejected" ? "badge-rejected" : "badge-pending"}`}>{w.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {w.status === "pending" && (
                        <div className="flex gap-1.5">
                          {busyId === w.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                          ) : (
                            <>
                              <button onClick={() => update(w.id, "paid")} className="btn btn-primary btn-sm">
                                <Check className="w-3.5 h-3.5" /> Paid
                              </button>
                              <button onClick={() => update(w.id, "rejected")} className="btn btn-danger btn-sm">
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
