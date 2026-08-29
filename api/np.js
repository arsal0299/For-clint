import { adminClient, json, error, body, requireUser, servicePrice, getSetting, generateApiKey, verifyPaymentWithAI, withVercel, Mother } from "./_lib/shared.js";

/**
 * All number/mail operations in one file. Every one of these calls out to
 * the MOTHER SITE's public API (see api/_lib/mother.js) — this project has
 * no direct connection to any upstream number/OTP/mail provider. Wallet
 * holds, pricing and the number_requests table are all local to this site.
 *
 * POST /api/np  { endpoint: "...", ...params }
 * endpoint: "services" | "countries" | "request-number" | "release-number" |
 *           "check-otp" | "mail-generate" | "mail-messages" |
 *           "list-keys" | "create-key" | "revoke-key" |
 *           "request-withdrawal" | "my-withdrawals" | "submit-payment"
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({});
  const { profile, response } = await requireUser(event);
  if (response) return response;

  const params = body(event);
  const client = adminClient();

  try {
    switch (params.endpoint) {
      case "services":
        return await getServices(client, params);
      case "countries":
        return await getCountries(client, params);
      case "request-number":
        return await requestNumber(client, profile, params);
      case "release-number":
        return await releaseNumber(client, profile, params);
      case "check-otp":
        return await checkOtp(client, profile, params);
      case "live-otp":
        return await liveOtp(client, params);
      case "mail-generate":
        return await mailGenerate(client, profile, params);
      case "mail-messages":
        return await mailMessages(client, profile, params);
      case "submit-payment":
        return await submitPayment(client, profile, params);
      case "list-keys":
        return await listKeys(client, profile);
      case "create-key":
        return await createKey(client, profile, params);
      case "revoke-key":
        return await revokeKey(client, profile, params);
      case "request-withdrawal":
        return await requestWithdrawal(client, profile, params);
      case "my-withdrawals":
        return await myWithdrawals(client, profile);
      default:
        return error("Unknown endpoint.", 400);
    }
  } catch (e) {
    return error(e.message || "Request failed.", 500);
  }
}

/* ── services / countries (straight relay to the mother site) ───────── */
async function getServices(client, { server }) {
  const resp = await Mother.services(client, server);
  return json({ services: resp.services || [] });
}

async function getCountries(client, { service, server }) {
  if (!service) return error("Service is required.", 400);
  const resp = await Mother.countries(client, service, server);
  return json({ countries: resp.countries || [] });
}

/* ── request a number (holds local wallet balance, buys via mother) ─── */
async function requestNumber(client, profile, params) {
  const { service, country, server, quantity, countryId, tierNumber } = params;
  const srv = Number(server) || 1;
  const qty = Math.min(Math.max(Number(quantity) || 1, 1), 5);

  if (!service) return error("Choose a service.", 400);
  if (!country && !countryId) return error("Choose a country.", 400);

  const price = await servicePrice(client, service);
  const totalNeeded = price * qty;
  const combined = Number(profile.wallet_balance) + Number(profile.referral_balance || 0) - Number(profile.wallet_hold);
  if (combined < totalNeeded) return error(`Insufficient balance for ${qty} number(s). Please top up.`, 402);

  const results = [];
  const failures = [];

  for (let i = 0; i < qty; i++) {
    try {
      const row = await requestSingleNumber(client, profile, { service, country, server: srv, price, countryId, tierNumber });
      results.push(row);
    } catch (e) {
      failures.push(e.message || "Could not get a number.");
    }
  }

  if (results.length === 0) {
    return error(failures[0] || "No numbers available right now.", 502);
  }
  return json({ success: true, numbers: results, requested: qty, obtained: results.length, failures });
}

