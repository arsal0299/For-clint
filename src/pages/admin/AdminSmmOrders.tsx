import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, ShoppingBag, ExternalLink, Download } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDateTime } from "../../lib/utils";
import { toCsv, downloadCsv } from "../../lib/csv";
import type { SmmOrder } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

const STATUSES = ["all", "pending", "processing", "completed", "cancelled"];

export function AdminSmmOrders() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<SmmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.smmOrders(status, page, pageSize);
      setRows(r.orders as SmmOrder[]);
      setTotal(r.total as number);
    } catch {
      toast("Could not load orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateSmmOrderStatus(id, newStatus);
      toast("Order updated.", "success");
      load();
    } catch (e: any) {
      toast(e.message || "Could not update order.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await adminApi.smmOrders(status, 1, 5000);
      const all = r.orders as SmmOrder[];
      const csv = toCsv(all, [
        { header: "Username", value: (o) => o.username || "" },
        { header: "Service", value: (o) => o.service_title },
        { header: "Quantity", value: (o) => o.quantity },
        { header: "Link", value: (o) => o.link },
        { header: "Price", value: (o) => o.price },
        { header: "Status", value: (o) => o.status },
        { header: "Placed", value: (o) => formatDateTime(o.created_at) },
      ]);
      downloadCsv(`numera-orders-${status}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (e: any) {
      toast(e.message || "Could not export orders.", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Service orders" subtitle="Review and fulfil SMM service orders." />

      <div className="flex flex-wrap gap-2 mb-5 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="px-3.5 py-2 rounded-full text-sm font-medium capitalize transition"
              style={{
                background: status === s ? "var(--color-brand-400)" : "var(--panel)",
                color: status === s ? "#04120c" : "var(--fg-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn btn-ghost btn-sm">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="w-6 h-6 text-brand-400" />} title="No orders here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">User</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Service</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Qty</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Link</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Price</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Placed</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3.5 font-medium" style={{ color: "var(--fg)" }}>{o.username}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{o.service_title}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{o.quantity}</td>
                    <td className="px-5 py-3.5">
                      <a href={o.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-400 max-w-[160px] truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{o.link}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: "var(--fg)" }}>{rs(o.price)}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{formatDateTime(o.created_at)}</td>
                    <td className="px-5 py-3.5">
                      {updatingId === o.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                      ) : (
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="input py-1.5 text-xs"
                          disabled={o.status === "cancelled"}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancel &amp; refund</option>
                        </select>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
