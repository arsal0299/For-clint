import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Trash2, Pin, Pencil, X, Tag } from "lucide-react";
import { adminApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { rs } from "../../lib/utils";
import type { SmmService } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

const BLANK = {
  category: "",
  title: "",
  description: "",
  icon: "",
  price_per_1000: "",
  mother_service_id: "",
  min_qty: "",
  max_qty: "",
  avg_delivery: "",
  badge: "",
};

export function AdminSmmServices() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SmmService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.smmServices();
      setRows(r.services as SmmService[]);
    } catch {
      toast("Could not load services.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(BLANK);
    setShowForm(true);
  };

  const startEdit = (s: SmmService) => {
    setEditingId(s.id);
    setForm({
      category: s.category,
      title: s.title,
      description: s.description || "",
      icon: s.icon || "",
      price_per_1000: String(s.price_per_1000),
      mother_service_id: String(s.mother_service_id ?? ""),
      min_qty: String(s.min_qty),
      max_qty: String(s.max_qty),
      avg_delivery: s.avg_delivery || "",
      badge: s.badge || "",
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = {
      category: form.category.trim() || "General",
      title: form.title.trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      price_per_1000: Number(form.price_per_1000),
      mother_service_id: Number(form.mother_service_id),
      min_qty: Number(form.min_qty),
      max_qty: Number(form.max_qty),
      avg_delivery: form.avg_delivery.trim(),
      badge: form.badge.trim(),
    };
    if (!service.title) return toast("Title is required.", "error");
    if (!service.price_per_1000 || service.price_per_1000 <= 0) return toast("Enter a valid price.", "error");
    if (!service.min_qty || !service.max_qty || service.min_qty > service.max_qty) return toast("Enter a valid min/max quantity.", "error");
    if (!service.mother_service_id) return toast("Enter the matching Service ID from the mother site's SMM catalog.", "error");

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateSmmService(editingId, service);
        toast("Service updated.", "success");
      } else {
        await adminApi.createSmmService(service);
        toast("Service created.", "success");
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      toast(e.message || "Could not save service.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: SmmService) => {
    try {
      await adminApi.toggleSmmService(s.id);
      load();
    } catch (e: any) {
      toast(e.message || "Could not update.", "error");
    }
  };

  const pin = async (s: SmmService) => {
    try {
      await adminApi.pinSmmService(s.id);
      load();
    } catch (e: any) {
      toast(e.message || "Could not update.", "error");
    }
  };

  const remove = async (s: SmmService) => {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteSmmService(s.id);
      toast("Service deleted.", "success");
      load();
    } catch (e: any) {
      toast(e.message || "Could not delete.", "error");
    }
  };

  return (
    <div>
      <PageHeader title="Services" subtitle="Manage the SMM services catalog users can order." />

      <div className="flex justify-end mb-5">
        <button onClick={startCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add service
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg" style={{ color: "var(--fg)" }}>{editingId ? "Edit service" : "New service"}</h3>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. TikTok Likes" />
            </div>
            <div>
              <label className="label">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="e.g. TikTok" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="Short description" />
            </div>
            <div>
              <label className="label">Price per 1000 (Rs)</label>
              <input type="number" step="0.01" min="0" value={form.price_per_1000} onChange={(e) => setForm({ ...form, price_per_1000: e.target.value })} className="input" placeholder="10" />
            </div>
            <div>
              <label className="label">Icon (emoji, optional)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input" placeholder="❤️" />
            </div>
            <div>
              <label className="label">Mother site's Service ID</label>
              <input type="number" min="1" value={form.mother_service_id} onChange={(e) => setForm({ ...form, mother_service_id: e.target.value })} className="input" placeholder="From the mother site's SMM services list" />
            </div>
            <div>
              <label className="label">Min quantity</label>
              <input type="number" min="1" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} className="input" placeholder="100" />
            </div>
            <div>
              <label className="label">Max quantity</label>
              <input type="number" min="1" value={form.max_qty} onChange={(e) => setForm({ ...form, max_qty: e.target.value })} className="input" placeholder="10000" />
            </div>
            <div>
              <label className="label">Avg delivery (optional)</label>
              <input value={form.avg_delivery} onChange={(e) => setForm({ ...form, avg_delivery: e.target.value })} className="input" placeholder="1-3 hours" />
            </div>
            <div>
              <label className="label">Badge (optional)</label>
              <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="input" placeholder="New / Cheap / Popular" />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary sm:col-span-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editingId ? "Save changes" : "Create service"}
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Tag className="w-6 h-6 text-brand-400" />} title="No services yet" description="Add one above to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Title</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Category</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Price/1000</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Qty range</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg)" }}>
                      {s.icon} {s.title} {s.pinned && <Pin className="inline w-3 h-3 text-brand-400 ml-1" />}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{s.category}</td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: "var(--fg)" }}>{rs(s.price_per_1000)}</td>
                    <td className="px-5 py-3.5" style={{ color: "var(--fg-muted)" }}>{s.min_qty}–{s.max_qty}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggle(s)} className={`badge ${s.active ? "badge-active" : "badge-rejected"}`}>
                        {s.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <button onClick={() => pin(s)} className="btn btn-ghost btn-sm" title="Pin/unpin">
                          <Pin className={`w-3.5 h-3.5 ${s.pinned ? "text-brand-400" : ""}`} />
                        </button>
                        <button onClick={() => startEdit(s)} className="btn btn-ghost btn-sm"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(s)} className="btn btn-ghost btn-sm"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
