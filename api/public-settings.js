import { adminClient, json, error, getPublicSettings, withVercel} from "./_lib/shared.js";

/** GET /api/public-settings — non-secret site config (site name, pricing, payment details, logo, latest announcement). */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({});
  try {
    const client = adminClient();
    const settings = await getPublicSettings(client);

    let announcement = null;
    try {
      const { data } = await client
        .from("announcements")
        .select("id, message")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      announcement = data || null;
    } catch {
      /* table may not exist yet on older deployments — not fatal */
    }

    return json({ settings, announcement });
  } catch (e) {
    return error(e.message || "Could not load settings.", 500);
  }
}

export default withVercel(handler);
