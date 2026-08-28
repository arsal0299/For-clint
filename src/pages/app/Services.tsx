import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Loader2, X, Clock, Pin } from "lucide-react";
import { smmApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { rs } from "../../lib/utils";
import type { SmmService } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function Services() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<SmmService[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [active, setActive] = useState<SmmService | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await smmApi.services();
        setServices(res.services as SmmService[]);
      } catch (e: any) {
        toast(e.message || "Could not load services.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.category)))], [services]);
  const filtered = category === "All" ? services : services.filter((s) => s.category === category);

  return (
    <div>
      <PageHeader title="Services" subtitle="Boost your social presence — pay from your wallet balance." />

      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3.5 py-2 rounded-full text-sm font-medium transition"
              style={{
                background: category === c ? "var(--color-brand-400)" : "var(--panel)",
                color: category === c ? "#04120c" : "var(--fg-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-6 h-6 text-brand-400" />} title="No services available yet" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setActive(s)}
              className="card p-5 text-left relative"
            >
              {s.pinned && (
                <span className="absolute top-4 right-4" title="Pinned">
                  <Pin className="w-3.5 h-3.5 text-brand-400" />
                </span>
              )}
              {s.badge && (
                <span
                  className="inline-block mb-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(52,211,153,0.15)", color: "var(--color-brand-400)" }}
                >
                  {s.badge}
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                {s.icon && <span className="text-lg">{s.icon}</span>}
                <h3 className="font-display font-bold text-base" style={{ color: "var(--fg)" }}>{s.title}</h3>
              </div>
              {s.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--fg-muted)" }}>{s.description}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono font-bold text-brand-400">{rs(s.price_per_1000)} <span className="text-xs font-normal" style={{ color: "var(--fg-dim)" }}>/1000</span></span>
                {s.avg_delivery && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--fg-dim)" }}>
                    <Clock className="w-3 h-3" /> {s.avg_delivery}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <OrderModal
            service={active}
            walletBalance={profile?.wallet_balance ?? 0}
            onClose={() => setActive(null)}
            onOrdered={() => {
              setActive(null);
              refreshProfile();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderModal({
  service,
  walletBalance,
  onClose,
  onOrdered,
}: {
  service: SmmService;
  walletBalance: number;
  onClose: () => void;
  onOrdered: () => void;
}) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(service.min_qty);
  const [link, setLink] = useState("");
  const [placing, setPlacing] = useState(false);

  const price = Math.round((service.price_per_1000 / 1000) * quantity * 100) / 100;
  const insufficient = price > walletBalance;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < service.min_qty || quantity > service.max_qty) {
      return toast(`Quantity must be between ${service.min_qty} and ${service.max_qty}.`, "error");
    }
    if (!link.trim()) return toast("Please paste a link.", "error");
    if (insufficient) return toast("Insufficient wallet balance. Please top up.", "error");

    setPlacing(true);
    try {
      await smmApi.order(service.id, quantity, link.trim());
      toast("Order placed!", "success");
      onOrdered();
    } catch (e: any) {
      toast(e.message || "Could not place order.", "error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card w-full sm:max-w-md p-6 rounded-b-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>{service.title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Quantity (min {service.min_qty}, max {service.max_qty})</label>
            <input
              type="number"
              min={service.min_qty}
              max={service.max_qty}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Paste link here</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} className="input" placeholder="https://..." />
          </div>
          <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--fg-muted)" }}>Total price</span>
            <span className={`font-mono font-bold text-lg ${insufficient ? "text-red-400" : "text-brand-400"}`}>{rs(price)}</span>
          </div>
          {insufficient && (
            <p className="text-xs text-red-400">Insufficient wallet balance — please top up first.</p>
          )}
          <button type="submit" disabled={placing || insufficient} className="btn btn-primary w-full">
            {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place order"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
