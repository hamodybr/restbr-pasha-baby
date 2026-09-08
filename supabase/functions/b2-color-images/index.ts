import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const B2_BUCKET_ID = "1d84e1a751897ddca4000717";
const B2_BUCKET_NAME = "pasha-baby-products";
const B2_PREFIX = "products/";
const COLOR_PREFIX = `${B2_PREFIX}color-assets/`;
const WARN_BYTES = 8 * 1024 * 1024 * 1024;
const HARD_STOP_BYTES = 9 * 1024 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 700 * 1024;
const AUTH_URL = "https://api.backblazeb2.com/b2api/v4/b2_authorize_account";
const ALLOWED_ORIGINS = new Set([
  "https://pashababyiq.com",
  "https://www.pashababyiq.com",
  "https://pashababy.restbr.com",
]);

type B2Auth = { token: string; apiUrl: string; downloadUrl: string };

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://pashababyiq.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pb-action",
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

async function fetchTimed(input: RequestInfo | URL, init: RequestInit = {}, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const basic = (value: string) => btoa(value);
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)]
  .map(byte => byte.toString(16).padStart(2, "0"))
  .join("");

async function requireMenuManager(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return false;

  const response = await fetchTimed(`${supabaseUrl}/rest/v1/rpc/can_manage_menu`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: auth, "Content-Type": "application/json" },
    body: "{}",
  }, 8000);
  if (!response.ok) return false;
  return (await response.json()) === true;
}

async function authorizeB2(): Promise<B2Auth> {
  const keyId = Deno.env.get("B2_KEY_ID") || "";
  const applicationKey = Deno.env.get("B2_APPLICATION_KEY") || "";
  if (!keyId || !applicationKey) throw new Error("B2 credentials are not configured");

  const response = await fetchTimed(AUTH_URL, {
    headers: { Authorization: `Basic ${basic(`${keyId}:${applicationKey}`)}` },
  }, 10000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `B2 authorization failed (${response.status})`);

  const storageApi = data?.apiInfo?.storageApi;
  if (!data?.authorizationToken || !storageApi?.apiUrl || !storageApi?.downloadUrl) {
    throw new Error("B2 authorization response is incomplete");
  }
  return {
    token: String(data.authorizationToken),
    apiUrl: String(storageApi.apiUrl),
    downloadUrl: String(storageApi.downloadUrl),
  };
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

async function getUploadTarget(auth: B2Auth) {
  const url = new URL(`${auth.apiUrl}/b2api/v4/b2_get_upload_url`);
  url.searchParams.set("bucketId", B2_BUCKET_ID);
  const response = await fetchTimed(url, { headers: { Authorization: auth.token } }, 12000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `B2 upload URL failed (${response.status})`);
  return { uploadUrl: String(data.uploadUrl || ""), uploadToken: String(data.authorizationToken || "") };
}

async function listVersions(auth: B2Auth, fileName: string) {
  const url = new URL(`${auth.apiUrl}/b2api/v4/b2_list_file_versions`);
  url.searchParams.set("bucketId", B2_BUCKET_ID);
  url.searchParams.set("prefix", fileName);
  url.searchParams.set("maxFileCount", "100");
  const response = await fetchTimed(url, { headers: { Authorization: auth.token } }, 10000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `B2 version list failed (${response.status})`);
  return (Array.isArray(data?.files) ? data.files : []).filter((item: any) => String(item?.fileName || "") === fileName);
}

async function deleteVersion(auth: B2Auth, fileName: string, fileId: string) {
  const response = await fetchTimed(`${auth.apiUrl}/b2api/v4/b2_delete_file_version`, {
    method: "POST",
    headers: { Authorization: auth.token, "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileId }),
  }, 10000);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || `B2 delete failed (${response.status})`);
  }
}

function validAssetKey(value: string) {
  return /^[-a-zA-Z0-9_]{12,120}$/.test(value);
}

async function uploadColorFile(auth: B2Auth, file: File, assetKey: string) {
  if (!validAssetKey(assetKey)) throw new Error("Invalid color asset key");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Only image uploads are allowed");
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("Optimized image must be 700KB or smaller");

  const files = await listCurrentFiles(auth);
  const currentBytes = files.reduce((sum, row) => sum + Math.max(0, Number(row?.contentLength || 0)), 0);
  const fileName = `${COLOR_PREFIX}${assetKey}`;
  const existing = files.find((row: any) => String(row?.fileName || "") === fileName);
  const existingBytes = Math.max(0, Number(existing?.contentLength || 0));
  const projectedBytes = currentBytes - existingBytes + file.size;
  if (projectedBytes >= HARD_STOP_BYTES) throw new Error("B2 safety limit reached: uploads stop before 9GB");

  const target = await getUploadTarget(auth);
  if (!target.uploadUrl || !target.uploadToken) throw new Error("B2 upload target is incomplete");
  const bytes = await file.arrayBuffer();
  const sha1 = hex(await crypto.subtle.digest("SHA-1", bytes));

  const response = await fetchTimed(target.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: target.uploadToken,
      "X-Bz-File-Name": encodeURIComponent(fileName),
      "X-Bz-Content-Sha1": sha1,
      "X-Bz-Info-b2-cache-control": encodeURIComponent("public, max-age=31536000, immutable"),
      "Content-Type": file.type || "application/octet-stream",
    },
    body: bytes,
  }, 25000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `B2 upload failed (${response.status})`);

  const fileId = String(data?.fileId || "");
  const versions = await listVersions(auth, fileName).catch(() => []);
  for (const version of versions) {
    const oldId = String(version?.fileId || "");
    if (!oldId || oldId === fileId) continue;
    await deleteVersion(auth, fileName, oldId).catch(() => {});
  }

  const encodedPath = fileName.split("/").map(encodeURIComponent).join("/");
  const versionQuery = fileId ? `?v=${encodeURIComponent(fileId)}` : `?v=${Date.now()}`;
  return {
    publicUrl: `${auth.downloadUrl}/file/${encodeURIComponent(B2_BUCKET_NAME)}/${encodedPath}${versionQuery}`,
    fileName,
    fileId,
    size: file.size,
    warning: projectedBytes >= WARN_BYTES,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    if (!(await requireMenuManager(req))) return json(req, { error: "Forbidden" }, 403);
    const action = req.headers.get("x-pb-action") || "upload";
    if (action !== "upload") return json(req, { error: "Unknown action" }, 400);

    const form = await req.formData();
    const file = form.get("file");
    const assetKey = String(form.get("assetKey") || "").trim();
    if (!(file instanceof File)) return json(req, { error: "Image file is required" }, 400);

    const auth = await authorizeB2();
    return json(req, await uploadColorFile(auth, file, assetKey));
  } catch (error) {
    console.error("B2 COLOR IMAGE GATEWAY ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message }, 500);
  }
});
