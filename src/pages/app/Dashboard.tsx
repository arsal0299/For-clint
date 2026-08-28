import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  RefreshCw,
  Trash2,
  KeyRound,
  Loader2,
  CircleDollarSign,
  Clock,
  Info,
  Copy,
  Check,
  Radio,
  Globe2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { npApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { rs, countdown, classnames } from "../../lib/utils";
import type { NumberRequest } from "../../lib/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

interface ServiceOpt {
  code: string;
  name: string;
  price?: number;
}
interface CountryOpt {
  code: string;
  name: string;
  countryId?: number;
  price?: number;
}

// All servers are fulfilled through the mother site's API — this dashboard
// no longer talks to any upstream provider directly. "Server" here just
// selects which of the mother site's own servers (1-4) to buy from; the
// mother site is what decides what's actually available on each.
const SERVERS = [1, 2, 3, 4];

export function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const holdMinutes = Number(settings.number_hold_minutes || 20);

  const [server, setServer] = useState(1);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [service, setService] = useState("");
  const [country, setCountry] = useState<CountryOpt | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [requesting, setRequesting] = useState(false);

  const [numbers, setNumbers] = useState<NumberRequest[]>([]);
  const [tick, setTick] = useState(0); // forces countdown re-render

  const loadServices = useCallback(async (srv: number) => {
    setLoadingServices(true);
    try {
      const data = await npApi.services(srv);
      const list: ServiceOpt[] = (data.services || []).map((s: any) => ({
        code: s.code ?? s.name,
        name: s.name ?? s.code,
        price: s.price != null ? Number(s.price) : undefined,
      }));
      setServices(list);
    } catch {
      toast("Could not load services. Try again in a moment.", "error");
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [toast]);

  const loadCountries = useCallback(async (svc: string, srv: number) => {
    setLoadingCountries(true);
    try {
      const data = await npApi.countries(svc, srv);
      const list: CountryOpt[] = (data.countries || []).map((c: any) => ({
        code: c.code ?? c.name,
        name: c.name ?? c.code,
        countryId: c.countryId,
        price: c.price != null ? Number(c.price) : undefined,
      }));
      setCountries(list);
    } catch {
      toast("Could not load countries for that service.", "error");
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  }, [toast]);

  const loadNumbers = useCallback(async () => {
    const { data } = await supabase
      .from("number_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(20);
    setNumbers((data as NumberRequest[]) || []);
  }, []);

  useEffect(() => {
    loadServices(server);
    loadNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadNumbers]);

  const changeServer = (s: number) => {
    setServer(s);
    setService("");
    setCountry(null);
    setCountries([]);
    loadServices(s);
  };

  const onServiceChange = async (val: string) => {
    setService(val);
    setCountry(null);
    setCountries([]);
    if (!val) return;
    loadCountries(val, server);
  };

  // Live countdown ticker
  useEffect(() => {
    const hasPending = numbers.some((n) => n.status === "pending" && n.expires_at);
    if (!hasPending) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [numbers]);

  // Auto-poll OTP for pending numbers
  useEffect(() => {
    const pending = numbers.filter((n) => n.status === "pending");
    if (pending.length === 0) return;
    const i = setInterval(async () => {
      for (const p of pending) {
        if (p.expires_at && new Date(p.expires_at).getTime() <= Date.now()) continue;
        try {
          const res = await npApi.checkOtp(p.id);
          if (res.otp) {
            toast(`OTP received: ${res.otp}`, "success");
            loadNumbers();
            refreshProfile();
          }
        } catch {
          /* ignore polling errors */
        }
      }
    }, 10000);
    return () => clearInterval(i);
  }, [numbers, loadNumbers, refreshProfile, toast]);

  const price = country?.price ?? services.find((s) => s.code === service)?.price ?? Number(settings.price_per_number || 5);
  const totalPrice = price * quantity;

  const requestNumber = async () => {
    if (!service) return toast("Please choose a service.", "error");
    if (!country) return toast("Please choose a country.", "error");

    setRequesting(true);
    try {
      const res = await npApi.requestNumber({
        service,
        country: country.code,
        server,
        quantity,
        countryId: country.countryId,
      });
      const obtained = res.obtained ?? 1;
      if (obtained > 0) {
        toast(`${obtained} number${obtained > 1 ? "s" : ""} requested — held until OTP arrives.`, "success");
      }
      if (res.failures?.length) {
        toast(`Could not get ${res.failures.length} of ${quantity}: ${res.failures[0]}`, "info");
      }
      await Promise.all([loadNumbers(), refreshProfile()]);
      setService("");
      setCountry(null);
      setCountries([]);
      setQuantity(1);
    } catch (e: any) {
      toast(e.message || "Could not request a number.", "error");
    } finally {
      setRequesting(false);
    }
  };

  const checkOtp = async (id: number) => {
    try {
      const res = await npApi.checkOtp(id);
      if (res.otp) {
        toast(`OTP received: ${res.otp}`, "success");
        await Promise.all([loadNumbers(), refreshProfile()]);
      } else if (res.expired) {
        toast("No OTP arrived in time — your balance was refunded.", "info");
        await Promise.all([loadNumbers(), refreshProfile()]);
      } else {
        toast("No OTP yet — try again in a few seconds.", "info");
      }
    } catch (e: any) {
      toast(e.message || "Could not check OTP.", "error");
    }
  };

  const [confirmReleaseId, setConfirmReleaseId] = useState<number | null>(null);
  const release = (id: number) => setConfirmReleaseId(id);
  const doRelease = async () => {
    const id = confirmReleaseId;
    setConfirmReleaseId(null);
    if (!id) return;
    try {
      await npApi.releaseNumber(id);
      toast("Number released.", "success");
      await Promise.all([loadNumbers(), refreshProfile()]);
    } catch (e: any) {
      toast(e.message || "Could not release number.", "error");
    }
  };

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyNumber = (n: NumberRequest) => {
    navigator.clipboard.writeText(n.number);
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const available = (profile?.wallet_balance ?? 0) + (profile?.referral_balance ?? 0) - (profile?.wallet_hold ?? 0);
  const active = numbers.filter((n) => n.status === "active" || n.status === "pending");

  return (
    <div>
      <PageHeader
        title="Get a number"
        subtitle={
          <span>
            Balance <strong className="text-brand-400">{rs(profile?.wallet_balance)}</strong>
            {profile && profile.referral_balance > 0 && (
              <span style={{ color: "var(--fg-dim)" }}> (+{rs(profile.referral_balance)} referral)</span>
            )}
            {" · "}available <strong style={{ color: "var(--fg)" }}>{rs(available)}</strong>
            {profile && profile.wallet_hold > 0 && (
              <span style={{ color: "var(--fg-dim)" }}> ({rs(profile.wallet_hold)} held)</span>
            )}
          </span>
        }
      />

      {settings.country_status && (
        <div className="card p-4 mb-6 flex items-start gap-3" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)" }}>
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>{settings.country_status}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5 mb-9">
        {/* Request form */}
        <div className="card p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>Request a virtual number</h3>
          </div>

          <div className="mb-4">
            <label className="label">Select server</label>
            <div className="flex gap-2">
              {SERVERS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeServer(s)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{
                    background: server === s ? "var(--color-brand-400)" : "var(--panel)",
                    color: server === s ? "#04120c" : "var(--fg-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Server {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Service</label>
              <select className="input" value={service} onChange={(e) => onServiceChange(e.target.value)} disabled={loadingServices || requesting}>
                <option value="">{loadingServices ? "Loading…" : "Select a service"}</option>
                {services.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}{s.price != null ? ` — ${rs(s.price)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Country</label>
              <select
                className="input"
                value={country?.code ?? ""}
                onChange={(e) => setCountry(countries.find((c) => c.code === e.target.value) ?? null)}
                disabled={!service || loadingCountries || requesting}
              >
                <option value="">{!service ? "Select a service first" : loadingCountries ? "Loading…" : "Select a country"}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}{c.price != null ? ` — ${rs(c.price)}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Quantity</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono font-bold w-6 text-center" style={{ color: "var(--fg)" }}>{quantity}</span>
            </div>
          </div>

          <button onClick={requestNumber} disabled={requesting} className="btn btn-primary w-full mt-5">
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            {requesting ? "Requesting…" : `Request ${quantity > 1 ? `${quantity} numbers` : "number"} ${service ? `· ${rs(totalPrice)}` : ""}`}
          </button>

          {service && available < totalPrice && (
            <p className="text-xs mt-3 text-amber-400">
              Insufficient available balance for {quantity > 1 ? "these numbers" : "this service"} — top up your wallet first.
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CircleDollarSign className="w-5 h-5 text-brand-400" />
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>How it works</h3>
          </div>
          <ul className="space-y-3 text-sm" style={{ color: "var(--fg-muted)" }}>
            <li className="flex gap-3"><span className="text-brand-400 font-bold">1.</span> Pick a server, service &amp; country — or grab up to 5 at once.</li>
            <li className="flex gap-3"><span className="text-brand-400 font-bold">2.</span> Get a live number instantly — the price is <em>held</em>, not charged.</li>
            <li className="flex gap-3"><span className="text-brand-400 font-bold">3.</span> Send it for verification, then check for the OTP below.</li>
            <li className="flex gap-3"><span className="text-brand-400 font-bold">4.</span> Charged only once the OTP arrives — no OTP in {holdMinutes} min = full refund.</li>
          </ul>
        </div>
      </div>

      {/* Active numbers */}
      <h2 className="font-display font-bold text-xl mb-4" style={{ color: "var(--fg)" }}>Your numbers</h2>

      {active.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Smartphone className="w-6 h-6 text-brand-400" />}
            title="No active numbers yet"
            description="Choose a service and country above to request your first number."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {active.map((n, idx) => {
              const time = countdown(n.expires_at);
              const isWaiting = n.status === "pending";
              const isExpired = !isWaiting && !n.otp_code && n.status !== "active";
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="card p-5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--fg-dim)" }}>Number</p>
                    <span className={classnames("badge", n.status === "active" ? "badge-active" : isWaiting ? "badge-pending" : "badge-rejected")}>
                      {n.status === "active" ? "Active" : isWaiting ? "Waiting" : n.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-lg" style={{ color: "var(--fg)" }}>{n.number}</span>
                    <button onClick={() => copyNumber(n)} className="btn btn-ghost btn-sm">
                      {copiedId === n.id ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {isWaiting && (
                    <p className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "var(--color-brand-400)" }}>
                      <Radio className="w-3 h-3 animate-pulse" /> Listening live for OTP…
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "var(--fg-dim)" }}>Country / Operator</p>
                      <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--fg)" }}>
                        <Globe2 className="w-3.5 h-3.5 text-brand-400" /> {n.country}
                      </p>
                      <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{n.operator || "Mobile"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "var(--fg-dim)" }}>Activity</p>
                      {isWaiting && time ? (
                        <p className="flex items-center justify-end gap-1 text-sm font-mono" style={{ color: "var(--fg)" }}>
                          <Clock className="w-3.5 h-3.5" /> {time}
                        </p>
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{n.otp_code ? "Completed" : n.status}</p>
                      )}
                      <p className="text-[11px]" style={{ color: "var(--fg-dim)" }}>{n.service}</p>
                    </div>
                  </div>

                  {n.otp_code ? (
                    <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg" style={{ background: "rgba(52,211,153,0.1)" }}>
                      <KeyRound className="w-4 h-4 text-brand-400" />
                      <span className="font-mono font-bold text-brand-400 tracking-widest">{n.otp_code}</span>
                    </div>
                  ) : isExpired ? (
                    <p className="text-xs mb-3 text-red-400">Expired. No OTP received.</p>
                  ) : null}

                  <div className="flex gap-2">
                    {isWaiting && (
                      <button onClick={() => checkOtp(n.id)} className="btn btn-outline btn-sm flex-1">
                        <RefreshCw className="w-3.5 h-3.5" /> Check OTP
                      </button>
                    )}
                    <button onClick={() => release(n.id)} className="btn btn-danger btn-sm flex-1">
                      <Trash2 className="w-3.5 h-3.5" /> Release
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {/* hidden ref to use tick */}
      <span className="hidden">{tick}</span>
      <ConfirmDialog
        open={confirmReleaseId !== null}
        title="Release this number?"
        description="You'll stop receiving OTPs on it. Any unused held balance is refunded."
        confirmLabel="Release"
        onConfirm={doRelease}
        onCancel={() => setConfirmReleaseId(null)}
      />
    </div>
  );
}
