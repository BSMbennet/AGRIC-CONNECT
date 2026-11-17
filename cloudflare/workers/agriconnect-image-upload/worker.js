const ALLOWED = ["https://agric-connect-flax.vercel.app", "https://agric-connect-maluhalobennet-3566s-projects.vercel.app", "http://localhost:3000"];
function cors(origin) {
  const ok = ALLOWED.includes(origin) || /^https:\/\/agric-connect-[a-z0-9-]+-maluhalobennet-3566s-projects\.vercel\.app$/.test(origin);
  return ok ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "PUT, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Vary": "Origin" } : {};
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!Object.keys(headers).length) return Response.json({ error: "origin_not_allowed" }, { status: 403 });
    if (request.method !== "PUT") return Response.json({ error: "method_not_allowed" }, { status: 405, headers });
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return Response.json({ error: "unauthorized" }, { status: 401, headers });
    const listingId = new URL(request.url).searchParams.get("listing_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) return Response.json({ error: "invalid_listing" }, { status: 400, headers });
    const type = request.headers.get("Content-Type") || "";
    const mime = type.split(";")[0].trim();
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[mime];
    if (!ext) return Response.json({ error: "unsupported_image_type" }, { status: 415, headers });
    if (Number(request.headers.get("Content-Length") || 0) > 5242880) return Response.json({ error: "image_too_large" }, { status: 413, headers });
    const userRes = await fetch(env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: auth } });
    if (!userRes.ok) return Response.json({ error: "unauthorized" }, { status: 401, headers });
    const user = await userRes.json();
    const base = env.SUPABASE_URL + "/rest/v1/produce_listings?id=eq." + listingId + "&farmer_id=eq." + encodeURIComponent(user.id);
    const listingRes = await fetch(base + "&select=id,image_urls", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: auth } });
    if (!listingRes.ok) return Response.json({ error: "listing_check_failed" }, { status: 403, headers });
    const rows = await listingRes.json();
    if (!rows.length) return Response.json({ error: "listing_not_owned" }, { status: 403, headers });
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5242880) return Response.json({ error: "invalid_image_size" }, { status: 413, headers });
    const current = Array.isArray(rows[0].image_urls) ? rows[0].image_urls : [];
    if (current.length >= 5) return Response.json({ error: "image_limit_reached" }, { status: 409, headers });
    const key = user.id + "/" + listingId + "/" + crypto.randomUUID() + "." + ext;
    await env.PRODUCT_IMAGES.put(key, bytes, { httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" } });
    const publicUrl = env.PUBLIC_BASE_URL.replace(/\/$/, "") + "/" + key;
    const updateRes = await fetch(base, { method: "PATCH", headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: auth, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ image_urls: [...current, publicUrl] }) });
    if (!updateRes.ok) { await env.PRODUCT_IMAGES.delete(key); return Response.json({ error: "listing_update_failed" }, { status: 500, headers }); }
    return Response.json({ url: publicUrl }, { headers });
  }
};
