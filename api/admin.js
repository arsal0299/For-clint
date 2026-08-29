import { adminClient, json, error, body, requireAdmin, logAdminAction, getAllSettings, Mother, withVercel } from "./_lib/shared.js";

/**
 * All admin operations in one file (Vercel Hobby plan caps a deployment at
 * 12 Serverless Functions, and each file in /api counts as one — this file
 * replaces the 8 separate admin-*.js files).
 *
 * POST /api/admin  { endpoint: "...", ...params }
 * endpoint: "users" | "user-detail" | "user-action" | "payments" |
 *           "review-payment" | "service-prices" | "settings" | "stats" |
 *           "audit-log" | "provider-balance"
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({});
  const { profile, response } = await requireAdmin(event);
  if (response) return response;

  const params = body(event);
  const c = adminClient();

  try {
    switch (params.endpoint) {
      case "provider-balance":
        return await providerBalance(c);
      case "users":
        return await getUsers(c, params);
      case "user-detail":
        return await getUserDetail(c, params);
      case "user-action":
        return await userAction(c, profile, params);
      case "payments":
        return await getPayments(c, params);
      case "review-payment":
        return await reviewPayment(c, profile, params);
      case "service-prices":
        return await serviceRates(c, profile, params);
      case "settings":
        return await saveSettings(c, profile, params);
      case "stats":
        return await getStats(c);
      case "coupons":
        return await coupons(c, profile, params);
      case "smm-services":
        return await smmServices(c, profile, params);
      case "smm-orders":
        return await smmOrders(c, profile, params);
      case "announcements":
        return await announcements(c, profile, params);
      case "withdrawals":
        return await withdrawals(c, profile, params);
      case "audit-log":
        return await auditLog(c, params);
      default:
        return error("Unknown admin endpoint.", 400);
    }
  } catch (e) {
    return error(e.message || "Admin request failed.", 500);
  }
}

/* ── users ─────────────────────────────────────────────────────── */
/* ── check the mother site's balance for our master API key ─────────── */
async function providerBalance(client) {
  try {
    const resp = await Mother.balance(client);
    return json({ balance: resp.balance });
  } catch (e) {
    return error(e.message || "Could not reach the mother site.", 502);
  }
}

async function getUsers(c, { q, page, pageSize }) {
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 5000);
  const p = Math.max(Number(page) || 1, 1);
  const from = (p - 1) * size;
  const to = from + size - 1;

  let query = c.from("profiles").select("*", { count: "exact" });
  if (q) query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data: users, error: e, count } = await query;
  if (e) return error(e.message, 500);

  const ids = (users || []).map((u) => u.id);
  let numCount = {}, otpCount = {}, spent = {};
  if (ids.length) {
    const [{ data: nAll }, { data: tAll }] = await Promise.all([
      c.from("number_requests").select("user_id,status").in("user_id", ids),
      c.from("transactions").select("user_id,type,amount").in("user_id", ids).eq("type", "debit"),
    ]);
    (nAll || []).forEach((n) => {
      numCount[n.user_id] = (numCount[n.user_id] || 0) + 1;
      if (n.status === "active") otpCount[n.user_id] = (otpCount[n.user_id] || 0) + 1;
    });
    (tAll || []).forEach((t) => {
      spent[t.user_id] = (spent[t.user_id] || 0) + Number(t.amount || 0);
    });
  }

  const out = (users || []).map((u) => ({
    ...u,
    total_numbers: numCount[u.id] || 0,
    otp_count: otpCount[u.id] || 0,
    total_spent: spent[u.id] || 0,
  }));
  return json({ users: out, total: count || 0, page: p, pageSize: size });
}

