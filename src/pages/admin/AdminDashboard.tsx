import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, UserX, Smartphone, TrendingUp, Wallet, Clock, CreditCard, Activity } from "lucide-react";
import { adminApi } from "../../lib/api";
import { rs, formatDateTime } from "../../lib/utils";
import type { AdminStats } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then((r) => setStats(r.stats as AdminStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-400/30 border-t-brand-400 animate-spin" />
      </div>
    );
  }
  if (!stats) {
    return <EmptyState title="Could not load stats" description="Make sure your Supabase setup is complete." />;
  }

  const cards = [
    { label: "Total users", value: String(stats.total_users), icon: Users },
    { label: "Blocked users", value: String(stats.blocked_users), icon: UserX },
    { label: "Active numbers", value: String(stats.active_numbers), icon: Smartphone, accent: true },
    { label: "Numbers issued", value: String(stats.total_numbers), icon: Activity },
    { label: "Revenue", value: rs(stats.total_revenue), icon: TrendingUp, accent: true },
    { label: "In wallets", value: rs(stats.wallets_total), icon: Wallet },
    { label: "Held (pending OTPs)", value: `${rs(stats.held_total)} · ${stats.pending_numbers}`, icon: Clock, accent: true },
    { label: "Payments to review", value: String(stats.pending_payments), icon: CreditCard, accent: stats.pending_payments > 0 },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Platform stats at a glance." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-9">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <c.icon className={`w-5 h-5 ${c.accent ? "text-brand-400" : ""}`} style={c.accent ? undefined : { color: "var(--fg-dim)" }} />
            </div>
            <div className={`font-display font-bold text-2xl ${c.accent ? "text-gradient" : ""}`} style={c.accent ? undefined : { color: "var(--fg)" }}>
              {c.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-dim)" }}>{c.label}</div>
          </motion.div>
        ))}
      </div>

      <h2 className="font-display font-bold text-xl mb-4" style={{ color: "var(--fg)" }}>Recent number requests</h2>
      <div className="card overflow-hidden">
        {!stats.recent?.length ? (
          <EmptyState title="No requests yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">User</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Number</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Service</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Country</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Requested</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3.5 font-medium" style={{ color: "var(--fg)" }}>{r.username}</td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: "var(--fg-muted)" }}>{r.number}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{r.service}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{r.country}</td>
                    <td className="px-5 py-3.5"><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{formatDateTime(r.requested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
