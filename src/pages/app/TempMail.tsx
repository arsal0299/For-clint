import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mailbox as MailboxIcon, Plus, Inbox as InboxIcon, RefreshCw, Loader2, MailOpen, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { npApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { Mailbox } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

interface Message {
  from?: string;
  subject?: string;
  received_at?: string;
  body?: string;
}

export function TempMail() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [releasingId, setReleasingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mailboxes")
      .select("*")
      .order("created_at", { ascending: false });
    setMailboxes((data as Mailbox[]) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await npApi.mailGenerate(username.trim() || undefined);
      if (res.mail?.address) {
        await supabase.from("mailboxes").insert({
          user_id: profile!.id,
          address: res.mail.address,
          token: res.mail.token ?? null,
        });
        toast(`Mailbox created: ${res.mail.address}`, "success");
        setUsername("");
        await load();
        view(res.mail.address);
      } else {
        toast(res.message || "Could not generate mailbox.", "error");
      }
    } catch (e: any) {
      toast(e.message || "Could not generate mailbox.", "error");
    } finally {
      setCreating(false);
    }
  };

  const [confirmReleaseMailbox, setConfirmReleaseMailbox] = useState<Mailbox | null>(null);

  const release = (m: Mailbox) => setConfirmReleaseMailbox(m);

  const doRelease = async () => {
    const m = confirmReleaseMailbox;
    setConfirmReleaseMailbox(null);
    if (!m) return;
    setReleasingId(m.id);
    try {
      const { error: e } = await supabase.from("mailboxes").delete().eq("id", m.id);
      if (e) throw e;
      toast("Mailbox released.", "success");
      if (selected === m.address) {
        setSelected(null);
        setMessages([]);
      }
      await load();
    } catch (e: any) {
      toast(e.message || "Could not release mailbox.", "error");
    } finally {
      setReleasingId(null);
    }
  };

  const view = async (address: string) => {
    setSelected(address);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await npApi.mailMessages(address);
      setMessages(res.messages || []);
    } catch {
      toast("Could not load inbox.", "error");
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div>
      <PageHeader title="Temporary mail" subtitle="Generate a disposable inbox for signups and verification." />

      <div className="grid lg:grid-cols-2 gap-5 mb-9">
        {/* Generate */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Plus className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Generate a mailbox</h3>
          </div>
          <form onSubmit={generate} className="space-y-4">
            <div>
              <label className="label">Preferred username (optional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="e.g. demo"
              />
            </div>
            <button type="submit" disabled={creating} className="btn btn-primary w-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailboxIcon className="w-4 h-4" />}
              Generate mailbox
            </button>
          </form>
        </div>

        {/* Mailbox list */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Your mailboxes</h3>
            <button onClick={load} className="btn btn-ghost btn-sm"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          {mailboxes.length === 0 ? (
            <EmptyState title="No mailboxes yet" description="Generate your first disposable inbox." />
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {mailboxes.map((m) => (
                <div
                  key={m.id}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-left transition gap-2"
                  style={{
                    background: selected === m.address ? "rgba(52,211,153,0.1)" : "var(--panel)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button onClick={() => view(m.address)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <span className="font-mono text-sm truncate" style={{ color: selected === m.address ? "var(--color-brand-400)" : "var(--fg)" }}>
                      {m.address}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--fg-dim)" }} />
                  </button>
                  <button
                    disabled={releasingId === m.id}
                    onClick={() => release(m)}
                    className="btn btn-ghost btn-sm shrink-0"
                    title="Release mailbox"
                  >
                    {releasingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inbox */}
      {selected && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl" style={{ color: "var(--fg)" }}>
              Inbox — <span className="font-mono text-brand-400">{selected}</span>
            </h2>
            <div className="flex gap-2">
              <button onClick={() => view(selected)} className="btn btn-ghost btn-sm">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                onClick={() => {
                  const m = mailboxes.find((mb) => mb.address === selected);
                  if (m) release(m);
                }}
                className="btn btn-ghost btn-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Release
              </button>
            </div>
          </div>
          <div className="card p-5">
            {loadingMessages ? (
              <div className="py-10 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
            ) : messages.length === 0 ? (
              <EmptyState icon={<InboxIcon className="w-6 h-6 text-brand-400" />} title="No messages yet" description="Send a test email to this address, then refresh." />
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl"
                    style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <MailOpen className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="font-semibold text-sm" style={{ color: "var(--fg)" }}>{msg.subject || "(no subject)"}</span>
                      </div>
                      <span className="text-xs whitespace-nowrap" style={{ color: "var(--fg-dim)" }}>{formatDateTime(msg.received_at)}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--fg-dim)" }}>From: {msg.from || "—"}</p>
                    {msg.body && <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: "var(--fg-muted)" }}>{msg.body}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmReleaseMailbox !== null}
        title="Release this mailbox?"
        description={confirmReleaseMailbox ? `${confirmReleaseMailbox.address} — this cannot be undone.` : undefined}
        confirmLabel="Release"
        onConfirm={doRelease}
        onCancel={() => setConfirmReleaseMailbox(null)}
      />
    </div>
  );
}
