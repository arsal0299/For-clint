import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertTriangle, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { npApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { ApiKey } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

export function ApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await npApi.listKeys();
      setKeys(r.keys as ApiKey[]);
    } catch (e: any) {
      toast(e.message || "Could not load API keys.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await npApi.createKey(name.trim() || "My API Key");
      setNewKey(r.key as string);
      setName("");
      load();
    } catch (e: any) {
      toast(e.message || "Could not create API key.", "error");
    } finally {
      setCreating(false);
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast("Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    try {
      await npApi.revokeKey(revokeTarget.id);
      toast("API key revoked.", "success");
      setRevokeTarget(null);
      load();
    } catch (e: any) {
      toast(e.message || "Could not revoke key.", "error");
    }
  };

  return (
    <div>
      <PageHeader title="API keys" subtitle="Use Numera's API in your own apps — Numbers, Temp Mail, and Services." />

      <div className="card p-4 mb-6 flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-brand-400 shrink-0" />
        <div>
          <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>Public API — coming soon</p>
          <p className="text-xs" style={{ color: "var(--fg-dim)" }}>You can generate keys now; documented endpoints will follow.</p>
        </div>
      </div>

      {newKey && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 mb-6" style={{ border: "1px solid rgba(52,211,153,0.4)" }}>
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: "var(--fg)" }}>
              Copy this key now — for your security, it's shown only once and can't be retrieved again.
            </p>
          </div>
          <div className="flex gap-2">
            <input readOnly value={newKey} className="input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
            <button onClick={copyKey} className="btn btn-primary shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs mt-3" style={{ color: "var(--fg-dim)" }}>
            I've saved it — dismiss
          </button>
        </motion.div>
      )}

      <div className="card p-6 mb-6">
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: "var(--fg)" }}>Create a new key</h3>
        <form onSubmit={create} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" placeholder="e.g. My Bot, Production App" />
          <button type="submit" disabled={creating} className="btn btn-primary shrink-0">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate
          </button>
        </form>
        <p className="text-xs mt-2" style={{ color: "var(--fg-dim)" }}>Max 5 active keys. Requests are billed from your wallet, same as using the site.</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : keys.length === 0 ? (
          <EmptyState icon={<Key className="w-6 h-6 text-brand-400" />} title="No API keys yet" description="Create one above to start integrating." />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {keys.map((k, i) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 flex items-center justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>{k.name}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--fg-dim)" }}>{k.key_prefix}••••••••••••••••</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--fg-dim)" }}>
                    Created {formatDateTime(k.created_at)}
                    {k.last_used_at && ` · Last used ${formatDateTime(k.last_used_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${k.active ? "badge-active" : "badge-rejected"}`}>{k.active ? "Active" : "Revoked"}</span>
                  {k.active && (
                    <button onClick={() => setRevokeTarget(k)} className="btn btn-ghost btn-sm">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this API key?"
        description={revokeTarget ? `${revokeTarget.name} will stop working immediately. This cannot be undone.` : undefined}
        confirmLabel="Revoke"
        onConfirm={revoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
