/**
 * Client-side helpers for calling Netlify Functions under /api.
 * Each user-facing call attaches the current Supabase access token so the
 * function can verify identity server-side before touching the database
 * with the service-role key.
 */
import { supabase } from "./supabase";
import type { SmmService } from "./types";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "POST", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) Object.assign(headers, await authHeaders());

  // Browsers reject/strip a body on GET requests, so for GET we serialize
  // the payload into the query string instead of the request body.
  let url = `/api/${path}`;
  let fetchBody: string | undefined;
  if (method === "GET" || method === "HEAD") {
    if (body && typeof body === "object") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
  } else {
    fetchBody = body !== undefined ? JSON.stringify(body) : undefined;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    if (res.status === 401 || res.status === 403) {
      throw new ApiError(message, res.status);
    }
    throw new ApiError(message, res.status);
  }
  return data as T;
}

/* ── Number Panel (proxied server-side, all through one function) ── */
export const npApi = {
  services: (server?: number) => request("np", { body: { endpoint: "services", server } }),
  countries: (service: string, server?: number) =>
    request("np", { body: { endpoint: "countries", service, server } }),
  requestNumber: (params: { service: string; country?: string; server?: number; rid?: string; quantity?: number; countryId?: number; tierNumber?: number }) =>
    request("np", { body: { endpoint: "request-number", ...params } }),
  liveOtp: (limit?: number) => request("np", { body: { endpoint: "live-otp", limit } }),
  checkOtp: (requestId: number | string) =>
    request("np", { body: { endpoint: "check-otp", requestId } }),
  releaseNumber: (requestId: number | string) =>
    request("np", { body: { endpoint: "release-number", requestId } }),
  mailGenerate: (username?: string) =>
    request("np", { body: { endpoint: "mail-generate", username } }),
  mailMessages: (address: string) =>
    request("np", { body: { endpoint: "mail-messages", address } }),
  listKeys: () => request("np", { body: { endpoint: "list-keys" } }),
  createKey: (name: string) => request("np", { body: { endpoint: "create-key", name } }),
  revokeKey: (id: number) => request("np", { body: { endpoint: "revoke-key", id } }),
  submitPayment: (amount: number, screenshotUrl: string) =>
    request("np", { body: { endpoint: "submit-payment", amount, screenshotUrl } }),
  requestWithdrawal: (amount: number, method: string, accountDetails: string) =>
    request("np", { body: { endpoint: "request-withdrawal", amount, method, accountDetails } }),
  myWithdrawals: () => request("np", { body: { endpoint: "my-withdrawals" } }),
};

/* ── Referrals ─────────────────────────────────────────────────── */
export const referralApi = {
  stats: () => request("referral-stats", { method: "GET" }),
};

/* ── Public site settings ─────────────────────────────────────── */
export const settingsApi = {
  public: () => request("public-settings", { method: "GET", auth: false }),
};

