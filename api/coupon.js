import { adminClient, json, error, body, requireUser, withVercel } from "./_lib/shared.js";

/** POST /api/coupon  { code } — redeem a discount coupon into the wallet. */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({});
  const { profile, response } = await requireUser(event);
  if (response) return response;

  const { code } = body(event);
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return error("Enter a coupon code.", 400);

  try {
    const c = adminClient();
    const { data, error: e } = await c.rpc("redeem_coupon", { p_user_id: profile.id, p_code: clean });
    if (e) return error(e.message || "Could not redeem this coupon.", 400);
    const creditAmount = data?.[0]?.credit_amount ?? data?.credit_amount;
    return json({ success: true, creditAmount });
  } catch (e) {
    return error(e.message || "Could not redeem this coupon.", 500);
  }
}

export default withVercel(handler);
