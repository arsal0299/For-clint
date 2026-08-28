import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Settings as SettingsIcon, Image, CreditCard, Tag, KeyRound, Save, Loader2, Trash2, Plus, Wrench, Sparkles, Banknote } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs } from "../../lib/utils";
import type { ServicePrice } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function AdminSettings() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"site" | "branding" | "payment" | "pricing" | "maintenance" | "ai-verify" | "withdrawal" | "password">("site");

  const [site, setSite] = useState({
    site_name: "", mother_api_key: "", mother_api_base_url: "https://mother-site.example.com", price_per_number: "5.00",
    number_hold_minutes: "20", country_status: "", contact_email: "", min_topup_amount: "50",
  });
  const [payment, setPayment] = useState({
    payment_method_name: "Bank Transfer", payment_bank_name: "", payment_account_title: "",
    payment_account_number: "", payment_instructions: "",
  });
  const [maintenance, setMaintenance] = useState({
    maintenance_enabled: "false", maintenance_title: "We'll be back soon",
    maintenance_message: "The site is undergoing scheduled maintenance. Please check back shortly.",
    maintenance_start: "", maintenance_end: "",
  });
  const [aiVerify, setAiVerify] = useState({
    ai_verify_enabled: "false",
    ai_verify_model: "google/gemma-4-31b-it:free",
    ai_verify_instructions: "The screenshot must clearly show a successful payment for the exact claimed amount, sent to our account.",
    ai_verify_mode: "reject_only",
    openrouter_api_keys: "",
  });
  const [withdrawal, setWithdrawal] = useState({
    withdrawal_enabled: "false",
    withdrawal_min_amount: "200",
    withdrawal_min_verified_referrals: "5",
    referral_first_bonus: "40",
    referral_commission_pct: "10",
    referral_milestone_count: "10",
    referral_milestone_bonus: "300",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [currentLogo, setCurrentLogo] = useState("");
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [newPrice, setNewPrice] = useState({ service: "", price: "" });
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [saving, setSaving] = useState("");

  const loadAll = async () => {
    const { data } = await supabase.from("settings").select("*");
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => (map[r.key] = r.value));
    setSite((s) => ({
      ...s,
      site_name: map.site_name ?? s.site_name,
      mother_api_key: map.mother_api_key ?? "",
      mother_api_base_url: map.mother_api_base_url ?? s.mother_api_base_url,
      price_per_number: map.price_per_number ?? s.price_per_number,
      number_hold_minutes: map.number_hold_minutes ?? s.number_hold_minutes,
      country_status: map.country_status ?? "",
      contact_email: map.contact_email ?? "",
      min_topup_amount: map.min_topup_amount ?? s.min_topup_amount,
    }));
    setPayment((p) => ({
      ...p,
      payment_method_name: map.payment_method_name ?? p.payment_method_name,
      payment_bank_name: map.payment_bank_name ?? "",
      payment_account_title: map.payment_account_title ?? "",
      payment_account_number: map.payment_account_number ?? "",
      payment_instructions: map.payment_instructions ?? "",
    }));
    setLogoUrl(map.site_logo_url ?? "");
    setCurrentLogo(map.site_logo_url ?? "");
    setMaintenance((m) => ({
      ...m,
      maintenance_enabled: map.maintenance_enabled ?? "false",
      maintenance_title: map.maintenance_title ?? m.maintenance_title,
      maintenance_message: map.maintenance_message ?? m.maintenance_message,
      maintenance_start: map.maintenance_start ?? "",
      maintenance_end: map.maintenance_end ?? "",
    }));

    const { data: sp } = await supabase.from("service_prices").select("*").order("service");
    setPrices((sp as ServicePrice[]) || []);

    // Secret fields (OpenRouter keys, numberpanel key, etc.) never come
    // through the direct client read above — fetched via a secure
    // admin-only backend call instead.
    try {
      const secure = await adminApi.getSecureSettings();
      const s = secure.settings || {};
      setAiVerify((a) => ({
        ...a,
        ai_verify_enabled: s.ai_verify_enabled ?? a.ai_verify_enabled,
        ai_verify_model: s.ai_verify_model ?? a.ai_verify_model,
        ai_verify_instructions: s.ai_verify_instructions ?? a.ai_verify_instructions,
        ai_verify_mode: s.ai_verify_mode ?? a.ai_verify_mode,
        openrouter_api_keys: s.openrouter_api_keys ?? "",
      }));
      setWithdrawal((w) => ({
        ...w,
        withdrawal_enabled: s.withdrawal_enabled ?? w.withdrawal_enabled,
        withdrawal_min_amount: s.withdrawal_min_amount ?? w.withdrawal_min_amount,
        withdrawal_min_verified_referrals: s.withdrawal_min_verified_referrals ?? w.withdrawal_min_verified_referrals,
        referral_first_bonus: s.referral_first_bonus ?? w.referral_first_bonus,
        referral_commission_pct: s.referral_commission_pct ?? w.referral_commission_pct,
        referral_milestone_count: s.referral_milestone_count ?? w.referral_milestone_count,
        referral_milestone_bonus: s.referral_milestone_bonus ?? w.referral_milestone_bonus,
      }));
    } catch {
      /* non-fatal — AI verify tab will just show defaults */
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveSite = async () => {
    setSaving("site");
    try {
      await adminApi.saveSettings(site);
      toast("Settings saved.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const savePayment = async () => {
    setSaving("payment");
    try {
      await adminApi.savePaymentDetails(payment);
      toast("Payment details saved.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const saveMaintenance = async () => {
    setSaving("maintenance");
    try {
      await adminApi.saveSettings(maintenance);
      toast(maintenance.maintenance_enabled === "true" ? "Maintenance mode is now ON." : "Maintenance mode is now OFF.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const saveAiVerify = async () => {
    setSaving("ai-verify");
    try {
      await adminApi.saveAiVerifySettings(aiVerify);
      toast(aiVerify.ai_verify_enabled === "true" ? "AI payment verification is now ON." : "AI payment verification is now OFF.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const saveWithdrawal = async () => {
    setSaving("withdrawal");
    try {
      await adminApi.saveSettings(withdrawal);
      toast(withdrawal.withdrawal_enabled === "true" ? "Withdrawals are now ON." : "Withdrawals are now OFF.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const saveBranding = async () => {
    setSaving("branding");
    try {
      await adminApi.saveBranding(logoUrl);
      setCurrentLogo(logoUrl);
      toast("Branding saved.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const addPrice = async () => {
    if (!newPrice.service || !newPrice.price) return;
    setSaving("pricing");
    try {
      await adminApi.saveServicePrice(newPrice.service, Number(newPrice.price));
      setNewPrice({ service: "", price: "" });
      await loadAll();
      toast("Price saved.", "success");
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };
  const delPrice = async (service: string) => {
    if (!confirm(`Delete price for ${service}?`)) return;
    try {
      await adminApi.deleteServicePrice(service);
      await loadAll();
      toast("Price removed.", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };
  const changePwd = async () => {
    setSaving("password");
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw error;
      toast("Password changed.", "success");
      setPwd({ current: "", next: "" });
    } catch (e: any) { toast(e.message, "error"); } finally { setSaving(""); }
  };

  const TABS = [
    { id: "site", label: "Site & API", icon: SettingsIcon },
    { id: "branding", label: "Branding", icon: Image },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "pricing", label: "Pricing", icon: Tag },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "ai-verify", label: "AI Verification", icon: Sparkles },
    { id: "withdrawal", label: "Referral & Withdrawal", icon: Banknote },
    { id: "password", label: "Password", icon: KeyRound },
  ] as const;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your platform, branding, payments and pricing." />

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`btn btn-sm whitespace-nowrap ${tab === t.id ? "btn-primary" : "btn-ghost"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        {tab === "site" && (
          <div className="card p-6 space-y-4">
            <Field label="Site name"><input className="input" value={site.site_name} onChange={(e) => setSite({ ...site, site_name: e.target.value })} /></Field>
            <Field label="Mother API key (reseller key from your mother site's API Keys page)"><input className="input font-mono" value={site.mother_api_key} onChange={(e) => setSite({ ...site, mother_api_key: e.target.value })} placeholder="nma_live_... — stored server-side only" /></Field>
            <Field label="Mother API base URL"><input className="input" value={site.mother_api_base_url} onChange={(e) => setSite({ ...site, mother_api_base_url: e.target.value })} placeholder="https://your-mother-site.com" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default price / number (Rs)"><input type="number" step="0.01" className="input" value={site.price_per_number} onChange={(e) => setSite({ ...site, price_per_number: e.target.value })} /></Field>
              <Field label="Hold time (minutes)"><input type="number" min="1" className="input" value={site.number_hold_minutes} onChange={(e) => setSite({ ...site, number_hold_minutes: e.target.value })} /></Field>
            </div>
            <Field label="Minimum top-up (Rs)"><input type="number" min="0" className="input" value={site.min_topup_amount} onChange={(e) => setSite({ ...site, min_topup_amount: e.target.value })} /></Field>
            <Field label="Country / service status banner"><input className="input" value={site.country_status} onChange={(e) => setSite({ ...site, country_status: e.target.value })} placeholder="Shown to users on the dashboard" /></Field>
            <Field label="Support contact email"><input type="email" className="input" value={site.contact_email} onChange={(e) => setSite({ ...site, contact_email: e.target.value })} /></Field>
            <button onClick={saveSite} disabled={saving === "site"} className="btn btn-primary"><Save className="w-4 h-4" /> {saving === "site" ? "Saving…" : "Save settings"}</button>
          </div>
        )}

        {tab === "branding" && (
          <div className="card p-6 space-y-4">
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Paste a logo URL. Wherever the site name appears, this logo shows instead.</p>
            {currentLogo && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--panel)" }}>
                <img src={currentLogo} alt="Logo" className="h-8 w-auto" />
                <span className="text-xs" style={{ color: "var(--fg-dim)" }}>Current logo</span>
              </div>
            )}
            <Field label="Logo URL"><input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" /></Field>
            <button onClick={saveBranding} disabled={saving === "branding"} className="btn btn-primary"><Save className="w-4 h-4" /> {saving === "branding" ? "Saving…" : "Save branding"}</button>
          </div>
        )}

        {tab === "payment" && (
          <div className="card p-6 space-y-4">
            <Field label="Method name"><input className="input" value={payment.payment_method_name} onChange={(e) => setPayment({ ...payment, payment_method_name: e.target.value })} placeholder="JazzCash / Easypaisa / Bank Transfer" /></Field>
            <Field label="Bank / provider name"><input className="input" value={payment.payment_bank_name} onChange={(e) => setPayment({ ...payment, payment_bank_name: e.target.value })} /></Field>
            <Field label="Account title"><input className="input" value={payment.payment_account_title} onChange={(e) => setPayment({ ...payment, payment_account_title: e.target.value })} /></Field>
            <Field label="Account number"><input className="input font-mono" value={payment.payment_account_number} onChange={(e) => setPayment({ ...payment, payment_account_number: e.target.value })} /></Field>
            <Field label="Instructions"><input className="input" value={payment.payment_instructions} onChange={(e) => setPayment({ ...payment, payment_instructions: e.target.value })} /></Field>
            <button onClick={savePayment} disabled={saving === "payment"} className="btn btn-primary"><Save className="w-4 h-4" /> {saving === "payment" ? "Saving…" : "Save payment details"}</button>
          </div>
        )}

        {tab === "pricing" && (
          <div className="card p-6 space-y-5">
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Override the default price for a specific service.</p>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[140px]"><Field label="Service"><input className="input" value={newPrice.service} onChange={(e) => setNewPrice({ ...newPrice, service: e.target.value })} placeholder="e.g. WhatsApp" /></Field></div>
              <div className="w-28"><Field label="Price (Rs)"><input type="number" step="0.01" className="input" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} /></Field></div>
              <button onClick={addPrice} disabled={saving === "pricing"} className="btn btn-primary"><Plus className="w-4 h-4" /> Add</button>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {prices.map((p) => (
                <div key={p.service} className="flex items-center justify-between py-2.5">
                  <span className="font-medium" style={{ color: "var(--fg)" }}>{p.service}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-brand-400">{rs(p.price)}</span>
                    <button onClick={() => delPrice(p.service)} className="opacity-60 hover:opacity-100"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
              {prices.length === 0 && <p className="text-sm py-2" style={{ color: "var(--fg-dim)" }}>No custom prices — using default for all services.</p>}
            </div>
          </div>
        )}

        {tab === "maintenance" && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>Maintenance mode</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-dim)" }}>When ON, all non-admin visitors see the maintenance page instead of the site.</p>
              </div>
              <button
                onClick={() => setMaintenance({ ...maintenance, maintenance_enabled: maintenance.maintenance_enabled === "true" ? "false" : "true" })}
                className="shrink-0 w-12 h-7 rounded-full relative transition"
                style={{ background: maintenance.maintenance_enabled === "true" ? "var(--color-brand-400)" : "var(--border)" }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: maintenance.maintenance_enabled === "true" ? "26px" : "4px" }}
                />
              </button>
            </div>
            <Field label="Title"><input className="input" value={maintenance.maintenance_title} onChange={(e) => setMaintenance({ ...maintenance, maintenance_title: e.target.value })} /></Field>
            <Field label="Message"><input className="input" value={maintenance.maintenance_message} onChange={(e) => setMaintenance({ ...maintenance, maintenance_message: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Start (optional)"><input type="datetime-local" className="input" value={maintenance.maintenance_start} onChange={(e) => setMaintenance({ ...maintenance, maintenance_start: e.target.value })} /></Field>
              <Field label="End (optional — shows a countdown)"><input type="datetime-local" className="input" value={maintenance.maintenance_end} onChange={(e) => setMaintenance({ ...maintenance, maintenance_end: e.target.value })} /></Field>
            </div>
            <p className="text-xs" style={{ color: "var(--fg-dim)" }}>
              Leave start/end blank to just use the ON/OFF toggle manually. Admins always bypass this and see the real site.
            </p>
            <button onClick={saveMaintenance} disabled={saving === "maintenance"} className="btn btn-primary">
              {saving === "maintenance" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />} Save maintenance settings
            </button>
          </div>
        )}

        {tab === "ai-verify" && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>Auto-verify payments with AI</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-dim)" }}>
                  Analyzes each payment screenshot against your criteria and can auto-approve or auto-reject.
                </p>
              </div>
              <button
                onClick={() => setAiVerify({ ...aiVerify, ai_verify_enabled: aiVerify.ai_verify_enabled === "true" ? "false" : "true" })}
                className="shrink-0 w-12 h-7 rounded-full relative transition"
                style={{ background: aiVerify.ai_verify_enabled === "true" ? "var(--color-brand-400)" : "var(--border)" }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: aiVerify.ai_verify_enabled === "true" ? "26px" : "4px" }}
                />
              </button>
            </div>

            <Field label="OpenRouter API keys (one per line, up to 5 — rotates through them for free-tier rate limits)">
              <textarea
                rows={5}
                className="input font-mono text-xs"
                placeholder={"sk-or-v1-...\nsk-or-v1-...\nsk-or-v1-..."}
                value={aiVerify.openrouter_api_keys}
                onChange={(e) => setAiVerify({ ...aiVerify, openrouter_api_keys: e.target.value })}
              />
            </Field>

            <Field label="Model">
              <input className="input font-mono" value={aiVerify.ai_verify_model} onChange={(e) => setAiVerify({ ...aiVerify, ai_verify_model: e.target.value })} />
            </Field>

            <Field label="Verification criteria (tell the AI what a valid payment looks like)">
              <textarea
                rows={4}
                className="input"
                placeholder="e.g. Must show our account title 'Arslan Traders', bank 'Meezan Bank', account ending 4521, and the exact amount claimed."
                value={aiVerify.ai_verify_instructions}
                onChange={(e) => setAiVerify({ ...aiVerify, ai_verify_instructions: e.target.value })}
              />
            </Field>

            <Field label="Mode">
              <select className="input" value={aiVerify.ai_verify_mode} onChange={(e) => setAiVerify({ ...aiVerify, ai_verify_mode: e.target.value })}>
                <option value="reject_only">Safer — auto-reject only (clear approvals still wait for you)</option>
                <option value="auto">Full auto — auto-approve AND auto-reject</option>
              </select>
              <p className="text-xs mt-1.5" style={{ color: "var(--fg-dim)" }}>
                "Safer" only acts on the AI's rejections, catching obvious fakes automatically while every real approval still gets a human look.
                "Full auto" also credits wallets on an AI approval with no human step — faster, but a wrong call means real money moves automatically. Free vision models can misread images, so review your first batch of decisions either way.
              </p>
            </Field>

            <button onClick={saveAiVerify} disabled={saving === "ai-verify"} className="btn btn-primary">
              {saving === "ai-verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Save AI verification settings
            </button>
          </div>
        )}

        {tab === "withdrawal" && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>Withdrawals</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-dim)" }}>When OFF, users can't submit new withdrawal requests.</p>
              </div>
              <button
                onClick={() => setWithdrawal({ ...withdrawal, withdrawal_enabled: withdrawal.withdrawal_enabled === "true" ? "false" : "true" })}
                className="shrink-0 w-12 h-7 rounded-full relative transition"
                style={{ background: withdrawal.withdrawal_enabled === "true" ? "var(--color-brand-400)" : "var(--border)" }}
              >
                <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{ left: withdrawal.withdrawal_enabled === "true" ? "26px" : "4px" }} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Minimum withdrawal (Rs)">
                <input type="number" min="1" className="input" value={withdrawal.withdrawal_min_amount} onChange={(e) => setWithdrawal({ ...withdrawal, withdrawal_min_amount: e.target.value })} />
              </Field>
              <Field label="Min. verified referrals required">
                <input type="number" min="0" className="input" value={withdrawal.withdrawal_min_verified_referrals} onChange={(e) => setWithdrawal({ ...withdrawal, withdrawal_min_verified_referrals: e.target.value })} />
              </Field>
            </div>

            <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>Referral payout amounts</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First verified payment bonus (Rs)">
                  <input type="number" min="0" className="input" value={withdrawal.referral_first_bonus} onChange={(e) => setWithdrawal({ ...withdrawal, referral_first_bonus: e.target.value })} />
                </Field>
                <Field label="Ongoing commission (%)">
                  <input type="number" min="0" max="100" className="input" value={withdrawal.referral_commission_pct} onChange={(e) => setWithdrawal({ ...withdrawal, referral_commission_pct: e.target.value })} />
                </Field>
                <Field label="Milestone: verified referrals needed">
                  <input type="number" min="1" className="input" value={withdrawal.referral_milestone_count} onChange={(e) => setWithdrawal({ ...withdrawal, referral_milestone_count: e.target.value })} />
                </Field>
                <Field label="Milestone bonus (Rs)">
                  <input type="number" min="0" className="input" value={withdrawal.referral_milestone_bonus} onChange={(e) => setWithdrawal({ ...withdrawal, referral_milestone_bonus: e.target.value })} />
                </Field>
              </div>
            </div>

            <button onClick={saveWithdrawal} disabled={saving === "withdrawal"} className="btn btn-primary">
              {saving === "withdrawal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save referral &amp; withdrawal settings
            </button>
          </div>
        )}

        {tab === "password" && (
          <div className="card p-6 space-y-4">
            <Field label="New password"><input type="password" minLength={8} className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="At least 8 characters" /></Field>
            <button onClick={changePwd} disabled={saving === "password" || pwd.next.length < 8} className="btn btn-primary">
              {saving === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Change password
            </button>
            <p className="text-xs" style={{ color: "var(--fg-dim)" }}>This changes your own login password. Authenticated through Supabase Auth.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
