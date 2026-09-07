import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const B2_BUCKET_ID = "1d84e1a751897ddca4000717";
const B2_BUCKET_NAME = "pasha-baby-products";
const B2_PREFIX = "products/";
const WARN_BYTES = 8 * 1024 * 1024 * 1024;
const HARD_STOP_BYTES = 9 * 1024 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 700 * 1024;
const AUTH_URL = "https://api.backblazeb2.com/b2api/v4/b2_authorize_account";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://pashababy.restbr.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pb-action",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Cache-Control": "no-store"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
});

const encodeBasic = (value: string) => btoa(value);
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)]
  .map(byte => byte.toString(16).padStart(2, "0"))
  .join("");

async function requireMenuManager(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/can_manage_menu`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: auth,
      "Content-Type": "application/json"
    },
    body: "{}"
  });

  if (!response.ok) return false;
  return (await response.json()) === true;
}

async function authorizeB2() {
  const keyId = Deno.env.get("B2_KEY_ID") || "";
  const applicationKey = Deno.env.get("B2_APPLICATION_KEY") || "";
  if (!keyId || !applicationKey) throw new Error("B2 credentials are not configured");

  const response = await fetch(AUTH_URL, {
    method: "GET",
    headers: { Authorization: `Basic ${encodeBasic(`${keyId}:${applicationKey}`)}` }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `B2 authorization failed (${response.status})`);

  const storageApi = data?.apiInfo?.storageApi;
  if (!storageApi?.apiUrl || !storageApi?.downloadUrl) {
    throw new Error("B2 storage API details are missing");
  }

  return {
    token: String(data.authorizationToken || ""),
    apiUrl: String(storageApi.apiUrl),
    downloadUrl: String(storageApi.downloadUrl)
  };
}

async function listCurrentFiles(auth: Awaited<ReturnType<typeof authorizeB2>>) {
  const files: any[] = [];
  let startFileName = "";

  for (let page = 0; page < 1000; page += 1) {
    const url = new URL(`${auth.apiUrl}/b2api/v4/b2_list_file_names`);
    url.searchParams.set("bucketId", B2_BUCKET_ID);
    url.searchParams.set("prefix", B2_PREFIX);
    url.searchParams.set("maxFileCount", "10000");
    if (startFileName) url.searchParams.set("startFileName", startFileName);

    const response = await fetch(url, {
      headers: { Authorization: auth.token }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || `B2 list failed (${response.status})`);

    files.push(...(Array.isArray(data?.files) ? data.files : []));
    startFileName = String(data?.nextFileName || "");
    if (!startFileName) break;
  }

  return files;
}

async function getUsage(auth: Awaited<ReturnType<typeof authorizeB2>>) {
  const files = await listCurrentFiles(auth);
  const currentBytes = files.reduce((sum, file) => sum + Math.max(0, Number(file?.contentLength || 0)), 0);
  return {
    currentBytes,
    fileCount: files.length,
    warnAtBytes: WARN_BYTES,
    hardStopBytes: HARD_STOP_BYTES,
    warning: currentBytes >= WARN_BYTES,
    blocked: currentBytes >= HARD_STOP_BYTES
  };
}

async function getUploadTarget(auth: Awaited<ReturnType<typeof authorizeB2>>) {
  const response = await fetch(`${auth.apiUrl}/b2api/v4/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `B2 upload URL failed (${response.status})`);
  return {
    uploadUrl: String(data.uploadUrl || ""),
    uploadToken: String(data.authorizationToken || "")
  };
}

async function listVersions(auth: Awaited<ReturnType<typeof authorizeB2>>, fileName: string) {
  const url = new URL(`${auth.apiUrl}/b2api/v4/b2_list_file_versions`);
  url.searchParams.set("bucketId", B2_BUCKET_ID);
  url.searchParams.set("prefix", fileName);
  url.searchParams.set("maxFileCount", "100");

  const response = await fetch(url, { headers: { Authorization: auth.token } });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `B2 version list failed (${response.status})`);
  return (Array.isArray(data?.files) ? data.files : []).filter((item: any) => String(item?.fileName || "") === fileName);
}

