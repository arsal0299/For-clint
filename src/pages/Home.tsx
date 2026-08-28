import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Mail,
  Smartphone,
  Clock,
  Wallet,
  CheckCircle2,
  Globe,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { PublicNavbar } from "../components/layout/PublicNavbar";
import { ScrollProgress } from "../components/ScrollProgress";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { rs } from "../lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export function Home() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  // ✅ यह लाइन बदली – अब 0 आने पर भी 20 शो होगा
  const price = Number(settings.price_per_number) || 20;

  // Update document title for SEO
  useEffect(() => {
    document.title = `${settings.site_name || "Numera"} — Premium Virtual Numbers, OTP & Temporary Mail`;
  }, [settings.site_name]);

  const ctaTarget = profile ? "/dashboard" : "/register";

  return (
    <>
      <ScrollProgress />
      <PublicNavbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-medium mb-7"
            style={{ color: "var(--fg-muted)" }}
          >
            <Sparkles className="w-4 h-4 text-brand-400" />
            Verification, handled
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display font-bold text-[2.6rem] sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
            style={{ color: "var(--fg)" }}
          >
            Instant numbers.
            <br />
            Real OTPs.{" "}
            <span className="text-gradient">Zero waiting.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            On-demand virtual phone numbers and disposable inboxes for verification —
            backed by a live provider network, delivered through one clean dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to={ctaTarget} className="btn btn-primary text-base px-6 py-3">
              Create your account <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="btn btn-outline text-base px-6 py-3">
              See how it works
            </a>
          </motion.div>

          {/* Stat ticker */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
          >
            {[
              { v: 1500, s: "+", label: "Numbers available" },
              { v: 20, s: "+", label: "Supported services" },
              { v: 99, s: "%", label: "Delivery uptime" },
            ].map((st) => (
              <div key={st.label} className="card p-4 sm:p-5">
                <div className="font-display font-bold text-2xl sm:text-4xl text-gradient">
                  <AnimatedCounter value={st.v} suffix={st.s} />
                </div>
                <div className="text-[11px] sm:text-sm mt-1" style={{ color: "var(--fg-dim)" }}>
                  {st.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex justify-center mt-16">
          <ChevronDown className="w-6 h-6 animate-bounce" style={{ color: "var(--fg-dim)" }} />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-3">Process</p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl" style={{ color: "var(--fg)" }}>
              Three steps to a verified account
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-5"
          >
            {[
              { n: "01", t: "Fund your wallet", d: "Top up your balance — our team credits it within minutes of your payment.", icon: Wallet },
              { n: "02", t: "Request a number", d: "Pick a service and country, and get a live, ready-to-use number instantly.", icon: Smartphone },
              { n: "03", t: "Receive your OTP", d: "Check the dashboard — codes typically land within seconds of being sent.", icon: Zap },
            ].map((s) => (
              <motion.div key={s.n} variants={reveal} className="card card-hover p-7 relative overflow-hidden">
                <span className="absolute -top-2 -right-2 font-display font-bold text-7xl opacity-[0.06]" style={{ color: "var(--fg)" }}>
                  {s.n}
                </span>
                <div className="w-12 h-12 rounded-xl grid place-items-center mb-5" style={{ background: "rgba(52,211,153,0.12)" }}>
                  <s.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h4 className="font-display font-bold text-xl mb-2" style={{ color: "var(--fg)" }}>{s.t}</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>{s.d}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features (bento) ─────────────────────────────────── */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-3">Platform</p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl" style={{ color: "var(--fg)" }}>
              Built for reliability
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            <motion.div
              variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="card card-hover p-7 md:col-span-2 md:row-span-2 relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#34d399,transparent 70%)" }} />
              <Globe className="w-8 h-8 text-brand-400 mb-4" />
              <h4 className="font-display font-bold text-2xl mb-2" style={{ color: "var(--fg)" }}>Live number pool</h4>
              <p className="leading-relaxed max-w-md" style={{ color: "var(--fg-muted)" }}>
                Numbers are pulled from an active provider network, refreshed continuously across
                countries and services. Whatever you need to verify, there's a number ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["WhatsApp", "Telegram", "Google", "Instagram", "TikTok", "+15 more"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-lg text-xs font-medium glass" style={{ color: "var(--fg-muted)" }}>{t}</span>
                ))}
              </div>
            </motion.div>

            {[
              { t: "Temporary mail", d: "Disposable inboxes on demand — read messages right in your dashboard.", icon: Mail },
              { t: "Auto-refund safety", d: "No OTP in time? Your hold is released automatically — you never pay for nothing.", icon: Clock },
              { t: "Secure by design", d: "Hashed passwords, hardened sessions, credentials never exposed client-side.", icon: Lock },
              { t: "Wallet & history", d: "Every request, credit and OTP is logged — a full ledger, always visible.", icon: ShieldCheck },
            ].map((f) => (
              <motion.div key={f.t} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} className="card card-hover p-6">
                <f.icon className="w-6 h-6 text-brand-400 mb-3" />
                <h4 className="font-display font-semibold text-lg mb-1.5" style={{ color: "var(--fg)" }}>{f.t}</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-3">Pricing</p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl" style={{ color: "var(--fg)" }}>
              Pay per number, nothing else
            </h2>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-5"
          >
            {[
              { t: "Per number", v: rs(price), sub: "Charged only when the OTP arrives" },
              { t: "Temporary mail", v: "Free", sub: "Unlimited disposable inboxes", hot: true },
              { t: "Setup fee", v: "Rs 0", sub: "No subscriptions, no hidden costs" },
            ].map((c) => (
              <motion.div
                key={c.t}
                variants={reveal}
                className={`card p-7 text-center relative ${c.hot ? "ring-1 ring-brand-400/40" : ""}`}
              >
                {c.hot && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-brand-500 text-[#04130d]">
                    POPULAR
                  </span>
                )}
                <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>{c.t}</h3>
                <div className="font-display font-bold text-4xl my-3 text-gradient">{c.v}</div>
                <p className="text-xs" style={{ color: "var(--fg-dim)" }}>{c.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-sm mt-6" style={{ color: "var(--fg-dim)" }}>
            Minimum top-up is <span className="text-brand-400 font-semibold">Rs {Number(settings.min_topup_amount || 50)}</span>.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="font-display font-bold text-3xl sm:text-5xl text-center mb-12" style={{ color: "var(--fg)" }}
          >
            Frequently asked
          </motion.h2>
          <div className="space-y-3">
            {[
              { q: "When am I actually charged?", a: "Only when an OTP arrives. Requesting a number just holds the price against your balance; if no OTP comes within the hold window, the full amount is refunded automatically." },
              { q: "How long do numbers stay active?", a: `Numbers wait for an OTP for ${Number(settings.number_hold_minutes || 20)} minutes. After that the number is released and your held balance is refunded in full.` },
              { q: "Which payment methods do you accept?", a: "You send payment to the account shown on the Top Up page and upload a screenshot. An admin credits your wallet once it's verified — usually within minutes." },
              { q: "Can I get a refund?", a: "Holds that never receive an OTP are refunded automatically. For other concerns, reach out via the Need Help button in your sidebar." },
            ].map((f) => (
              <details key={f.q} className="card p-5 group">
                <summary className="cursor-pointer font-semibold flex items-center justify-between list-none" style={{ color: "var(--fg)" }}>
                  {f.q}
                  <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" style={{ color: "var(--fg-muted)" }} />
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <motion.div
          variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="max-w-4xl mx-auto card p-10 sm:p-14 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 20%, #10b98155, transparent 60%), radial-gradient(circle at 70% 80%, #22d3ee55, transparent 60%)" }} />
          <div className="relative">
            <h2 className="font-display font-bold text-3xl sm:text-4xl" style={{ color: "var(--fg)" }}>
              Ready when you are.
            </h2>
            <p className="mt-3" style={{ color: "var(--fg-muted)" }}>
              Create your account and request your first number in under a minute.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--fg-muted)" }}>
              {["No setup fee", "Cancel anytime", "Pay only for OTPs"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> {t}</span>
              ))}
            </div>
            <Link to={ctaTarget} className="btn btn-primary text-base px-7 py-3 mt-8">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t py-10 px-5" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--fg-dim)" }}>
            © {new Date().getFullYear()} {settings.site_name || "Numera"}. All rights reserved.
            <span className="block sm:inline sm:ml-2">Created by Mr. Arslan</span>
          </p>
          <div className="flex items-center gap-5 text-sm" style={{ color: "var(--fg-muted)" }}>
            <a href="/#how-it-works" className="hover:text-brand-400 transition">How it works</a>
            <a href="/#features" className="hover:text-brand-400 transition">Features</a>
            <a href="/#pricing" className="hover:text-brand-400 transition">Pricing</a>
            <Link to="/login" className="hover:text-brand-400 transition">Log in</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