/* ── Admin (all through one function) ────────────────────────────── */
export const adminApi = {
  stats: () => request("admin", { body: { endpoint: "stats" } }),
  providerBalance: () => request("admin", { body: { endpoint: "provider-balance" } }),
  users: (q?: string, page = 1, pageSize = 20) =>
    request("admin", { body: { endpoint: "users", q, page, pageSize } }),
  userDetail: (id: string) =>
    request("admin", { body: { endpoint: "user-detail", id } }),
  adjustCredit: (userId: string, amount: number, type: "credit" | "debit") =>
    request("admin", { body: { endpoint: "user-action", action: "adjust_credit", userId, amount, type } }),
  toggleStatus: (userId: string, newStatus: "active" | "blocked") =>
    request("admin", { body: { endpoint: "user-action", action: "toggle_status", userId, newStatus } }),
  payments: (status: string, page = 1, pageSize = 20) =>
    request("admin", { body: { endpoint: "payments", status, page, pageSize } }),
  reviewPayment: (id: number, decision: "approve" | "reject", reply?: string) =>
    request("admin", { body: { endpoint: "review-payment", id, decision, reply } }),
  saveSettings: (settings: Record<string, string>) =>
    request("admin", { body: { endpoint: "settings", action: "save_settings", settings } }),
  getSecureSettings: () =>
    request("admin", { body: { endpoint: "settings", action: "get_secure" } }),
  saveAiVerifySettings: (settings: Record<string, string>) =>
    request("admin", { body: { endpoint: "settings", action: "save_ai_verify", settings } }),
  savePaymentDetails: (details: Record<string, string>) =>
    request("admin", { body: { endpoint: "settings", action: "save_payment", details } }),
  saveBranding: (logoUrl: string) =>
    request("admin", { body: { endpoint: "settings", action: "save_branding", logoUrl } }),
  saveServicePrice: (service: string, price: number) =>
    request("admin", { body: { endpoint: "service-prices", action: "save", service, price } }),
  deleteServicePrice: (service: string) =>
    request("admin", { body: { endpoint: "service-prices", action: "delete", service } }),
  coupons: () =>
    request("admin", { body: { endpoint: "coupons", action: "list" } }),
  createCoupon: (code: string, creditAmount: number, maxUses: number) =>
    request("admin", { body: { endpoint: "coupons", action: "create", code, creditAmount, maxUses } }),
  toggleCoupon: (id: number, active: boolean) =>
    request("admin", { body: { endpoint: "coupons", action: "toggle", id, active } }),
  deleteCoupon: (id: number) =>
    request("admin", { body: { endpoint: "coupons", action: "delete", id } }),
  // SMM services (admin-managed catalog)
  smmServices: () =>
    request("admin", { body: { endpoint: "smm-services", action: "list" } }),
  createSmmService: (service: Partial<SmmService>) =>
    request("admin", { body: { endpoint: "smm-services", action: "create", service } }),
  updateSmmService: (id: number, service: Partial<SmmService>) =>
    request("admin", { body: { endpoint: "smm-services", action: "update", id, service } }),
  toggleSmmService: (id: number) =>
    request("admin", { body: { endpoint: "smm-services", action: "toggle", id } }),
  pinSmmService: (id: number) =>
    request("admin", { body: { endpoint: "smm-services", action: "pin", id } }),
  deleteSmmService: (id: number) =>
    request("admin", { body: { endpoint: "smm-services", action: "delete", id } }),
  // SMM orders (admin)
  smmOrders: (status: string, page = 1, pageSize = 20) =>
    request("admin", { body: { endpoint: "smm-orders", action: "list", status, page, pageSize } }),
  updateSmmOrderStatus: (id: number, status: string, adminNote?: string) =>
    request("admin", { body: { endpoint: "smm-orders", action: "update-status", id, status, adminNote } }),
  // Announcements (admin)
  announcements: () =>
    request("admin", { body: { endpoint: "announcements", action: "list" } }),
  createAnnouncement: (message: string) =>
    request("admin", { body: { endpoint: "announcements", action: "create", message } }),
  toggleAnnouncement: (id: number) =>
    request("admin", { body: { endpoint: "announcements", action: "toggle", id } }),
  deleteAnnouncement: (id: number) =>
    request("admin", { body: { endpoint: "announcements", action: "delete", id } }),
  auditLog: (page = 1, pageSize = 30) =>
    request("admin", { body: { endpoint: "audit-log", page, pageSize } }),
  withdrawals: () => request("admin", { body: { endpoint: "withdrawals", action: "list" } }),
  updateWithdrawalStatus: (id: number, status: "paid" | "rejected", adminNote?: string) =>
    request("admin", { body: { endpoint: "withdrawals", action: "update-status", id, status, adminNote } }),
};

/* ── SMM services (user-facing) ──────────────────────────────────── */
export const smmApi = {
  services: () => request("smm", { body: { endpoint: "services" } }),
  order: (serviceId: number, quantity: number, link: string) =>
    request("smm", { body: { endpoint: "order", serviceId, quantity, link } }),
  myOrders: () => request("smm", { body: { endpoint: "my-orders" } }),
  cancelOrder: (orderId: number) =>
    request("smm", { body: { endpoint: "cancel-order", orderId } }),
};

/* ── Coupons (user-facing redeem) ─────────────────────────────────── */
export const couponApi = {
  redeem: (code: string) => request("coupon", { body: { code } }),
};
