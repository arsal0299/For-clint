import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Wallet, Upload, Copy, Check, Building2, Receipt, Loader2, Tag } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { rs, uploadPaymentProof, formatDate } from "../../lib/utils";
import { couponApi, npApi } from "../../lib/api";
import type { PaymentRequest } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function TopUp() {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();

  const minTopup = Number(settings.min_topup_amount || 50);
  const [amount, setAmount] = useState<number>(minTopup);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setPayments((data as PaymentRequest[]) || []);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return toast("Enter a valid amount.", "error");
    if (amount < minTopup) return toast(`Minimum top-up is Rs ${minTopup}.`, "error");
    if (!file) return toast("Please upload your payment screenshot.", "error");

    setSubmitting(true);
    try {
      const url = await uploadPaymentProof(file);
      const res = await npApi.submitPayment(amount, url);
      if (res.status === "approved") {
        toast(`Payment auto-approved — Rs ${amount} added to your wallet!`, "success");
      } else if (res.status === "rejected") {
        toast(res.aiReason || "This payment could not be verified.", "error");
      } else {
        toast("Payment submitted — your wallet will be credited once approved.", "success");
      }
      setFile(null);
      setAmount(minTopup);
      (document.getElementById("screenshot") as HTMLInputElement).value = "";
      loadPayments();
      refreshProfile();
    } catch (e: any) {
      toast(e.message || "Could not submit payment.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const redeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim();
    if (!clean) return toast("Enter a coupon code.", "error");
    setRedeeming(true);
    try {
      const res = await couponApi.redeem(clean);
      toast(`Coupon redeemed — Rs ${res.creditAmount} added to your wallet!`, "success");
      setCouponCode("");
      refreshProfile();
    } catch (e: any) {
      toast(e.message || "Could not redeem this coupon.", "error");
    } finally {
      setRedeeming(false);
    }
  };

  const detail = [
    { label: "Method", value: settings.payment_method_name, show: !!settings.payment_method_name },
    { label: "Bank / provider", value: settings.payment_bank_name, show: !!settings.payment_bank_name },
    { label: "Account title", value: settings.payment_account_title, show: !!settings.payment_account_title },
    { label: "Account number", value: settings.payment_account_number, show: !!settings.payment_account_number, copy: true },
  ];

  return (
    <div>
      <PageHeader
        title="Add funds"
        subtitle="Send payment to the account below, then upload your screenshot as proof."
      />

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Coupon redeem */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Have a coupon code?</h3>
          </div>
          <form onSubmit={redeemCoupon} className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="input flex-1 font-mono uppercase"
              placeholder="e.g. WELCOME50"
            />
            <button type="submit" disabled={redeeming} className="btn btn-primary shrink-0">
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Redeem
            </button>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-9">
        {/* Payment details */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Payment details</h3>
          </div>
          {settings.payment_account_number ? (
            <div className="space-y-3">
              {detail.filter((d) => d.show).map((d) => (
                <div key={d.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--fg-muted)" }}>{d.label}</span>
                  <span className="flex items-center gap-2 font-mono text-sm font-semibold" style={{ color: "var(--fg)" }}>
                    {d.value}
                    {d.copy && (
                      <button onClick={() => copy(d.value!)} className="opacity-60 hover:opacity-100 transition" aria-label="Copy">
                        {copied ? <Check className="w-4 h-4 text-brand-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {settings.payment_instructions && (
                <p className="text-sm pt-2" style={{ color: "var(--fg-muted)" }}>{settings.payment_instructions}</p>
              )}
            </div>
          ) : (
            <EmptyState icon={<Wallet className="w-6 h-6 text-brand-400" />} title="Not configured yet" description="Payment details haven't been set up — please contact support." />
          )}
        </div>

        {/* Submit proof */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Submit payment proof</h3>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Amount sent (Rs) — minimum Rs {minTopup}</label>
              <input
                type="number"
                step="0.01"
                min={minTopup}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Payment screenshot</label>
              <input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="input file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:cursor-pointer file:bg-brand-500/15 file:text-brand-400 file:font-semibold"
                required
              />
              {file && <p className="text-xs mt-2" style={{ color: "var(--fg-dim)" }}>{file.name}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Submit for review
            </button>
          </form>
        </div>
      </div>

      <h2 className="font-display font-bold text-xl mb-4" style={{ color: "var(--fg)" }}>Your payment history</h2>
      <div className="card overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState title="No payment requests yet" description="Your submitted top-ups will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Amount</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Note</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: "var(--fg)" }}>{rs(p.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge badge-${p.status === "approved" ? "active" : p.status === "rejected" ? "rejected" : "pending"}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[260px]" style={{ color: "var(--fg-muted)" }}>{p.admin_reply || "—"}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{formatDate(p.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
