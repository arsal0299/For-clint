import { useEffect, useState } from "react";
import { History as HistoryIcon, ArrowDownLeft, ArrowUpRight, Smartphone, ShoppingBag, X, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rs, formatDateTime } from "../../lib/utils";
import type { Transaction, NumberRequest, SmmOrder } from "../../lib/types";
import { smmApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";

const TABS = [
  { id: "wallet", label: "Wallet" },
  { id: "numbers", label: "Numbers" },
  { id: "orders", label: "Orders" },
] as const;

export function History() {
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("wallet");
  const [tx, setTx] = useState<Transaction[]>([]);
  const [numbers, setNumbers] = useState<NumberRequest[]>([]);
  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadOrders = async () => {
    try {
      const res = await smmApi.myOrders();
      setOrders(res.orders as SmmOrder[]);
    } catch {
      /* not fatal — the rest of the history page still works */
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, n] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("number_requests").select("*").order("requested_at", { ascending: false }).limit(50),
      ]);
      setTx((t.data as Transaction[]) || []);
      setNumbers((n.data as NumberRequest[]) || []);
      await loadOrders();
      setLoading(false);
    })();
  }, []);

  const cancelOrder = async (id: number) => {
    setCancellingId(id);
    try {
      await smmApi.cancelOrder(id);
      toast("Order cancelled and refunded.", "success");
      loadOrders();
    } catch (e: any) {
      toast(e.message || "Could not cancel order.", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const txColumns: DataTableColumn<Transaction>[] = [
    { header: "Date", render: (t) => <span style={{ color: "var(--fg-muted)" }}>{formatDateTime(t.created_at)}</span> },
    {
      header: "Type",
      render: (t) => (
        <span className={`badge badge-${t.type === "credit" ? "active" : "released"}`}>
          {t.type === "credit" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          {t.type}
        </span>
      ),
    },
    {
      header: "Amount",
      render: (t) => (
        <span className="font-mono font-semibold" style={{ color: t.type === "credit" ? "var(--color-brand-400)" : "var(--fg)" }}>
          {t.type === "credit" ? "+" : "−"}{rs(t.amount)}
        </span>
      ),
    },
    { header: "Description", className: "max-w-[320px]", render: (t) => <span style={{ color: "var(--fg-muted)" }}>{t.description || "—"}</span> },
  ];

  const numberColumns: DataTableColumn<NumberRequest>[] = [
    { header: "Number", render: (n) => <span className="font-mono" style={{ color: "var(--fg)" }}>{n.number}</span> },
    { header: "Service", render: (n) => <span style={{ color: "var(--fg-muted)" }}>{n.service}</span> },
    { header: "Country", render: (n) => <span style={{ color: "var(--fg-muted)" }}>{n.country}</span> },
    { header: "OTP", render: (n) => <span className="font-mono text-brand-400">{n.otp_code || "—"}</span> },
    { header: "Status", render: (n) => <span className={`badge badge-${n.status}`}>{n.status}</span> },
    { header: "Requested", render: (n) => <span style={{ color: "var(--fg-muted)" }}>{formatDateTime(n.requested_at)}</span> },
  ];

  const orderColumns: DataTableColumn<SmmOrder>[] = [
    { header: "Service", render: (o) => <span style={{ color: "var(--fg)" }}>{o.service_title}</span> },
    { header: "Qty", render: (o) => <span style={{ color: "var(--fg-muted)" }}>{o.quantity}</span> },
    { header: "Price", render: (o) => <span className="font-mono" style={{ color: "var(--fg)" }}>{rs(o.price)}</span> },
    { header: "Status", render: (o) => <span className={`badge badge-${o.status === "completed" ? "active" : o.status === "cancelled" ? "released" : "pending"}`}>{o.status}</span> },
    { header: "Placed", render: (o) => <span style={{ color: "var(--fg-muted)" }}>{formatDateTime(o.created_at)}</span> },
    {
      header: "",
      render: (o) =>
        o.status === "pending" ? (
          <button onClick={() => cancelOrder(o.id)} disabled={cancellingId === o.id} className="btn btn-ghost btn-sm">
            {cancellingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 text-red-400" />}
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="History" subtitle="Your wallet transactions, number requests, and service orders." />

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3.5 py-2 rounded-full text-sm font-medium transition"
            style={{
              background: tab === t.id ? "var(--color-brand-400)" : "var(--panel)",
              color: tab === t.id ? "#04120c" : "var(--fg-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "wallet" && (
        <DataTable columns={txColumns} rows={tx} keyField={(t) => t.id} loading={loading} emptyIcon={<HistoryIcon className="w-6 h-6 text-brand-400" />} emptyTitle="No transactions yet" />
      )}
      {tab === "numbers" && (
        <DataTable columns={numberColumns} rows={numbers} keyField={(n) => n.id} loading={loading} emptyIcon={<Smartphone className="w-6 h-6 text-brand-400" />} emptyTitle="No number requests yet" />
      )}
      {tab === "orders" && (
        <DataTable columns={orderColumns} rows={orders} keyField={(o) => o.id} loading={loading} emptyIcon={<ShoppingBag className="w-6 h-6 text-brand-400" />} emptyTitle="No orders yet" emptyDescription="Browse services to place your first order." />
      )}
    </div>
  );
}
