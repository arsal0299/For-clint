/**
 * Core helpers for Netlify/Vercel Functions — auth, settings, CORS, etc.
 * Split out from shared.js so mother.js (the provider client) can import
 * getSetting() without a circular import, since shared.js also re-exports
 * the Mother client for convenience.
 *
 * Uses the Supabase service-role key (server-only) so we can bypass RLS for
 * privileged operations while still verifying the caller's identity via
 * their access token.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";

export function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(body, status = 200, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(), ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function error(message, status = 400) {
  return json({ message }, status);
}

/** Build a service-role Supabase client from env. */
export function adminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Server not configured: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Verify the Bearer token sent by the SPA and return the matching profile row.
 * Throws (returns null) when there's no valid session.
 */
export async function getUserProfile(event) {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);

  const client = adminClient();
  const { data, error: e } = await client.auth.getUser(token);
  if (e || !data.user) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  return profile;
}

export async function requireUser(event) {
  const profile = await getUserProfile(event);
  if (!profile) return { profile: null, response: error("Authentication required.", 401) };
  if (profile.status === "blocked")
    return { profile: null, response: error("Your account has been blocked.", 403) };
  return { profile, response: null };
}

export async function requireAdmin(event) {
  const { profile, response } = await requireUser(event);
  if (response) return { profile: null, response };
  if (!profile.is_admin) return { profile: null, response: error("Admin access required.", 403) };
  return { profile, response: null };
}

/**
 * Record an admin action to admin_audit_log. Fire-and-forget — a logging
 * failure should never break the admin action itself, so errors are
 * swallowed (not re-thrown).
 */
export async function logAdminAction(client, profile, action, target, details) {
  try {
    await client.from("admin_audit_log").insert({
      admin_id: profile.id,
      admin_username: profile.username,
      action,
      target: target ?? null,
      details: details ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
}

/* ── Public API key auth (for this child site's own future public API) ── */
const API_KEY_PREFIX = "cma_live_";

export function generateApiKey() {
  const raw = randomBytes(24).toString("hex");
  const key = API_KEY_PREFIX + raw;
  return { key, keyHash: hashApiKey(key), keyPrefix: key.slice(0, API_KEY_PREFIX.length + 6) };
}

export function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

export async function requireApiKey(event, client) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const key = bearer || event.headers["x-api-key"] || event.headers["X-Api-Key"] || "";

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { profile: null, apiKeyId: null, response: error("Missing or invalid API key.", 401) };
  }

  const keyHash = hashApiKey(key);
  const { data: row } = await client
    .from("api_keys")
    .select("id, user_id, active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!row || !row.active) {
    return { profile: null, apiKeyId: null, response: error("Invalid or revoked API key.", 401) };
  }

  const { data: allowed } = await client.rpc("check_api_rate_limit", { p_api_key_id: row.id });
  if (!allowed) {
    return { profile: null, apiKeyId: null, response: error("Rate limit exceeded. Max 60 requests/minute.", 429) };
  }

  const { data: profile } = await client.from("profiles").select("*").eq("id", row.user_id).maybeSingle();
  if (!profile) {
    return { profile: null, apiKeyId: null, response: error("Account not found.", 401) };
  }
  if (profile.status === "blocked") {
    return { profile: null, apiKeyId: null, response: error("Account is blocked.", 403) };
  }

  client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id).then(() => {}, () => {});

  return { profile, apiKeyId: row.id, response: null };
}

export function body(event) {
  if (event.body && typeof event.body === "object") {
    return { ...(event.queryStringParameters || {}), ...event.body };
  }
  if (!event.body) return event.queryStringParameters || {};
  try {
    const parsed = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body);
    return { ...(event.queryStringParameters || {}), ...parsed };
  } catch {
    return event.queryStringParameters || {};
  }
}

/**
 * Wrap a Netlify-style handler(event) so the same function file also works
 * as a Vercel Node.js serverless function, which uses (req, res) instead.
 */
export function withVercel(handler) {
  return async function (req, res) {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const event = {
      httpMethod: req.method,
      headers: req.headers || {},
      queryStringParameters: { ...Object.fromEntries(urlObj.searchParams), ...(req.query || {}) },
      path: urlObj.pathname,
      body: req.body,
      isBase64Encoded: false,
    };
    const result = await handler(event);
    const status = result?.statusCode ?? 200;
    const headers = result?.headers || {};
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    res.status(status).send(result?.body ?? "");
  };
}

