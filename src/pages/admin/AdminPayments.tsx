import { useEffect, useState } from "react";
import { Check, X, ExternalLink, Loader2, Receipt, Download } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDateTime } from "../../lib/utils";
import { toCsv, downloadCsv } from "../../lib/csv";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";

interface Row {
  id: number;
  username: string;
  email: string;
  amount: number;
  screenshot_url: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

export function AdminPayments() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.payments(filter, page, pageSize);
      setRows(r.payments as Row[]);
      setTotal(r.total as number);
    } catch {
      toast("Could not load payments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const review = async (decision: "approve" | "reject") => {
    if (!reviewing) return;
    setBusy(true);
    try {
      await adminApi.reviewPayment(reviewing.id, decision, reply.trim() || undefined);
      toast(`Payment ${decision === "approve" ? "approved" : "rejected"}.`, "success");
      setReviewing(null);
      setReply("");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await adminApi.payments(filter, 1, 5000);
      const all = r.payments as Row[];
      const csv = toCsv(all, [
        { header: "Username", value: (p) => p.username },
        { header: "Email", value: (p) => p.email },
        { header: "Amount", value: (p) => p.amount },
        { header: "Status", value: (p) => p.status },
        { header: "Admin Reply", value: (p) => p.admin_reply || "" },
        { header: "Submitted", value: (p) => formatDateTime(p.created_at) },
      ]);
      downloadCsv(`numera-payments-${filter}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (e: any) {
      toast(e.message || "Could not export payments.", "error");
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<Row>[] = [
    {
      header: "User",
      render: (p) => (
        <>
          <div className="font-medium" style={{ color: "var(--fg)" }}>{p.username}</div>
          <div className="text-xs" style={{ color: "var(--fg-dim)" }}>{p.email}</div>
        </>
      ),
    },
    { header: "Amount", render: (p) => <span className="font-mono font-semibold" style={{ color: "var(--fg)" }}>{rs(p.amount)}</span> },
    {
      header: "Proof",
      render: (p) => (
        <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 text-xs hover:underline">
          View <ExternalLink className="w-3 h-3" />
        </a>
      ),
    },
    { header: "Status", render: (p) => <span className={`badge badge-${p.status === "approved" ? "active" : p.status === "rejected" ? "rejected" : "pending"}`}>{p.status}</span> },
    { header: "Submitted", render: (p) => <span style={{ color: "var(--fg-muted)" }}>{formatDateTime(p.created_at)}</span> },
    {
      header: "",
      render: (p) =>
        p.status === "pending" ? (
          <button onClick={() => { setReviewing(p); setReply(p.admin_reply ?? ""); }} className="btn btn-primary btn-sm">
            Review
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Payment requests" subtitle="Review top-up proofs, approve or reject with a note." />

      <div className="flex gap-2 mb-5 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn btn-ghost btn-sm">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        keyField={(p) => p.id}
        loading={loading}
        emptyIcon={<Receipt className="w-6 h-6 text-brand-400" />}
        emptyTitle="No payment requests here"
        footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
      />

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={reviewing ? `Review — ${reviewing.username}` : ""}>
        {reviewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-brand-400">{rs(reviewing.amount)}</span>
              <a href={reviewing.screenshot_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                Open screenshot <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div>
              <label className="label">Note to user (optional)</label>
              <textarea
                rows={3}
                className="input"
                placeholder="e.g. Payment verified — credited to your wallet."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => review("approve")} disabled={busy} className="btn btn-primary flex-1">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve &amp; credit
              </button>
              <button onClick={() => review("reject")} disabled={busy} className="btn btn-danger flex-1">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