/* ── user detail ───────────────────────────────────────────────── */
async function getUserDetail(c, { id }) {
  if (!id) return error("User id required.", 400);
  const { data: user } = await c.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!user) return error("User not found.", 404);

  const [tx, numbers, payments] = await Promise.all([
    c.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    c.from("number_requests").select("*").eq("user_id", id).order("requested_at", { ascending: false }).limit(50),
    c.from("payment_requests").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  return json({
    user,
    transactions: tx.data || [],
    numbers: numbers.data || [],
    payments: payments.data || [],
  });
}

/* ── user action: adjust_credit | toggle_status ──────────────────── */
async function userAction(c, profile, { action, userId, amount, type, newStatus }) {
  if (!userId) return error("User id required.", 400);

  if (action === "adjust_credit") {
    if (!amount || amount <= 0) return error("Enter a valid amount.", 400);
    const t = type === "debit" ? "debit" : "credit";
    const { error: e } = await c.rpc("adjust_wallet", {
      p_user_id: userId,
      p_amount: amount,
      p_type: t,
      p_description: "Manual adjustment by admin",
    });
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, `wallet_${t}`, userId, { amount });
    return json({ success: true });
  }

  if (action === "toggle_status") {
    const status = newStatus === "blocked" ? "blocked" : "active";
    const { error: e } = await c.from("profiles").update({ status }).eq("id", userId);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "user_status_change", userId, { status });
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── payments list ─────────────────────────────────────────────── */
async function getPayments(c, { status, page, pageSize }) {
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 5000);
  const p = Math.max(Number(page) || 1, 1);
  const from = (p - 1) * size;
  const to = from + size - 1;

  let q = c
    .from("payment_requests")
    .select("*, profiles!inner(username,email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error: e, count } = await q;
  if (e) return error(e.message, 500);

  const out = (data || []).map((p) => ({
    id: p.id,
    username: p.profiles?.username,
    email: p.profiles?.email,
    amount: p.amount,
    screenshot_url: p.screenshot_url,
    status: p.status,
    admin_reply: p.admin_reply,
    created_at: p.created_at,
  }));
  return json({ payments: out, total: count || 0, page: p, pageSize: size });
}

/* ── review payment (approve/reject) ─────────────────────────────── */
async function reviewPayment(c, profile, { id, decision, reply }) {
  if (!id) return error("Payment id required.", 400);

  const { data: p } = await c.from("payment_requests").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (!p) return error("Payment not found or already reviewed.", 404);

  if (decision === "approve") {
    const note = reply || `Top-up approved (payment #${p.id})`;
    const { error: e } = await c.rpc("approve_payment", { p_payment_id: id, p_reply: note });
    if (e) return error(e.message, 500);
  } else {
    const note = reply || "This payment could not be verified. Please contact support if you believe this is an error.";
    await c.from("payment_requests").update({ status: "rejected", admin_reply: note, reviewed_at: new Date().toISOString() }).eq("id", id);
  }
  await logAdminAction(c, profile, `payment_${decision}`, String(id), { user_id: p.user_id, amount: p.amount });
  return json({ success: true });
}

/* ── service prices: save | delete ───────────────────────────────── */
async function serviceRates(c, profile, { action, service, price }) {
  if (!service) return error("Service required.", 400);

  if (action === "save") {
    if (price == null || price < 0) return error("Enter a valid price.", 400);
    const { error: e } = await c.from("service_prices").upsert({ service, price: Number(price) }, { onConflict: "service" });
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "service_price_save", service, { price });
    return json({ success: true });
  }
  if (action === "delete") {
    await c.from("service_prices").delete().eq("service", service);
    await logAdminAction(c, profile, "service_price_delete", service);
    return json({ success: true });
  }
  return error("Unknown action.", 400);
}

