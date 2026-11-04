import { R2Storage } from "./storage.ts";

const ORIGINS = new Set(["https://pashababyiq.com", "https://www.pashababyiq.com", "https://pashababy.restbr.com"]);
export function cors(req: Request) {
  return { "Access-Control-Allow-Origin": ORIGINS.has(req.headers.get("origin") || "") ? req.headers.get("origin")! : "https://pashababyiq.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pb-action", "Access-Control-Allow-Methods": "POST,OPTIONS", "Cache-Control": "no-store", "Vary": "Origin" };
}
async function isManager(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/can_manage_menu`, { method: "POST", headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || "", Authorization: auth, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(8000) });
  return r.ok && (await r.json()) === true;
}
export async function handler(req: Request) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!await isManager(req)) return json({ error: "Forbidden" }, 403);
    const storage = new R2Storage(k => Deno.env.get(k));
    const action = req.headers.get("x-pb-action") || "usage";
    if (action === "usage") return json(await storage.usage());
    if (action === "upload") {
      if (Number(req.headers.get("content-length") || 0) > 950 * 1024) return json({ error: "Request too large" }, 413);
      const form = await req.formData();
      const file = form.get("file"), card = form.get("thumbnail");
      if (!(file instanceof File) || !(card instanceof File)) return json({ error: "Image and card thumbnail are required" }, 400);
      const colorId = String(form.get("assetKey") || "");
      return json(await storage.upload(file, card, colorId || String(form.get("productId") || ""), !!colorId));
    }
    // Deletion is deliberately absent: old URLs remain usable for rollback.
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("R2 image gateway:", e instanceof Error ? e.message : "Unexpected error");
    return json({ error: e instanceof Error ? e.message : "تعذر الاتصال بتخزين الصور" }, 500);
  }
}
Deno.serve(handler);