async function deleteVersion(auth: Awaited<ReturnType<typeof authorizeB2>>, fileName: string, fileId: string) {
  const response = await fetch(`${auth.apiUrl}/b2api/v4/b2_delete_file_version`, {
    method: "POST",
    headers: {
      Authorization: auth.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fileName, fileId })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || `B2 delete failed (${response.status})`);
  }
}

async function cleanupOlderVersions(auth: Awaited<ReturnType<typeof authorizeB2>>, fileName: string, keepFileId: string) {
  const versions = await listVersions(auth, fileName);
  for (const version of versions) {
    const fileId = String(version?.fileId || "");
    if (!fileId || fileId === keepFileId) continue;
    await deleteVersion(auth, fileName, fileId);
  }
}

async function uploadFile(auth: Awaited<ReturnType<typeof authorizeB2>>, file: File, productId: string) {
  if (!/^[-a-zA-Z0-9_]{1,120}$/.test(productId)) throw new Error("Invalid product ID");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Only image uploads are allowed");
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Optimized image must be 700KB or smaller (received ${file.size} bytes)`);
  }

  const usage = await getUsage(auth);
  const fileName = `${B2_PREFIX}${productId}/main`;
  const existing = (await listCurrentFiles(auth)).find((item: any) => String(item?.fileName || "") === fileName);
  const existingBytes = Math.max(0, Number(existing?.contentLength || 0));
  const projectedBytes = usage.currentBytes - existingBytes + file.size;

  if (projectedBytes >= HARD_STOP_BYTES) {
    throw new Error("B2 safety limit reached: uploads stop before 9GB");
  }

  const target = await getUploadTarget(auth);
  const bytes = await file.arrayBuffer();
  const sha1 = hex(await crypto.subtle.digest("SHA-1", bytes));

  const response = await fetch(target.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: target.uploadToken,
      "X-Bz-File-Name": encodeURIComponent(fileName),
      "X-Bz-Content-Sha1": sha1,
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: bytes
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `B2 upload failed (${response.status})`);

  const fileId = String(data?.fileId || "");
  if (fileId) await cleanupOlderVersions(auth, fileName, fileId);

  const encodedPath = fileName.split("/").map(encodeURIComponent).join("/");
  return {
    publicUrl: `${auth.downloadUrl}/file/${encodeURIComponent(B2_BUCKET_NAME)}/${encodedPath}`,
    fileName,
    fileId,
    size: file.size,
    projectedBytes,
    warning: projectedBytes >= WARN_BYTES
  };
}

async function deleteProductFile(auth: Awaited<ReturnType<typeof authorizeB2>>, productId: string) {
  if (!/^[-a-zA-Z0-9_]{1,120}$/.test(productId)) throw new Error("Invalid product ID");
  const fileName = `${B2_PREFIX}${productId}/main`;
  const versions = await listVersions(auth, fileName);
  for (const version of versions) {
    const fileId = String(version?.fileId || "");
    if (fileId) await deleteVersion(auth, fileName, fileId);
  }
  return { deleted: versions.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    if (!(await requireMenuManager(req))) return json({ error: "Forbidden" }, 403);

    const auth = await authorizeB2();
    const url = new URL(req.url);
    const action = req.headers.get("x-pb-action") || url.searchParams.get("action") || "usage";

    if (action === "usage") return json(await getUsage(auth));

    if (action === "upload") {
      const form = await req.formData();
      const file = form.get("file");
      const productId = String(form.get("productId") || "").trim();
      if (!(file instanceof File)) return json({ error: "Image file is required" }, 400);
      return json(await uploadFile(auth, file, productId));
    }

    if (action === "delete") {
      const body = await req.json().catch(() => ({}));
      const productId = String(body?.productId || "").trim();
      return json(await deleteProductFile(auth, productId));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("B2 IMAGE GATEWAY ERROR", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
