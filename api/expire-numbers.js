import { adminClient, json, error, Mother, withVercel } from "./_lib/shared.js";

/**
 * POST/GET /api/expire-numbers?key=CRON_SECRET
 * Scheduled function that releases pending numbers past their hold window
 * and refunds the hold. Run every few minutes (Vercel Cron / Netlify
 * Scheduled Functions).
 */
export async function handler(event) {
  const expected = process.env.CRON_SECRET;
  const sent = event.queryStringParameters?.key || "";
  if (expected && sent !== expected) return error("Unauthorized.", 401);

  try {
    const client = adminClient();
    const { data: expired } = await client
      .from("number_requests")
      .select("*")
      .eq("status", "pending")
      .lte("expires_at", new Date().toISOString());

    let count = 0;
    for (const row of expired || []) {
      if (row.mother_request_id) {
        await Mother.releaseNumber(client, row.mother_request_id).catch(() => {});
      }
      await client.rpc("release_hold", { p_user_id: row.user_id, p_amount: row.hold_amount });
      await client
        .from("number_requests")
        .update({ status: "expired", released_at: new Date().toISOString() })
        .eq("id", row.id);
      count++;
    }
    return json({ released: count });
  } catch (e) {
    return error(e.message || "Expire job failed.", 500);
  }
}

export default withVercel(handler);
