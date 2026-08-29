/**
 * Client for the MOTHER SITE's public API (Authorization: Bearer nma_live_...).
 * This is the ONLY place that talks to an outside number/OTP/mail/SMM
 * provider — every other function in this project goes through here.
 *
 * Base URL + API key are admin-configurable (Admin -> Settings -> Site & API)
 * and stored in the `settings` table as mother_api_base_url / mother_api_key,
 * with an env var fallback for local dev / initial deploy.
 */
import { getSetting } from "./shared-core.js";

async function motherCall(client, method, path, params = {}) {
  const baseUrl = (
    process.env.MOTHER_API_BASE_URL || (await getSetting(client, "mother_api_base_url", ""))
  ).replace(/\/$/, "");
  const apiKey = process.env.MOTHER_API_KEY || (await getSetting(client, "mother_api_key", ""));

  if (!baseUrl) throw new Error("Mother API base URL not configured. Set it in Admin → Settings.");
  if (!apiKey) throw new Error("Mother API key not configured. Set it in Admin → Settings.");

  const url = `${baseUrl}/api/v1/${path}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  if (method === "GET") {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const res = await fetch(q ? `${url}?${q}` : url, { method, headers });
    return { ok: res.ok, status: res.status, data: await safeJson(res) };
  }

  const res = await fetch(url, { method, headers, body: JSON.stringify(params) });
  return { ok: res.ok, status: res.status, data: await safeJson(res) };
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

/** Throws with the mother site's own error message when the call failed. */
function unwrap(result) {
  if (!result.ok) {
    throw new Error(result.data?.message || result.data?.error || `Mother API request failed (${result.status}).`);
  }
  return result.data;
}

export const Mother = {
  balance: (c) => motherCall(c, "GET", "balance").then(unwrap),
  services: (c, server) => motherCall(c, "GET", "services", { server }).then(unwrap),
  countries: (c, service, server) => motherCall(c, "GET", "countries", { service, server }).then(unwrap),
  requestNumber: (c, { service, country, server, quantity, countryId, tierNumber }) =>
    motherCall(c, "POST", "request_number", { service, country, server, quantity, countryId, tierNumber }).then(unwrap),
  checkOtp: (c, id) => motherCall(c, "GET", "check_otp", { id }).then(unwrap),
  releaseNumber: (c, id) => motherCall(c, "POST", "release_number", { id }).then(unwrap),
  myNumbers: (c) => motherCall(c, "GET", "my_numbers").then(unwrap),
  liveOtp: (c, limit) => motherCall(c, "GET", "live_otp", { limit }).then(unwrap),
  mailGenerate: (c, username) => motherCall(c, "POST", "mail/generate", { username }).then(unwrap),
  mailMessages: (c, address) => motherCall(c, "GET", "mail/messages", { address }).then(unwrap),
  smmServices: (c) => motherCall(c, "GET", "smm/services").then(unwrap),
  smmOrder: (c, { serviceId, quantity, link }) =>
    motherCall(c, "POST", "smm/order", { serviceId, quantity, link }).then(unwrap),
  smmOrders: (c) => motherCall(c, "GET", "smm/orders").then(unwrap),
};