/* ── Settings helper ──────────────────────────────────────────── */
const PUBLIC_KEYS = [
  "site_name", "price_per_number", "min_topup_amount", "number_hold_minutes",
  "country_status", "contact_email", "site_logo_url",
  "payment_method_name", "payment_bank_name", "payment_account_title",
  "payment_account_number", "payment_instructions",
  "maintenance_enabled", "maintenance_title", "maintenance_message",
  "maintenance_start", "maintenance_end",
  "withdrawal_enabled", "withdrawal_min_amount", "withdrawal_min_verified_referrals",
];
export const PUBLIC_SETTING_KEYS = PUBLIC_KEYS;

export async function getSetting(client, key, fallback = "") {
  const { data } = await client.from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

export async function getAllSettings(client) {
  const { data } = await client.from("settings").select("key,value");
  const map = {};
  (data || []).forEach((r) => (map[r.key] = r.value));
  return map;
}

export async function getPublicSettings(client) {
  const all = await getAllSettings(client);
  const out = {};
  PUBLIC_KEYS.forEach((k) => (out[k] = all[k] ?? ""));
  return out;
}

/**
 * AI-assisted payment verification. Sends the payment screenshot to a
 * vision-capable OpenRouter model along with the admin's stated criteria,
 * asking for a structured approve/reject/uncertain decision.
 *
 * Rotates through up to 5 admin-provided OpenRouter API keys — tries the
 * next key on a 429/5xx. Returns null when disabled/unconfigured/every key
 * failed — callers should fall back to normal manual admin review.
 */
export async function verifyPaymentWithAI(client, { screenshotUrl, amount }) {
  const all = await getAllSettings(client);
  if (all.ai_verify_enabled !== "true") return null;

  const keys = (all.openrouter_api_keys || "")
    .split(/[\n,]/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!keys.length) return null;

  const model = all.ai_verify_model || "google/gemma-4-31b-it:free";
  const instructions = all.ai_verify_instructions || "The screenshot must clearly show a successful payment for the exact claimed amount.";

  const prompt =
    `You are a payment verification assistant for a wallet top-up system on a website. ` +
    `A user submitted this screenshot claiming to have paid Rs ${amount}.\n\n` +
    `Verification criteria set by the site admin:\n${instructions}\n\n` +
    `Look at the image carefully. Respond with ONLY a JSON object, no other text, in exactly this format:\n` +
    `{"decision": "approve" | "reject" | "uncertain", "reason": "<one short sentence, written as if a human admin wrote it>"}\n\n` +
    `Rules:\n` +
    `- "approve" only if the screenshot clearly shows a genuine payment matching the criteria and the amount.\n` +
    `- "reject" if the screenshot is clearly fake, edited, unrelated to payment, doesn't match the amount, or fails the stated criteria.\n` +
    `- "uncertain" if the image is unclear, partial, or you genuinely cannot tell — this will be sent to a human for manual review.`;

  for (const key of keys) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: screenshotUrl } },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (res.status === 429 || res.status >= 500) continue; // try next key
      if (!res.ok) return null;

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]);
      if (!["approve", "reject", "uncertain"].includes(parsed.decision)) continue;

      return { decision: parsed.decision, reason: String(parsed.reason || "").slice(0, 300) };
    } catch {
      continue; // try next key
    }
  }

  return null; // every key failed — fall back to manual review
}

/* ── Pricing ──────────────────────────────────────────────────── */
export async function servicePrice(client, service) {
  const { data } = await client.from("service_prices").select("price").eq("service", service).maybeSingle();
  return data ? Number(data.price) : Number(await getSetting(client, "price_per_number", "5.00"));
}

// Pulls a numeric OTP code out of a raw SMS body, kept for compatibility —
// the mother API's /check_otp already returns a clean code in most cases,
// but this is a safety net if it ever returns a raw message instead.
export function extractOtpFromMessage(text) {
  if (!text) return null;
  const match = String(text).match(/\b\d{4,8}\b/);
  return match ? match[0] : null;
}
