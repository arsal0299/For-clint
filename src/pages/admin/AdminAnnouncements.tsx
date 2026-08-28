import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { Announcement } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function AdminAnnouncements() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.announcements();
      setRows(r.announcements as Announcement[]);
    } catch {
      toast("Could not load announcements.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return toast("Enter a message.", "error");
    setSending(true);
    try {
      await adminApi.createAnnouncement(message.trim());
      toast("Announcement sent to all users.", "success");
      setMessage("");
      load();
    } catch (e: any) {
      toast(e.message || "Could not send announcement.", "error");
    } finally {
      setSending(false);
    }
  };

  const toggle = async (a: Announcement) => {
    try {
      await adminApi.toggleAnnouncement(a.id);
      load();
    } catch (e: any) {
      toast(e.message || "Could not update.", "error");
    }
  };

  const remove = async (a: Announcement) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await adminApi.deleteAnnouncement(a.id);
      load();
    } catch (e: any) {
      toast(e.message || "Could not delete.", "error");
    }
  };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast a banner to every logged-in user — e.g. new or cheaper services." />

      <div className="card p-6 mb-6">
        <form onSubmit={send} className="flex gap-2">
          <input value={message} onChange={(e) => setMessage(e.target.value)} className="input flex-1" placeholder="e.g. New: Instagram Followers now Rs 8/1000!" />
          <button type="submit" disabled={sending} className="btn btn-primary shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Send
          </button>
        </form>
        <p className="text-xs mt-2" style={{ color: "var(--fg-dim)" }}>
          Only the most recent active announcement is shown to users, as a dismissible banner.
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Megaphone className="w-6 h-6 text-brand-400" />} title="No announcements yet" />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="p-4 flex items-center justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--fg)" }}>{a.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-dim)" }}>{formatDateTime(a.created_at)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => toggle(a)} className={`badge ${a.active ? "badge-active" : "badge-rejected"}`}>
                    {a.active ? "Active" : "Off"}
                  </button>
                  <button onClick={() => remove(a)} className="btn btn-ghost btn-sm"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
