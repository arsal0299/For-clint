import { adminClient, json, error, requireUser, withVercel} from "./_lib/shared.js";

/**
 * GET /api/referral-stats — the caller's referral link data, totals, and the
 * list of users they've referred (username + verified status only — no
 * wallet/email exposed).
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({});
  const { profile, response } = await requireUser(event);
  if (response) return response;

  try {
    const c = adminClient();
    const { data: referrals, error: e } = await c
      .from("profiles")
      .select("username, created_at, referral_verified")
      .eq("referred_by", profile.id)
      .order("created_at", { ascending: false });
    if (e) return error(e.message, 500);

    const total = referrals?.length || 0;
    const verified = referrals?.filter((r) => r.referral_verified).length || 0;

    return json({
      code: profile.username,
      earnings: profile.referral_earnings || 0,
      total,
      verified,
      milestonePaid: profile.referral_milestone_10_paid || false,
      referrals: (referrals || []).map((r) => ({
        username: r.username,
        created_at: r.created_at,
        verified: r.referral_verified,
      })),
    });
  } catch (e) {
    return error(e.message || "Could not load referral stats.", 500);
  }
}

export default withVercel(handler);
