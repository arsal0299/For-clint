import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface Coupon {
  id: number;
  code: string;
  credit_amount: number;
  max_uses: number;
  used_count: number;
  active: boolean;
  created_at: string;
}

export function AdminCoupons() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.coupons();
      setRows(r.coupons as Coupon[]);
    } catch {
      toast("Could not load coupons.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(creditAmount);
    const uses = Number(maxUses);
    if (!code.trim()) return toast("Enter a coupon code.", "error");
    if (!amount || amount <= 0) return toast("Enter a valid credit amount.", "error");
    if (!uses || uses <= 0) return toast("Enter a valid usage limit.", "error");

    setCreating(true);
    try {
      await adminApi.createCoupon(code.trim(), amount, uses);
      toast("Coupon created.", "success");
      setCode("");
      setCreditAmount("");
      setMaxUses("");
      load();
    } catch (e: any) {
      toast(e.message || "Could not create coupon.", "error");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (c: Coupon) => {
    try {
      await adminApi.toggleCoupon(c.id, !c.active);
      load();
    } catch (e: any) {
      toast(e.message || "Could not update coupon.", "error");
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteCoupon(c.id);
      toast("Coupon deleted.", "success");
      load();
    } catch (e: any) {
      toast(e.message || "Could not delete coupon.", "error");
    }
  };

  return (
    <div>
      <PageHeader title="Discount coupons" subtitle="Create codes that credit a user's wallet for free — set the amount and how many people can use each code." />

      <div className="card p-6 mb-6">
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: "var(--fg)" }}>Create a coupon</h3>
        <form onSubmit={create} className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="label">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="e.g. WELCOME50" />
          </div>
          <div>
            <label className="label">Credit (Rs)</label>
            <input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="input" placeholder="50" />
          </div>
          <div>
            <label className="label">Max uses</label>
            <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="input" placeholder="100" />
          </div>
          <button type="submit" disabled={creating} className="btn btn-primary sm:col-span-4">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create coupon
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Tag className="w-6 h-6 text-brand-400" />} title="No coupons yet" description="Create one above to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Code</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Credit</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Used</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Created</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: "var(--fg)" }}>{c.code}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg)" }}>{rs(c.credit_amount)}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{c.used_count} / {c.max_uses}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggle(c)} className={`badge ${c.active ? "badge-active" : "badge-rejected"}`}>
                        {c.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{formatDateTime(c.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => remove(c)} className="btn btn-ghost btn-sm">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
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
