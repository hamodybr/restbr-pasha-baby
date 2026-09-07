import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const B2_BUCKET_ID = "1d84e1a751897ddca4000717";
const B2_PREFIX = "products/";
const AUTH_URL = "https://api.backblazeb2.com/b2api/v4/b2_authorize_account";
const ALLOWED_ORIGIN = "https://pashababy.restbr.com";
const PAGE_SIZE = 1000;

function cors() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), "Content-Type": "application/json; charset=utf-8" }
  });
}

async function fetchTimed(input: RequestInfo | URL, init: RequestInit = {}, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`External request timed out after ${Math.round(ms / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const basic = (value: string) => btoa(value);

type B2Auth = { token: string; apiUrl: string };

async function requireMenuManager(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return false;

  const response = await fetchTimed(`${supabaseUrl}/rest/v1/rpc/can_manage_menu`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: auth, "Content-Type": "application/json" },
    body: "{}"
  }, 8000);
  if (!response.ok) return false;
  return (await response.json()) === true;
}

async function authorizeB2(): Promise<B2Auth> {
  const keyId = Deno.env.get("B2_KEY_ID") || "";
  const applicationKey = Deno.env.get("B2_APPLICATION_KEY") || "";
  if (!keyId || !applicationKey) throw new Error("B2 credentials are not configured");

  const response = await fetchTimed(AUTH_URL, {
    headers: { Authorization: `Basic ${basic(`${keyId}:${applicationKey}`)}` }
  }, 10000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `B2 authorization failed (${response.status})`);

  const storageApi = data?.apiInfo?.storageApi;
  if (!data?.authorizationToken || !storageApi?.apiUrl) {
    throw new Error("B2 authorization response is incomplete");
  }
  return { token: String(data.authorizationToken), apiUrl: String(storageApi.apiUrl) };
}

async function listCurrentFiles(auth: B2Auth) {
  const files: any[] = [];
  let startFileName = "";
  for (let page = 0; page < 1000; page += 1) {
    const url = new URL(`${auth.apiUrl}/b2api/v4/b2_list_file_names`);
    url.searchParams.set("bucketId", B2_BUCKET_ID);
    url.searchParams.set("prefix", B2_PREFIX);
    url.searchParams.set("maxFileCount", "10000");
    if (startFileName) url.searchParams.set("startFileName", startFileName);

    const response = await fetchTimed(url, { headers: { Authorization: auth.token } }, 12000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || `B2 list failed (${response.status})`);
    files.push(...(Array.isArray(data?.files) ? data.files : []));
    startFileName = String(data?.nextFileName || "");
    if (!startFileName) break;
  }
  return files;
}

async function listProductIds(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) throw new Error("Supabase runtime configuration is incomplete");

  const ids = new Set<string>();
  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    const response = await fetchTimed(`${supabaseUrl}/rest/v1/products?select=id&order=id.asc`, {
      headers: {
        apikey: anonKey,
        Authorization: auth,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        "Range-Unit": "items"
      }
    }, 10000);
    if (!response.ok && response.status !== 206) {
      const body = await response.text().catch(() => "");
      throw new Error(`Products lookup failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const rows = await response.json().catch(() => []);
    if (!Array.isArray(rows)) throw new Error("Products lookup returned an invalid payload");
    for (const row of rows) {
      const id = String(row?.id || "").trim();
      if (id) ids.add(id);
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return ids;
}

async function listVersions(auth: B2Auth, fileName: string) {
  const versions: any[] = [];
  let startFileName = "";
  let startFileId = "";

  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`${auth.apiUrl}/b2api/v4/b2_list_file_versions`);
    url.searchParams.set("bucketId", B2_BUCKET_ID);
    url.searchParams.set("prefix", fileName);
    url.searchParams.set("maxFileCount", "1000");
    if (startFileName) url.searchParams.set("startFileName", startFileName);
    if (startFileId) url.searchParams.set("startFileId", startFileId);

    const response = await fetchTimed(url, { headers: { Authorization: auth.token } }, 10000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || `B2 version list failed (${response.status})`);

    const batch = Array.isArray(data?.files) ? data.files : [];
    versions.push(...batch.filter((item: any) => String(item?.fileName || "") === fileName));
    startFileName = String(data?.nextFileName || "");
    startFileId = String(data?.nextFileId || "");
    if (!startFileName) break;
  }

  return versions;
}

async function deleteVersion(auth: B2Auth, fileName: string, fileId: string) {
  const response = await fetchTimed(`${auth.apiUrl}/b2api/v4/b2_delete_file_version`, {
    method: "POST",
    headers: { Authorization: auth.token, "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileId })
  }, 10000);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || `B2 delete failed (${response.status})`);
  }
}

function productIdFromFileName(fileName: string) {
  const match = String(fileName || "").match(/^products\/([^/]+)\/main$/);
  return match ? match[1] : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!(await requireMenuManager(req))) return json({ error: "Forbidden" }, 403);

    const [auth, productIds] = await Promise.all([authorizeB2(), listProductIds(req)]);
    const files = await listCurrentFiles(auth);
    const orphanFiles = files.filter(file => {
      const productId = productIdFromFileName(String(file?.fileName || ""));
      return productId && !productIds.has(productId);
    });

    let deletedVersions = 0;
    for (const file of orphanFiles) {
      const fileName = String(file?.fileName || "");
      const versions = await listVersions(auth, fileName);
      for (const version of versions) {
        const fileId = String(version?.fileId || "");
        if (!fileId) continue;
        await deleteVersion(auth, fileName, fileId);
        deletedVersions += 1;
      }
    }

    const remainingFiles = orphanFiles.length
      ? await listCurrentFiles(auth)
      : files;
    const currentBytes = remainingFiles.reduce(
      (sum, file) => sum + Math.max(0, Number(file?.contentLength || 0)),
      0
    );

    return json({
      ok: true,
      scannedFiles: files.length,
      deletedFiles: orphanFiles.length,
      deletedVersions,
      fileCount: remainingFiles.length,
      currentBytes
    });
  } catch (error) {
    console.error("B2 CLEANUP ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, /timed out/i.test(message) ? 504 : 500);
  }
});
