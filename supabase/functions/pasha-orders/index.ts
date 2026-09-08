import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://pashababyiq.com",
  "https://www.pashababyiq.com",
  "https://pashababy.restbr.com",
]);

const MAX_ITEMS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_RE = /^\+[1-9][0-9]{7,14}$/;

type CatalogProduct = {
  id: string;
  category_id: string;
  name_ar?: string | null;
  name_ku?: string | null;
  name_en?: string | null;
  base_price?: number | null;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  is_available?: boolean | null;
  availability_schedule_enabled?: boolean | null;
  available_from?: string | null;
  available_to?: string | null;
};

type CatalogOption = {
  id: string;
  product_id: string;
  name_ar?: string | null;
  name_ku?: string | null;
  name_en?: string | null;
  price: number;
  sort_order?: number | null;
  is_active?: boolean | null;
  is_available?: boolean | null;
};

type CatalogCategory = {
  id: string;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  availability_schedule_enabled?: boolean | null;
  available_from?: string | null;
  available_to?: string | null;
};

type DiscountRow = {
  id?: string;
  discount_amount?: number | null;
  scope_type?: string | null;
  target_id?: string | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://pashababyiq.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeDigits(value: unknown) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

function normalizePhone(value: unknown) {
  let raw = normalizeDigits(value).trim();
  if (!raw) return "";
  raw = raw.replace(/[\s().-]+/g, "");
  if (raw.startsWith("00")) raw = "+" + raw.slice(2);

  let digits = raw.replace(/\D/g, "");
  if (/^07\d{9}$/.test(digits)) return "+964" + digits.slice(1);
  if (/^7\d{9}$/.test(digits)) return "+964" + digits;
  if (/^9647\d{9}$/.test(digits)) return "+" + digits;
  if (raw.startsWith("+") && E164_RE.test("+" + digits)) return "+" + digits;
  if (/^[1-9]\d{7,14}$/.test(digits)) return "+" + digits;
  return "";
}

function localMinutesBaghdad() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: unknown) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function scheduleAllows(row: { availability_schedule_enabled?: boolean | null; available_from?: string | null; available_to?: string | null }) {
  if (row?.availability_schedule_enabled !== true) return true;
  const start = timeToMinutes(row.available_from);
  const end = timeToMinutes(row.available_to);
  if (start === null || end === null || start === end) return true;
  const now = localMinutesBaghdad();
  return start < end ? now >= start && now < end : now >= start || now < end;
}

function discountLive(row: DiscountRow, now = Date.now()) {
  const amount = Number(row?.discount_amount || 0);
  if (row?.is_active === false || !Number.isFinite(amount) || amount <= 0) return false;
  const start = row?.starts_at ? Date.parse(row.starts_at) : NaN;
  const end = row?.ends_at ? Date.parse(row.ends_at) : NaN;
  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now >= end) return false;
  return true;
}

function effectiveDiscount(discounts: DiscountRow[], productId: string, categoryId: string) {
  const live = discounts.filter((row) => discountLive(row));
  const scoped = [
    live.filter((row) => row.scope_type === "product" && String(row.target_id || "") === productId),
    live.filter((row) => row.scope_type === "category" && String(row.target_id || "") === categoryId),
    live.filter((row) => row.scope_type === "restaurant"),
  ];

  for (const rows of scoped) {
    if (!rows.length) continue;
    return rows.reduce((best, row) =>
      Number(row.discount_amount || 0) > Number(best.discount_amount || 0) ? row : best
    );
  }
  return null;
}

function displayName(row: { name_ar?: string | null; name_ku?: string | null; name_en?: string | null }, fallback: string) {
  return cleanText(row?.name_ar || row?.name_ku || row?.name_en || fallback, 200);
}