/* ── settings: save_settings | save_payment | save_branding ──────── */
async function saveSettings(c, profile, { action, settings, details, logoUrl }) {
  const upsert = async (obj) => {
    const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
    if (!rows.length) return;
    const { error: e } = await c.from("settings").upsert(rows, { onConflict: "key" });
    if (e) throw e;
  };

  if (action === "get_secure") {
    // Admin-only readback for secret fields the public/client-side settings
    // read is never allowed to see (numberpanel key, OpenRouter keys, etc).
    const all = await getAllSettings(c);
    return json({
      settings: {
        mother_api_key: all.mother_api_key || "",
        ai_verify_enabled: all.ai_verify_enabled || "false",
        ai_verify_model: all.ai_verify_model || "google/gemma-4-31b-it:free",
        ai_verify_instructions: all.ai_verify_instructions || "",
        ai_verify_mode: all.ai_verify_mode || "reject_only",
        openrouter_api_keys: all.openrouter_api_keys || "",
        referral_first_bonus: all.referral_first_bonus || "40",
        referral_commission_pct: all.referral_commission_pct || "10",
        referral_milestone_count: all.referral_milestone_count || "10",
        referral_milestone_bonus: all.referral_milestone_bonus || "300",
        withdrawal_enabled: all.withdrawal_enabled || "false",
        withdrawal_min_amount: all.withdrawal_min_amount || "200",
        withdrawal_min_verified_referrals: all.withdrawal_min_verified_referrals || "5",
      },
    });
  }

  if (action === "save_settings") {
    const allowed = ["site_name", "mother_api_key", "mother_api_base_url", "smm_markup_percent", "price_per_number", "number_hold_minutes", "country_status", "contact_email", "min_topup_amount", "maintenance_enabled", "maintenance_title", "maintenance_message", "maintenance_start", "maintenance_end", "referral_first_bonus", "referral_commission_pct", "referral_milestone_count", "referral_milestone_bonus", "withdrawal_enabled", "withdrawal_min_amount", "withdrawal_min_verified_referrals"];
    const clean = {};
    allowed.forEach((k) => { if (k in settings) clean[k] = settings[k]; });
    await upsert(clean);
    await logAdminAction(c, profile, "settings_save", "site", { keys: Object.keys(clean) });
    return json({ success: true });
  }
  if (action === "save_ai_verify") {
    const allowed = ["ai_verify_enabled", "ai_verify_model", "ai_verify_instructions", "ai_verify_mode", "openrouter_api_keys"];
    const clean = {};
    allowed.forEach((k) => { if (k in settings) clean[k] = settings[k]; });
    await upsert(clean);
    await logAdminAction(c, profile, "settings_save", "ai_verify");
    return json({ success: true });
  }
  if (action === "save_payment") {
    const allowed = ["payment_method_name", "payment_bank_name", "payment_account_title", "payment_account_number", "payment_instructions"];
    const clean = {};
    allowed.forEach((k) => { if (k in details) clean[k] = details[k]; });
    await upsert(clean);
    await logAdminAction(c, profile, "settings_save", "payment", { keys: Object.keys(clean) });
    return json({ success: true });
  }
  if (action === "save_branding") {
    await upsert({ site_logo_url: logoUrl });
    await logAdminAction(c, profile, "settings_save", "branding");
    return json({ success: true });
  }
  return error("Unknown action.", 400);
}

/* ── dashboard stats ──────────────────────────────────────────────── */
async function getStats(c) {
  const count = async (table, filter) => {
    let q = c.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count: n } = await q;
    return n || 0;
  };
  const sum = async (table, column, filter) => {
    let q = c.from(table).select(column);
    if (filter) q = filter(q);
    const { data } = await q;
    return (data || []).reduce((a, r) => a + Number(r[column] || 0), 0);
  };

  const [
    total_users, blocked_users, total_numbers, active_numbers, pending_numbers,
    total_revenue, wallets_total, held_total, pending_payments,
  ] = await Promise.all([
    count("profiles"),
    count("profiles", (q) => q.eq("status", "blocked")),
    count("number_requests"),
    count("number_requests", (q) => q.eq("status", "active")),
    count("number_requests", (q) => q.eq("status", "pending")),
    sum("transactions", "amount", (q) => q.eq("type", "debit")),
    sum("profiles", "wallet_balance"),
    sum("profiles", "wallet_hold"),
    count("payment_requests", (q) => q.eq("status", "pending")),
  ]);

  const { data: recent } = await c
    .from("number_requests")
    .select("*, profiles!inner(username)")
    .order("requested_at", { ascending: false })
    .limit(10);

  const recentMapped = (recent || []).map((r) => ({
    ...r,
    username: r.profiles?.username,
    profiles: undefined,
  }));

  return json({
    stats: {
      total_users, blocked_users, total_numbers, active_numbers, pending_numbers,
      total_revenue, wallets_total, held_total, pending_payments,
      recent: recentMapped,
    },
  });
}