async function requestSingleNumber(client, profile, { service, country, server, price, countryId, tierNumber }) {
  await client.rpc("ensure_wallet_funds_from_referral", { p_user_id: profile.id, p_needed: price });

  const { data: held, error: holdErr } = await client.rpc("hold_wallet", {
    p_user_id: profile.id,
    p_amount: price,
  });
  if (holdErr || !held) throw new Error("Insufficient available balance. Please top up.");

  let motherResp;
  try {
    motherResp = await Mother.requestNumber(client, { service, country, server, countryId, tierNumber });
  } catch (e) {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: price });
    throw e;
  }

  const req = motherResp?.request;
  if (!motherResp?.success || !req?.number) {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: price });
    throw new Error(motherResp?.message || "No numbers available right now.");
  }

  const expires = req.expires_at || new Date(Date.now() + Number(await getSetting(client, "number_hold_minutes", "20")) * 60000).toISOString();

  const { data: row, error: insErr } = await client
    .from("number_requests")
    .insert({
      user_id: profile.id,
      service,
      country: req.country || country || "",
      number: req.number,
      operator: "Mobile",
      server,
      cost: price,
      hold_amount: price,
      expires_at: expires,
      status: "pending",
      mother_request_id: String(req.id),
    })
    .select("*")
    .single();
  if (insErr) {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: price });
    throw new Error("Could not save the number request. Please try again.");
  }

  return row;
}

/* ── release a pending/active number ─────────────────────────────── */
async function releaseNumber(client, profile, { requestId }) {
  if (!requestId) return error("Missing request id.", 400);

  const { data: row } = await client
    .from("number_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!row) return error("Number request not found.", 404);
  if (row.status !== "pending" && row.status !== "active") return json({ success: true });

  if (row.mother_request_id) {
    await Mother.releaseNumber(client, row.mother_request_id).catch(() => {});
  }

  if (row.status === "pending") {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: row.hold_amount });
  }
  await client
    .from("number_requests")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", row.id);

  return json({ success: true });
}

/* ── poll for an OTP ──────────────────────────────────────────────── */
async function checkOtp(client, profile, { requestId }) {
  if (!requestId) return error("Missing request id.", 400);

  const { data: row } = await client
    .from("number_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!row) return error("Number request not found.", 404);
  if (row.status !== "pending") return json({ otp: row.otp_code });

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: row.hold_amount });
    await client.from("number_requests").update({ status: "expired", released_at: new Date().toISOString() }).eq("id", row.id);
    return json({ otp: null, expired: true });
  }

  if (!row.mother_request_id) return json({ otp: null });

  const resp = await Mother.checkOtp(client, row.mother_request_id);

  if (resp.status === "expired") {
    await client.rpc("release_hold", { p_user_id: profile.id, p_amount: row.hold_amount });
    await client.from("number_requests").update({ status: "expired", released_at: new Date().toISOString() }).eq("id", row.id);
    return json({ otp: null, expired: true });
  }

  if (resp.otp) {
    const { error: finErr } = await client.rpc("finalize_hold", {
      p_user_id: profile.id,
      p_amount: row.hold_amount,
      p_description: `Number verified: ${row.service}/${row.country}`,
    });
    if (finErr) return error("Could not finalize charge.", 500);
    await client
      .from("number_requests")
      .update({ otp_code: resp.otp, otp_received_at: new Date().toISOString(), status: "active" })
      .eq("id", row.id);
    return json({ otp: resp.otp });
  }

  return json({ otp: null });
}

/* ── combined live OTP feed (server 1 + 2), via mother ───────────── */
async function liveOtp(client, { limit }) {
  const resp = await Mother.liveOtp(client, limit);
  return json({ feed: resp.feed || [] });
}

/* ── withdrawals ──────────────────────────────────────────────────── */
async function requestWithdrawal(client, profile, { amount, method, accountDetails }) {
  if (!amount || amount <= 0) return error("Enter a valid amount.", 400);
  if (!method || !accountDetails) return error("Payout method and account details are required.", 400);

  const { data, error: e } = await client.rpc("request_withdrawal", {
    p_user_id: profile.id,
    p_amount: amount,
    p_method: method,
    p_account_details: accountDetails,
  });
  if (e) return error(e.message || "Could not submit withdrawal request.", 400);
  return json({ success: true, id: data });
}