function orderNumberFromToken(clientToken: string) {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `PB-${stamp}-${clientToken.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(req) });
  }

  if (req.method !== "POST") return json(req, { ok: false, error: "Method not allowed" }, 405);
  if (!ALLOWED_ORIGINS.has(origin)) return json(req, { ok: false, error: "Origin not allowed" }, 403);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return json(req, { ok: false, error: "Server configuration is incomplete" }, 500);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(req, { ok: false, error: "Invalid JSON" }, 400);
    }

    const name = cleanText(body.name, 80);
    const phoneE164 = normalizePhone(body.phone);
    const orderType = cleanText(body.orderType, 20).toLowerCase();
    const address = cleanText(body.address, 300);
    const locationUrl = cleanText(body.locationUrl, 500);
    const notes = cleanText(body.notes, 500);
    const clientToken = cleanText(body.clientToken, 64).toLowerCase();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!name) return json(req, { ok: false, error: "Customer name is required" }, 400);
    if (!phoneE164 || !E164_RE.test(phoneE164)) return json(req, { ok: false, error: "Valid phone number is required" }, 400);
    if (!["delivery", "pickup"].includes(orderType)) return json(req, { ok: false, error: "Invalid order type" }, 400);
    if (orderType === "delivery" && !address) return json(req, { ok: false, error: "Delivery address is required" }, 400);
    if (!UUID_RE.test(clientToken)) return json(req, { ok: false, error: "Invalid client token" }, 400);
    if (rawItems.length < 1 || rawItems.length > MAX_ITEMS) return json(req, { ok: false, error: "Invalid item count" }, 400);

    const requested = rawItems.map((raw: any) => {
      const productId = cleanText(raw?.productId, 64).toLowerCase();
      const optionId = cleanText(raw?.optionId, 64).toLowerCase();
      const optionIndex = Math.max(0, Math.trunc(Number(raw?.optionIndex || 0)));
      const quantity = Math.trunc(Number(raw?.quantity || 0));
      if (!UUID_RE.test(productId)) throw new Error("Invalid product reference");
      if (optionId && !UUID_RE.test(optionId)) throw new Error("Invalid option reference");
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) throw new Error("Invalid quantity");
      return { productId, optionId, optionIndex, quantity };
    });

    const productIds = [...new Set(requested.map((item) => item.productId))];
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [productsResult, optionsResult, discountsResult] = await Promise.all([
      admin
        .from("products")
        .select("id,category_id,name_ar,name_ku,name_en,base_price,is_active,is_visible,is_available,availability_schedule_enabled,available_from,available_to")
        .in("id", productIds),
      admin
        .from("product_options")
        .select("id,product_id,name_ar,name_ku,name_en,price,sort_order,is_active,is_available")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      admin
        .from("discounts")
        .select("id,discount_amount,scope_type,target_id,is_active,starts_at,ends_at")
        .eq("is_active", true),
    ]);

    if (productsResult.error) throw productsResult.error;
    if (optionsResult.error) throw optionsResult.error;
    if (discountsResult.error) throw discountsResult.error;

    const products = (productsResult.data || []) as CatalogProduct[];
    const options = (optionsResult.data || []) as CatalogOption[];
    const discounts = (discountsResult.data || []) as DiscountRow[];

    if (products.length !== productIds.length) throw new Error("One or more products no longer exist");

    const categoryIds = [...new Set(products.map((p) => String(p.category_id || "")).filter(Boolean))];
    const categoriesResult = await admin
      .from("categories")
      .select("id,is_active,is_visible,availability_schedule_enabled,available_from,available_to")
      .in("id", categoryIds);
    if (categoriesResult.error) throw categoriesResult.error;
    const categories = (categoriesResult.data || []) as CatalogCategory[];

    const productMap = new Map(products.map((p) => [String(p.id), p]));
    const categoryMap = new Map(categories.map((c) => [String(c.id), c]));
    const optionsByProduct = new Map<string, CatalogOption[]>();
    for (const option of options) {
      const key = String(option.product_id);
      if (!optionsByProduct.has(key)) optionsByProduct.set(key, []);
      optionsByProduct.get(key)!.push(option);
    }

    const authoritativeItems = requested.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || product.is_active === false || product.is_visible === false || product.is_available === false || !scheduleAllows(product)) {
        throw new Error("One of the products is not available right now");
      }

      const category = categoryMap.get(String(product.category_id || ""));
      if (!category || category.is_active === false || category.is_visible === false || !scheduleAllows(category)) {
        throw new Error("One of the product categories is not available right now");
      }

      const productOptions = optionsByProduct.get(item.productId) || [];
      let option: CatalogOption | undefined;
      if (item.optionId) option = productOptions.find((row) => String(row.id) === item.optionId);
      if (!option) option = productOptions[item.optionIndex];

      let basePrice = Number(product.base_price || 0);
      let optionId = "";
      let optionName = "";
      if (option) {
        if (option.is_active === false || option.is_available === false) throw new Error("One of the selected options is not available right now");
        basePrice = Number(option.price || 0);
        optionId = String(option.id);
        optionName = displayName(option, "خيار");
      }

      if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("Invalid catalog price");
      const discount = effectiveDiscount(discounts, String(product.id), String(product.category_id));
      const amount = Math.max(0, Number(discount?.discount_amount || 0));
      const unitPrice = Math.max(0, Math.round(basePrice - amount));

      return {
        product_id: String(product.id),
        option_id: optionId,
        product_name: displayName(product, "منتج"),
        option_name: optionName,
        quantity: item.quantity,
        unit_price: unitPrice,
      };
    });

    const orderNumber = orderNumberFromToken(clientToken);
    const { data: rpcData, error: rpcError } = await admin.rpc("create_pasha_order", {
      p_customer: {
        phone_e164: phoneE164,
        name,
        address: orderType === "delivery" ? address : "",
        location_url: orderType === "delivery" ? locationUrl : "",
      },
      p_order: {
        client_token: clientToken,
        order_number: orderNumber,
        order_type: orderType,
        notes,
        delivery_fee: 0,
      },
      p_items: authoritativeItems,
    });

    if (rpcError) throw rpcError;
    const result = rpcData && typeof rpcData === "object" ? rpcData : {};
    return json(req, { ok: true, ...result }, 201);
  } catch (error) {
    console.error("PASHA ORDERS ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = /not available|invalid|required|exist|reference|quantity|catalog/i.test(message)
      ? message
      : "Could not save order";
    return json(req, { ok: false, error: safeMessage }, 400);
  }
});
