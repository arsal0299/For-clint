import { supabase } from "./supabase";

/** Format a number as PKR currency. */
export function rs(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return "Rs " + n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function rsCompact(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return "Rs " + n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

/** Human-friendly date label. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** mm:ss countdown from a future expiry timestamp (ms). Returns null if expired. */
export function countdown(expireAt: string | null | undefined): string | null {
  if (!expireAt) return null;
  const diff = new Date(expireAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function classnames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Upload a payment screenshot to Supabase Storage and return its public URL. */
export async function uploadPaymentProof(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from("payments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/png",
  });
  if (error) throw new Error("Could not upload screenshot: " + error.message);
  const { data } = supabase.storage.from("payments").getPublicUrl(path);
  return data.publicUrl;
}
