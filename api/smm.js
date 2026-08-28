import { adminClient, json, error, body, requireUser, withVercel, Mother } from "./_lib/shared.js";

/**
 * SMM services are curated locally (Admin -> SMM Services) with your own
 * pricing, each mapped to a service ID from the mother site's SMM catalog.
 * Placing an order charges the local wallet at YOUR price, then forwards
 * the order to the mother site using that mapped ID.
 *
 * POST /api/smm  { endpoint: "services" | "order" | "my-orders", ... }
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
        return await services(client);
      case "order":
        return await placeOrder(client, profile, params);
      case "my-orders":
        return await myOrders(client, profile);
      case "cancel-order":
        return await cancelOrder(client, profile, params);
      default:
        return error("Unknown endpoint.", 400);
    }
  } catch (e) {
    return error(e.message || "Request failed.", 500);
  }
}

async function services(client) {
  const { data, error: e } = await client
    .from("smm_services")
    .select("*")
    .eq("active", true)
    .order("pinned", { ascending: false })
    .order("position", { ascending: true });
  if (e) return error(e.message, 500);
  return json({ services: data || [] });
}

async function placeOrder(client, profile, { serviceId, quantity, link }) {
  const qty = Number(quantity);
  if (!serviceId) return error("Service is required.", 400);
  if (!qty || qty <= 0) return error("Enter a valid quantity.", 400);
  if (!link) return error("Link is required.", 400);

  const { data: svc } = await client.from("smm_services").select("*").eq("id", serviceId).eq("active", true).maybeSingle();
  if (!svc) return error("Service not found.", 404);
  if (qty < svc.min_qty || qty > svc.max_qty) return error(`Quantity must be between ${svc.min_qty} and ${svc.max_qty}.`, 400);

  const price = Math.ceil((svc.price_per_1000 / 1000) * qty * 100) / 100;

  const { data: charged, error: chargeErr } = await client.rpc("charge_wallet", {
    p_user_id: profile.id,
    p_amount: price,
    p_description: `SMM order: ${svc.title} x${qty}`,
  });
  if (chargeErr || !charged) return error("Insufficient balance. Please top up.", 402);

  let motherResp;
  try {
    motherResp = await Mother.smmOrder(client, { serviceId: svc.mother_service_id, quantity: qty, link });
  } catch (e) {
    await client.rpc("refund_wallet", { p_user_id: profile.id, p_amount: price, p_description: `Refund: SMM order failed (${svc.title})` });
    return error(e.message || "Could not place order with provider.", 502);
  }

  if (!motherResp?.success) {
    await client.rpc("refund_wallet", { p_user_id: profile.id, p_amount: price, p_description: `Refund: SMM order failed (${svc.title})` });
    return error(motherResp?.message || "Could not place order.", 502);
  }

  const { data: row, error: insErr } = await client
    .from("smm_orders")
    .insert({
      user_id: profile.id,
      service_id: svc.id,
      service_title: svc.title,
      quantity: qty,
      link,
      price,
      status: "processing",
      mother_order_id: motherResp.orderId != null ? String(motherResp.orderId) : null,
    })
    .select("*")
    .single();
  if (insErr) return error("Order placed but could not be saved — contact support with your details.", 500);

  return json({ success: true, order: row });
}

async function cancelOrder(client, profile, { orderId }) {
  if (!orderId) return error("Order id required.", 400);
  const { data: row } = await client.from("smm_orders").select("*").eq("id", orderId).eq("user_id", profile.id).maybeSingle();
  if (!row) return error("Order not found.", 404);
  if (row.status === "completed" || row.status === "cancelled") return error(`Order already ${row.status}.`, 400);

  // Note: the mother site doesn't expose a cancel endpoint for API-key
  // orders, so this only stops it on our side and refunds you — it won't
  // stop delivery if the mother site already started it.
  await client.rpc("refund_wallet", { p_user_id: profile.id, p_amount: row.price, p_description: `Refund: cancelled SMM order (${row.service_title})` });
  await client.from("smm_orders").update({ status: "cancelled" }).eq("id", row.id);
  return json({ success: true });
}

async function myOrders(client, profile) {
  const { data, error: e } = await client
    .from("smm_orders")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (e) return error(e.message, 500);
  return json({ orders: data || [] });
}

export default withVercel(handler);
