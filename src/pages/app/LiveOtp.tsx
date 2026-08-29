import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio, RefreshCw, Loader2, Copy, Check, Globe2 } from "lucide-react";
import { npApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface FeedRow {
  server: number;
  number: string;
  otp: string;
  service: string;
  country: string;
  time: string;
}

function timeAgo(iso: string) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function LiveOtp() {
  const { toast } = useToast();
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await npApi.liveOtp(50);
      setFeed(res.feed || []);
    } catch {
      // stay quiet on background refreshes — only surface the very first failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, [load]);

  const copy = (row: FeedRow, key: string) => {
    navigator.clipboard.writeText(row.otp);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div>
      <PageHeader
        title="Live OTP feed"
        subtitle={
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-brand-400 animate-pulse" /> Live activity across Server 1 &amp; 2 — refreshes automatically
          </span>
        }
      />

      <div className="flex justify-end mb-4">
        <button onClick={() => { setLoading(true); load(); }} className="btn btn-outline btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : feed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Radio className="w-6 h-6 text-brand-400" />}
            title="No live activity right now"
            description="This feed updates automatically as OTPs land — check back in a moment."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence initial={false}>
            {feed.map((row, idx) => {
              const key = `${row.server}-${row.number}-${row.otp}-${row.time}`;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="card p-4"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>
                      Server {row.server} · {row.service}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>{timeAgo(row.time)}</span>
                  </div>
                  <p className="font-mono text-sm mb-2 truncate" style={{ color: "var(--fg-muted)" }}>{row.number}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-muted)" }}>
                      <Globe2 className="w-3.5 h-3.5 text-brand-400" /> {row.country}
                    </span>
                    <button onClick={() => copy(row, key)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(52,211,153,0.1)" }}>
                      <span className="font-mono font-bold text-brand-400 tracking-widest text-sm">{row.otp}</span>
                      {copiedKey === key ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5 text-brand-400" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
