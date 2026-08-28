import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Trash2, Upload, Ban, CheckCircle2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

interface Server3Row {
  id: number;
  number: string;
  service: string;
  country: string;
  price: number;
  status: "available" | "assigned" | "disabled";
  created_at: string;
}

// Thin wrapper around the standalone /api/server3-admin function —
// not part of the main adminApi object since it's a separate serverless
// function, but the same session-cookie auth applies automatically.
async function server3Admin(body: Record<string, unknown>) {
  const res = await fetch("/api/server3-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export function AdminServer3() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Server3Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [service, setService] = useState("");
  const [country, setCountry] = useState("");
  const [price, setPrice] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await server3Admin({ action: "list", status: statusFilter || undefined, pageSize: 200 });
      setRows(data.numbers || []);
    } catch (e: any) {
      toast(e.message || "Could not load numbers.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setNumbersText((prev) => (prev ? prev + "\n" + text : text));
    };
    reader.readAsText(file);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numbers = numbersText
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (!service.trim() || !country.trim()) return toast("Service and country are required.", "error");
    if (!price || isNaN(Number(price))) return toast("Enter a valid price.", "error");
    if (!numbers.length) return toast("Paste or upload at least one number.", "error");

    setAdding(true);
    try {
      const data = await server3Admin({
        action: "add",
        service: service.trim(),
        country: country.trim(),
        price: Number(price),
        numbers,
      });
      toast(`Added ${data.added} number(s)${data.skipped ? ` (${data.skipped} duplicate skipped)` : ""}.`, "success");
      setNumbersText("");
      load();
    } catch (e: any) {
      toast(e.message || "Could not add numbers.", "error");
    } finally {
      setAdding(false);
    }
  };

  const removeNumber = async (id: number) => {
    try {
      await server3Admin({ action: "delete", id });
      toast("Number removed.", "success");
      load();
    } catch (e: any) {
      toast(e.message || "Could not remove — it may currently be assigned to a user.", "error");
    }
  };

  const toggleDisabled = async (row: Server3Row) => {
    try {
      await server3Admin({ action: row.status === "disabled" ? "enable" : "disable", id: row.id });
      load();
    } catch (e: any) {
      toast(e.message || "Could not update status.", "error");
    }
  };

  return (
    <div>
      <PageHeader title="Server 3 — Number Pool" subtitle="Manually add and manage your own numbers. OTPs are matched against your numberpanel.tech live feed." />

      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: "1fr", maxWidth: 640 }}>
        <motion.form onSubmit={submitAdd} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--fg)" }}>
            <Plus className="w-4 h-4 text-brand-400" /> Add numbers
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>Service</label>
              <input className="input w-full" placeholder="e.g. whatsapp" value={service} onChange={(e) => setService(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>Country</label>
              <input className="input w-full" placeholder="e.g. Nigeria" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>Price per number</label>
          <input className="input w-full mb-3" type="number" step="0.01" placeholder="e.g. 15" value={price} onChange={(e) => setPrice(e.target.value)} />

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--fg-dim)" }}>
            Numbers — one per line ({numbersText.split(/\r?\n/).filter((l) => l.trim()).length} entered)
          </label>
          <textarea
            className="input w-full mb-2"
            rows={6}
            placeholder={"+2287312345\n+2287312346\n+2287312347"}
            value={numbersText}
            onChange={(e) => setNumbersText(e.target.value)}
          />

          <div className="flex items-center gap-2 mb-4">
            <input
              ref={fileRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Upload .txt
            </button>
            <span className="text-xs" style={{ color: "var(--fg-faint)" }}>appends to the box above, one number per line</span>
          </div>

          <button type="submit" disabled={adding} className="btn btn-primary btn-sm">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to pool"}
          </button>
        </motion.form>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--fg-dim)" }}>Filter:</span>
        {["", "available", "assigned", "disabled"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`badge ${statusFilter === s ? "badge-active" : "badge-pending"}`}
            style={{ cursor: "pointer" }}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Plus className="w-6 h-6 text-brand-400" />} title="No numbers in this filter" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Number</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Service</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Country</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Price</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3 font-mono" style={{ color: "var(--fg)" }}>{r.number}</td>
                    <td className="px-5 py-3" style={{ color: "var(--fg-muted)" }}>{r.service}</td>
                    <td className="px-5 py-3" style={{ color: "var(--fg-muted)" }}>{r.country}</td>
                    <td className="px-5 py-3 font-mono" style={{ color: "var(--fg)" }}>{r.price}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${r.status === "available" ? "badge-active" : r.status === "assigned" ? "badge-pending" : "badge-rejected"}`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleDisabled(r)} className="btn btn-ghost btn-sm" title={r.status === "disabled" ? "Re-enable" : "Disable"}>
                          {r.status === "disabled" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        {r.status === "available" && (
                          <button onClick={() => removeNumber(r.id)} className="btn btn-danger btn-sm" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
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
