import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Wallet, Smartphone, TrendingUp, CheckCircle2, ShoppingBag, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { rs, formatDateTime } from "../../lib/utils";
import { smmApi } from "../../lib/api";
import type { Transaction, NumberRequest, SmmOrder } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>{label}</p>
      </div>
      <p className="font-display font-bold text-2xl" style={{ color: "var(--fg)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--fg-dim)" }}>{sub}</p>}
    </div>
  );
}

export function Overview() {
  const { profile } = useAuth();
  const [tx, setTx] = useState<Transaction[]>([]);
  const [numbers, setNumbers] = useState<NumberRequest[]>([]);
  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, n, o] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("number_requests").select("*").order("requested_at", { ascending: false }).limit(200),
        smmApi.myOrders().catch(() => ({ orders: [] })),
      ]);
      setTx((t.data as Transaction[]) || []);
      setNumbers((n.data as NumberRequest[]) || []);
      setOrders((o.orders as SmmOrder[]) || []);
      setLoading(false);
    })();
  }, []);

  const totalSpent = useMemo(() => tx.filter((t) => t.type === "debit").reduce((a, t) => a + Number(t.amount), 0), [tx]);
  const totalNumbers = numbers.length;
  const totalOtps = useMemo(() => numbers.filter((n) => n.otp_code).length, [numbers]);
  const totalOrders = orders.length;

  // Daily spend for the last 14 days (custom bar chart, no charting library).
  const dailySpend = useMemo(() => {
    const days: { label: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = tx
        .filter((t) => t.type === "debit" && t.created_at.slice(0, 10) === key)
        .reduce((a, t) => a + Number(t.amount), 0);
      days.push({ label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), total });
    }
    return days;
  }, [tx]);
  const maxDaily = Math.max(1, ...dailySpend.map((d) => d.total));

  // Top services by number of requests.
  const topServices = useMemo(() => {
    const map = new Map<string, number>();
    numbers.forEach((n) => map.set(n.service, (map.get(n.service) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [numbers]);
  const maxServiceCount = Math.max(1, ...topServices.map(([, c]) => c));

  const recentActivity = useMemo(() => {
    const items = [
      ...tx.slice(0, 6).map((t) => ({ type: "tx" as const, at: t.created_at, data: t })),
      ...numbers.slice(0, 6).map((n) => ({ type: "num" as const, at: n.requested_at, data: n })),
    ];
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
  }, [tx, numbers]);

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome back${profile ? ", " + profile.username : ""} — here's your activity at a glance.`} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Wallet className="w-4 h-4 text-brand-400" />} label="Wallet" value={rs(profile?.wallet_balance)} sub={profile && profile.referral_balance > 0 ? `+${rs(profile.referral_balance)} referral` : undefined} />
        <StatCard icon={<Smartphone className="w-4 h-4 text-brand-400" />} label="Numbers requested" value={String(totalNumbers)} sub={`${totalOtps} received OTP`} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-brand-400" />} label="Total spent" value={rs(totalSpent)} />
        <StatCard icon={<ShoppingBag className="w-4 h-4 text-brand-400" />} label="Service orders" value={String(totalOrders)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Daily spend chart */}
        <div className="card p-5">
          <h3 className="font-display font-bold text-base mb-4" style={{ color: "var(--fg)" }}>Spending — last 14 days</h3>
          <div className="flex items-end gap-1.5 h-32">
            {dailySpend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(3, (d.total / maxDaily) * 100)}%`,
                    background: "var(--color-brand-400)",
                    opacity: 0.4 + (d.total / maxDaily) * 0.6,
                  }}
                  title={`${d.label}: ${rs(d.total)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--fg-dim)" }}>
            <span>{dailySpend[0]?.label}</span>
            <span>{dailySpend[dailySpend.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top services chart */}
        <div className="card p-5">
          <h3 className="font-display font-bold text-base mb-4" style={{ color: "var(--fg)" }}>Top services</h3>
          {topServices.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--fg-dim)" }}>No numbers requested yet.</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(([service, count]) => (
                <div key={service}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--fg)" }}>{service}</span>
                    <span style={{ color: "var(--fg-dim)" }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / maxServiceCount) * 100}%`, background: "var(--color-brand-400)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-5">
        <h3 className="font-display font-bold text-base mb-4" style={{ color: "var(--fg)" }}>Recent activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--fg-dim)" }}>Nothing yet — request a number or top up to get started.</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <motion.div
                key={`${item.type}-${item.data.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-2.5 rounded-lg"
                style={{ background: "var(--panel)" }}
              >
                {item.type === "tx" ? (
                  <>
                    <div className="flex items-center gap-2">
                      {item.data.type === "credit" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-brand-400" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "var(--fg-dim)" }} />
                      )}
                      <span className="text-sm" style={{ color: "var(--fg)" }}>{item.data.description || (item.data.type === "credit" ? "Credit" : "Debit")}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm" style={{ color: item.data.type === "credit" ? "var(--color-brand-400)" : "var(--fg)" }}>
                        {item.data.type === "credit" ? "+" : "−"}{rs(item.data.amount)}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--fg-dim)" }}>{formatDateTime(item.at)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {item.data.otp_code ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> : <Smartphone className="w-3.5 h-3.5" style={{ color: "var(--fg-dim)" }} />}
                      <span className="text-sm" style={{ color: "var(--fg)" }}>{item.data.service} — {item.data.country}</span>
                    </div>
                    <div className="text-right">
                      <span className={`badge badge-${item.data.status}`}>{item.data.status}</span>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-dim)" }}>{formatDateTime(item.at)}</p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
