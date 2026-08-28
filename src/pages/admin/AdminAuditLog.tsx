import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, ScrollText } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

interface LogRow {
  id: number;
  admin_username: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  wallet_credit: "Credited wallet",
  wallet_debit: "Debited wallet",
  user_status_change: "Changed user status",
  payment_approve: "Approved payment",
  payment_reject: "Rejected payment",
  service_price_save: "Saved service price",
  service_price_delete: "Deleted service price",
  settings_save: "Saved settings",
  coupon_create: "Created coupon",
  coupon_toggle: "Toggled coupon",
  coupon_delete: "Deleted coupon",
  service_create: "Created service",
  service_update: "Updated service",
  service_toggle: "Toggled service",
  service_pin: "Pinned/unpinned service",
  service_delete: "Deleted service",
  order_status_change: "Changed order status",
  order_cancel: "Cancelled order",
  announcement_create: "Sent announcement",
  announcement_toggle: "Toggled announcement",
  announcement_delete: "Deleted announcement",
};

export function AdminAuditLog() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await adminApi.auditLog(page, pageSize);
        setRows(r.log as LogRow[]);
        setTotal(r.total as number);
      } catch {
        toast("Could not load audit log.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every admin action, in order — who did what and when." />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText className="w-6 h-6 text-brand-400" />} title="No admin actions logged yet" />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className="p-4 flex items-start justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: "var(--fg)" }}>
                    <span className="font-semibold text-brand-400">{r.admin_username || "unknown"}</span>{" "}
                    {ACTION_LABELS[r.action] || r.action}
                    {r.target && <span style={{ color: "var(--fg-muted)" }}> — {r.target}</span>}
                  </p>
                  {r.details && (
                    <p className="text-xs mt-0.5 font-mono truncate" style={{ color: "var(--fg-dim)" }}>
                      {JSON.stringify(r.details)}
                    </p>
                  )}
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--fg-dim)" }}>{formatDateTime(r.created_at)}</span>
              </motion.div>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
