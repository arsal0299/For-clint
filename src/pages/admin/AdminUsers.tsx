import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, UserMinus, Ban, CheckCircle2, Users, Download, Loader2 } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDate } from "../../lib/utils";
import { toCsv, downloadCsv } from "../../lib/csv";
import type { AdminUser } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";

export function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.users(q, page, pageSize);
      setUsers(r.users as AdminUser[]);
      setTotal(r.total as number);
    } catch {
      toast("Could not load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const adjust = async (u: AdminUser, type: "credit" | "debit") => {
    const raw = prompt(`Amount to ${type === "credit" ? "add to" : "deduct from"} ${u.username}'s wallet:`);
    if (!raw) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) return toast("Enter a valid amount.", "error");
    setBusyId(u.id);
    try {
      await adminApi.adjustCredit(u.id, amount, type);
      toast(`Wallet ${type === "credit" ? "credited" : "debited"}.`, "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      const next = u.status === "active" ? "blocked" : "active";
      await adminApi.toggleStatus(u.id, next);
      toast(`User ${next}.`, "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await adminApi.users(q, 1, 5000);
      const all = r.users as AdminUser[];
      const csv = toCsv(all, [
        { header: "Username", value: (u) => u.username },
        { header: "Email", value: (u) => u.email },
        { header: "Wallet Balance", value: (u) => u.wallet_balance },
        { header: "Wallet Held", value: (u) => u.wallet_hold },
        { header: "Referral Balance", value: (u) => u.referral_balance },
        { header: "Total Numbers", value: (u) => u.total_numbers },
        { header: "OTPs Received", value: (u) => u.otp_count },
        { header: "Total Spent", value: (u) => u.total_spent },
        { header: "Status", value: (u) => u.status },
        { header: "Joined", value: (u) => formatDate(u.created_at) },
      ]);
      downloadCsv(`numera-users-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (e: any) {
      toast(e.message || "Could not export users.", "error");
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      header: "User",
      render: (u) => (
        <>
          <button onClick={() => navigate(`/admin/users/${u.id}`)} className="font-semibold text-brand-400 hover:underline">{u.username}</button>
          <div className="text-xs" style={{ color: "var(--fg-dim)" }}>{u.email}</div>
          <div className="text-[11px]" style={{ color: "var(--fg-dim)" }}>{formatDate(u.created_at)}</div>
        </>
      ),
    },
    { header: "Wallet", render: (u) => <span className="font-mono font-semibold" style={{ color: "var(--fg)" }}>{rs(u.wallet_balance)}</span> },
    { header: "Held", render: (u) => <span className="font-mono" style={{ color: "var(--fg-muted)" }}>{rs(u.wallet_hold)}</span> },
    { header: "Numbers", render: (u) => <span className="font-mono" style={{ color: "var(--fg-muted)" }}>{u.total_numbers} ({u.otp_count} OTP)</span> },
    { header: "Spent", render: (u) => <span className="font-mono" style={{ color: "var(--fg-muted)" }}>{rs(u.total_spent)}</span> },
    { header: "Status", render: (u) => <span className={`badge badge-${u.status === "active" ? "active" : "blocked"}`}>{u.status}</span> },
    {
      header: "Actions",
      render: (u) => (
        <div className="flex flex-wrap gap-1.5">
          <button disabled={busyId === u.id} onClick={() => adjust(u, "credit")} className="btn btn-ghost btn-sm" title="Add credit">
            <UserPlus className="w-3.5 h-3.5 text-brand-400" /> Add
          </button>
          <button disabled={busyId === u.id} onClick={() => adjust(u, "debit")} className="btn btn-ghost btn-sm" title="Deduct">
            <UserMinus className="w-3.5 h-3.5 text-amber-400" /> Cut
          </button>
          <button disabled={busyId === u.id} onClick={() => toggle(u)} className="btn btn-ghost btn-sm" title={u.status === "active" ? "Block" : "Unblock"}>
            {u.status === "active" ? <Ban className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Add credits, block or unblock accounts, and review activity." />

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
          <input className="input pl-10" placeholder="Search username or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn btn-ghost shrink-0">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        keyField={(u) => u.id}
        loading={loading}
        emptyIcon={<Users className="w-6 h-6 text-brand-400" />}
        emptyTitle="No users found"
        footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
      />
    </div>
  );
}
