import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Wallet, Smartphone, History as HistoryIcon, Loader2 } from "lucide-react";
import { adminApi } from "../../lib/api";
import { rs, formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface Detail {
  user: any;
  transactions: any[];
  numbers: any[];
  payments: any[];
}

export function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .userDetail(id!)
      .then((r) => setData(r as Detail))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="py-20 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /></div>
    );
  if (!data) return <EmptyState title="User not found" />;

  const u = data.user;
  return (
    <div>
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:text-brand-400 transition" style={{ color: "var(--fg-muted)" }}>
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl" style={{ color: "var(--fg)" }}>{u.username}</h1>
            <p className="flex items-center gap-1.5 text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
              <Mail className="w-4 h-4" /> {u.email}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}><Wallet className="w-3.5 h-3.5" /> Balance</div>
              <div className="font-display font-bold text-xl text-brand-400">{rs(u.wallet_balance)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}><Wallet className="w-3.5 h-3.5" /> Held</div>
              <div className="font-display font-bold text-xl" style={{ color: "var(--fg)" }}>{rs(u.wallet_hold)}</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--fg-dim)" }}>Status</div>
              <div className="mt-1"><span className={`badge badge-${u.status === "active" ? "active" : "blocked"}`}>{u.status}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card overflow-hidden">
          <h3 className="font-display font-bold text-base px-5 py-4 flex items-center gap-2" style={{ color: "var(--fg)", borderBottom: "1px solid var(--border)" }}>
            <HistoryIcon className="w-4 h-4 text-brand-400" /> Transactions
          </h3>
          <div className="max-h-80 overflow-y-auto">
            {data.transactions.length === 0 ? (
              <EmptyState title="No transactions" />
            ) : (
              data.transactions.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-sm" style={{ color: "var(--fg)" }}>{t.description || "—"}</p>
                    <p className="text-xs" style={{ color: "var(--fg-dim)" }}>{formatDateTime(t.created_at)}</p>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${t.type === "credit" ? "text-brand-400" : ""}`} style={t.type === "debit" ? { color: "var(--fg)" } : undefined}>
                    {t.type === "credit" ? "+" : "−"}{rs(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <h3 className="font-display font-bold text-base px-5 py-4 flex items-center gap-2" style={{ color: "var(--fg)", borderBottom: "1px solid var(--border)" }}>
            <Smartphone className="w-4 h-4 text-brand-400" /> Numbers
          </h3>
          <div className="max-h-80 overflow-y-auto">
            {data.numbers.length === 0 ? (
              <EmptyState title="No numbers" />
            ) : (
              data.numbers.map((n) => (
                <div key={n.id} className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm" style={{ color: "var(--fg)" }}>{n.number}</span>
                    <span className={`badge badge-${n.status}`}>{n.status}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-dim)" }}>
                    {n.service} · {n.country} {n.otp_code ? `· OTP ${n.otp_code}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
