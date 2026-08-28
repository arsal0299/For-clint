import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Gift, Copy, Check, Loader2, Users, BadgeCheck, Wallet } from "lucide-react";
import { referralApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs, formatDate } from "../../lib/utils";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface ReferralRow {
  username: string;
  created_at: string;
  verified: boolean;
}

interface Stats {
  code: string;
  earnings: number;
  total: number;
  verified: number;
  milestonePaid: boolean;
  referrals: ReferralRow[];
}

export function Referrals() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await referralApi.stats();
        setStats(res);
      } catch (e: any) {
        toast(e.message || "Could not load referral stats.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const link = stats ? `${window.location.origin}/register?ref=${stats.code}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast("Referral link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Refer & earn" subtitle="Share your link. Earn Rs 40 when your referral verifies their first payment, plus 10% on every top-up after that." />

      {/* Referral link */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-brand-400" />
          <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Your referral link</h3>
        </div>
        <div className="flex gap-2">
          <input readOnly value={link} className="input flex-1 font-mono text-sm" onFocus={(e) => e.target.select()} />
          <button onClick={copyLink} className="btn btn-primary shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Milestone progress */}
      {stats && !stats.milestonePaid && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
              10 verified referrals → Rs 300 bonus
            </p>
            <span className="text-sm font-bold text-brand-400">{Math.min(stats.verified, 10)}/10</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min((stats.verified / 10) * 100, 100)}%`, background: "var(--color-brand-400)" }}
            />
          </div>
        </div>
      )}
      {stats?.milestonePaid && (
        <div className="card p-4 mb-6 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-brand-400" />
          <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>
            🎉 You've earned the Rs 300 milestone bonus for 10 verified referrals!
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-400" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>Total referred</p>
          </div>
          <p className="font-display font-bold text-2xl" style={{ color: "var(--fg)" }}>{stats?.total ?? 0}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-4 h-4 text-brand-400" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>Verified</p>
          </div>
          <p className="font-display font-bold text-2xl" style={{ color: "var(--fg)" }}>{stats?.verified ?? 0}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-brand-400" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>Total earned</p>
          </div>
          <p className="font-display font-bold text-2xl" style={{ color: "var(--fg)" }}>{rs(stats?.earnings)}</p>
        </div>
      </div>

      {/* List */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: "var(--fg)" }}>Your referrals</h3>
        {!stats || stats.referrals.length === 0 ? (
          <EmptyState icon={<Users className="w-6 h-6 text-brand-400" />} title="No referrals yet" description="Share your link above to start earning." />
        ) : (
          <div className="space-y-2">
            {stats.referrals.map((r, i) => (
              <motion.div
                key={r.username}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>@{r.username}</p>
                  <p className="text-xs" style={{ color: "var(--fg-dim)" }}>Joined {formatDate(r.created_at)}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: r.verified ? "rgba(52,211,153,0.15)" : "rgba(148,163,184,0.15)",
                    color: r.verified ? "var(--color-brand-400)" : "var(--fg-dim)",
                  }}
                >
                  {r.verified ? "Verified" : "Pending payment"}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