async function coupons(c, profile, { action, id, code, creditAmount, maxUses, active }) {
  if (!action || action === "list") {
    const { data, error: e } = await c.from("coupons").select("*").order("created_at", { ascending: false });
    if (e) return error(e.message, 500);
    return json({ coupons: data || [] });
  }

  if (action === "create") {
    const clean = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) return error("Enter a coupon code.", 400);
    if (!creditAmount || creditAmount <= 0) return error("Enter a valid credit amount.", 400);
    if (!maxUses || maxUses <= 0) return error("Enter a valid usage limit.", 400);
    const { error: e } = await c.from("coupons").insert({
      code: clean,
      credit_amount: creditAmount,
      max_uses: maxUses,
    });
    if (e) {
      if (e.code === "23505") return error("A coupon with this code already exists.", 409);
      return error(e.message, 500);
    }
    await logAdminAction(c, profile, "coupon_create", clean, { creditAmount, maxUses });
    return json({ success: true });
  }

  if (action === "toggle") {
    if (!id) return error("Coupon id required.", 400);
    const { error: e } = await c.from("coupons").update({ active: !!active }).eq("id", id);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "coupon_toggle", String(id), { active });
    return json({ success: true });
  }

  if (action === "delete") {
    if (!id) return error("Coupon id required.", 400);
    await c.from("coupon_redemptions").delete().eq("coupon_id", id);
    await c.from("coupons").delete().eq("id", id);
    await logAdminAction(c, profile, "coupon_delete", String(id));
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── smm services: list | create | update | delete | toggle | pin ── */
async function smmServices(c, profile, { action, id, service }) {
  if (!action || action === "list") {
    const { data, error: e } = await c.from("smm_services").select("*").order("pinned", { ascending: false }).order("position", { ascending: true });
    if (e) return error(e.message, 500);
    return json({ services: data || [] });
  }

  if (action === "create" || action === "update") {
    if (!service?.title) return error("Title is required.", 400);
    if (!service?.price_per_1000 || service.price_per_1000 <= 0) return error("Enter a valid price.", 400);
    if (!service?.min_qty || !service?.max_qty || service.min_qty > service.max_qty) return error("Enter a valid min/max quantity.", 400);
    if (!service?.mother_service_id) return error("Enter the matching Service ID from the mother site's SMM catalog.", 400);

    const row = {
      category: service.category || "General",
      title: service.title,
      description: service.description || null,
      icon: service.icon || null,
      price_per_1000: service.price_per_1000,
      min_qty: service.min_qty,
      max_qty: service.max_qty,
      avg_delivery: service.avg_delivery || null,
      badge: service.badge || null,
      mother_service_id: service.mother_service_id,
    };

    if (action === "create") {
      const { error: e } = await c.from("smm_services").insert(row);
      if (e) return error(e.message, 500);
      await logAdminAction(c, profile, "service_create", service.title);
    } else {
      if (!id) return error("Service id required.", 400);
      const { error: e } = await c.from("smm_services").update(row).eq("id", id);
      if (e) return error(e.message, 500);
      await logAdminAction(c, profile, "service_update", String(id), { title: service.title });
    }
    return json({ success: true });
  }

  if (action === "toggle") {
    if (!id) return error("Service id required.", 400);
    const { data: current } = await c.from("smm_services").select("active").eq("id", id).maybeSingle();
    const { error: e } = await c.from("smm_services").update({ active: !current?.active }).eq("id", id);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "service_toggle", String(id));
    return json({ success: true });
  }

  if (action === "pin") {
    if (!id) return error("Service id required.", 400);
    const { data: current } = await c.from("smm_services").select("pinned").eq("id", id).maybeSingle();
    const { error: e } = await c.from("smm_services").update({ pinned: !current?.pinned }).eq("id", id);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "service_pin", String(id));
    return json({ success: true });
  }

  if (action === "delete") {
    if (!id) return error("Service id required.", 400);
    await c.from("smm_services").delete().eq("id", id);
    await logAdminAction(c, profile, "service_delete", String(id));
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── smm orders: list | update-status | cancel ───────────────────── */
async function smmOrders(c, profile, { action, id, status, adminNote, page, pageSize }) {
  if (!action || action === "list") {
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 5000);
    const p = Math.max(Number(page) || 1, 1);
    const from = (p - 1) * size;
    const to = from + size - 1;

    let q = c.from("smm_orders").select("*, profiles!inner(username)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error: e, count } = await q;
    if (e) return error(e.message, 500);
    const out = (data || []).map((o) => ({ ...o, username: o.profiles?.username, profiles: undefined }));
    return json({ orders: out, total: count || 0, page: p, pageSize: size });
  }

  if (action === "update-status") {
    if (!id || !status) return error("Order id and status required.", 400);
    if (!["pending", "processing", "completed", "cancelled"].includes(status)) return error("Invalid status.", 400);
    if (status === "cancelled") {
      const { error: e } = await c.rpc("cancel_smm_order", { p_order_id: id, p_user_id: null, p_is_admin: true });
      if (e) return error(e.message, 500);
      await logAdminAction(c, profile, "order_cancel", String(id));
      return json({ success: true });
    }
    const { error: e } = await c.from("smm_orders").update({ status, admin_note: adminNote ?? undefined, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "order_status_change", String(id), { status });
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── announcements: list | create | toggle | delete ──────────────── */
async function announcements(c, profile, { action, id, message }) {
  if (!action || action === "list") {
    const { data, error: e } = await c.from("announcements").select("*").order("created_at", { ascending: false }).limit(50);
    if (e) return error(e.message, 500);
    return json({ announcements: data || [] });
  }

  if (action === "create") {
    if (!message?.trim()) return error("Message is required.", 400);
    const { error: e } = await c.from("announcements").insert({ message: message.trim() });
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "announcement_create", null, { message: message.trim() });
    return json({ success: true });
  }

  if (action === "toggle") {
    if (!id) return error("Announcement id required.", 400);
    const { data: current } = await c.from("announcements").select("active").eq("id", id).maybeSingle();
    const { error: e } = await c.from("announcements").update({ active: !current?.active }).eq("id", id);
    if (e) return error(e.message, 500);
    await logAdminAction(c, profile, "announcement_toggle", String(id));
    return json({ success: true });
  }

  if (action === "delete") {
    if (!id) return error("Announcement id required.", 400);
    await c.from("announcements").delete().eq("id", id);
    await logAdminAction(c, profile, "announcement_delete", String(id));
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── withdrawals: list | update-status ───────────────────────────── */
async function withdrawals(c, profile, { action, id, status, adminNote }) {
  if (!action || action === "list") {
    const { data, error: e } = await c
      .from("withdrawals")
      .select("*, profiles!inner(username)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (e) return error(e.message, 500);
    const out = (data || []).map((w) => ({ ...w, username: w.profiles?.username, profiles: undefined }));
    return json({ withdrawals: out });
  }

  if (action === "update-status") {
    if (!id || !status) return error("Withdrawal id and status required.", 400);
    if (!["paid", "rejected"].includes(status)) return error("Invalid status.", 400);

    const { data: w } = await c.from("withdrawals").select("*").eq("id", id).eq("status", "pending").maybeSingle();
    if (!w) return error("Withdrawal not found or already reviewed.", 404);

    if (status === "rejected") {
      // Refund the held amount back to referral_balance.
      const { data: prof } = await c.from("profiles").select("referral_balance").eq("id", w.user_id).maybeSingle();
      await c.from("profiles").update({ referral_balance: Number(prof?.referral_balance || 0) + Number(w.amount) }).eq("id", w.user_id);
      await c.from("transactions").insert({ user_id: w.user_id, type: "credit", amount: w.amount, description: "Withdrawal rejected — refunded to referral balance" });
    }

    await c.from("withdrawals").update({ status, admin_reply: adminNote || null, reviewed_at: new Date().toISOString() }).eq("id", id);
    await logAdminAction(c, profile, `withdrawal_${status}`, String(id), { amount: w.amount });
    return json({ success: true });
  }

  return error("Unknown action.", 400);
}

/* ── audit log: list ──────────────────────────────────────────────── */
async function auditLog(c, { page, pageSize }) {
  const size = Math.min(Math.max(Number(pageSize) || 30, 1), 100);
  const p = Math.max(Number(page) || 1, 1);
  const from = (p - 1) * size;
  const to = from + size - 1;

  const { data, error: e, count } = await c
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (e) return error(e.message, 500);
  return json({ log: data || [], total: count || 0, page: p, pageSize: size });
}

export default withVercel(handler);