async function myWithdrawals(client, profile) {
  const { data, error: e } = await client
    .from("withdrawals")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (e) return error(e.message, 500);
  return json({ withdrawals: data || [] });
}

/* ── generate a disposable mailbox (via mother) ──────────────────── */
async function mailGenerate(client, profile, { username }) {
  const resp = await Mother.mailGenerate(client, username || "");
  if (!resp.success || !resp.mail?.address) {
    return error(resp.message || "Could not generate mailbox.", 502);
  }
  await client.from("mailboxes").insert({
    user_id: profile.id,
    address: resp.mail.address,
    token: resp.mail.token ?? null,
  });
  return json({ mail: resp.mail });
}

/* ── read messages for a mailbox the user owns (via mother) ─────── */
async function mailMessages(client, profile, { address }) {
  if (!address) return error("Address is required.", 400);

  const { data: owned } = await client
    .from("mailboxes")
    .select("id")
    .eq("user_id", profile.id)
    .eq("address", address)
    .maybeSingle();
  if (!owned) return error("Mailbox not found.", 404);

  const resp = await Mother.mailMessages(client, address);
  return json({ messages: resp.messages || [] });
}

/* ── Public API keys: list | create | revoke (this site's own, future) ── */
async function listKeys(client, profile) {
  const { data, error: e } = await client
    .from("api_keys")
    .select("id, name, key_prefix, active, created_at, last_used_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  if (e) return error(e.message, 500);
  return json({ keys: data || [] });
}

async function createKey(client, profile, { name }) {
  const { count: activeCount } = await client.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("active", true);
  if ((activeCount ?? 0) >= 5) return error("You can have at most 5 active API keys. Revoke one first.", 400);

  const { key, keyHash, keyPrefix } = generateApiKey();
  const { error: e } = await client.from("api_keys").insert({
    user_id: profile.id,
    name: (name || "My API Key").trim().slice(0, 60),
    key_hash: keyHash,
    key_prefix: keyPrefix,
  });
  if (e) return error(e.message, 500);
  return json({ key });
}

async function revokeKey(client, profile, { id }) {
  if (!id) return error("Key id required.", 400);
  const { error: e } = await client
    .from("api_keys")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", profile.id);
  if (e) return error(e.message, 500);
  return json({ success: true });
}

/* ── submit a top-up payment (screenshot already uploaded) ───────── */
async function submitPayment(client, profile, { amount, screenshotUrl }) {
  const amt = Number(amount);
  if (!amt || amt <= 0) return error("Enter a valid amount.", 400);
  if (!screenshotUrl) return error("Screenshot is required.", 400);

  const { data: row, error: e } = await client
    .from("payment_requests")
    .insert({ user_id: profile.id, amount: amt, screenshot_url: screenshotUrl, status: "pending" })
    .select("id")
    .single();
  if (e) return error(e.message, 500);

  let ai = null;
  try {
    ai = await verifyPaymentWithAI(client, { screenshotUrl, amount: amt });
  } catch {
    ai = null;
  }

  if (ai?.decision === "approve") {
    const { error: approveErr } = await client.rpc("approve_payment", {
      p_payment_id: row.id,
      p_reply: `Auto-approved by AI verification — ${ai.reason}`,
    });
    if (!approveErr) return json({ success: true, status: "approved", aiReason: ai.reason });
  } else if (ai?.decision === "reject") {
    await client
      .from("payment_requests")
      .update({ status: "rejected", admin_reply: ai.reason, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    return json({ success: true, status: "rejected", aiReason: ai.reason });
  }

  return json({ success: true, status: "pending" });
}

export default withVercel(handler);
