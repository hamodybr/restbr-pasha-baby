// Server-only S3 transport. Credentials never leave the Edge Function.
import { AwsClient } from "npm:aws4fetch@1.0.20";

export const MAX_IMAGE_BYTES = 700 * 1024;
export const MAX_CARD_BYTES = 150 * 1024;
// Decimal GB: leave room below the account-wide 10 GB allowance.
export const WARN_BYTES = 8_000_000_000;
export const STOP_BYTES = 9_000_000_000;
const TYPES = new Map([["image/webp", "webp"], ["image/jpeg", "jpg"], ["image/png", "png"], ["image/avif", "avif"]]);
const decodeXml = (s: string) => s.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const tag = (s: string, name: string) => decodeXml(s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] || "");

export function parseList(xml: string) {
  if (!xml.includes("<ListBucketResult") || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Invalid R2 listing response");
  const files = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(m => ({ key: tag(m[1], "Key"), size: Number(tag(m[1], "Size")) }));
  if (files.some(f => !f.key || !Number.isSafeInteger(f.size) || f.size < 0)) throw new Error("Invalid R2 object metadata");
  const next = tag(xml, "NextContinuationToken");
  if (tag(xml, "IsTruncated") === "true" && !next) throw new Error("Incomplete R2 listing");
  return { files, next };
}

export function imageExtension(bytes: Uint8Array, mime: string) {
  const ext = TYPES.get(mime);
  const ascii = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  const valid = mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === "image/png" ? bytes.slice(0, 8).join() === "137,80,78,71,13,10,26,10"
    : mime === "image/webp" ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
    : mime === "image/avif" ? ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 32)) : false;
  if (!ext || !valid) throw new Error("الصورة يجب أن تكون JPEG أو PNG أو WebP أو AVIF صالحة.");
  return ext;
}

export class R2Storage {
  endpoint: URL;
  bucket: string;
  publicBase: string;
  aws: AwsClient;
  constructor(env: (key: string) => string | undefined) {
    const get = (k: string) => { const v = env(k)?.trim(); if (!v) throw new Error(`Missing ${k}`); return v; };
    this.endpoint = new URL(get("R2_ENDPOINT"));
    if (this.endpoint.protocol !== "https:" || !/^[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(this.endpoint.hostname) || !["", "/"].includes(this.endpoint.pathname) || this.endpoint.search || this.endpoint.username || this.endpoint.password || this.endpoint.port) throw new Error("R2_ENDPOINT must be the S3 endpoint without the bucket name");
    this.bucket = get("R2_BUCKET");
    if (this.bucket !== "pasha-baby-images") throw new Error("Unexpected Pasha bucket");
    this.publicBase = get("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
    if (this.publicBase !== "https://images.pashababyiq.com") throw new Error("Unexpected Pasha image domain");
    this.aws = new AwsClient({ accessKeyId: get("R2_ACCESS_KEY_ID"), secretAccessKey: get("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto", retries: 0 });
  }
  async request(method: string, key = "", body?: Uint8Array, mime?: string, query?: URLSearchParams) {
    const url = new URL(`/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`, this.endpoint);
    if (query) url.search = query.toString();
    const headers: Record<string, string> = {};
    if (mime) { headers["Content-Type"] = mime; headers["Cache-Control"] = "public, max-age=31536000, immutable"; }
    const signed = await this.aws.sign(url.toString(), { method, body: body as BodyInit | undefined, headers });
    const response = await fetch(signed, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`R2 ${method} failed (HTTP ${response.status})`); }
    return response;
  }
  async usage() {
    let next = "", currentBytes = 0, fileCount = 0;
    const seen = new Set<string>();
    for (let page = 0; page < 1000; page++) {
      const query = new URLSearchParams({ "list-type": "2", "max-keys": "1000" });
      if (next) query.set("continuation-token", next);
      const listing = parseList(await (await this.request("GET", "", undefined, undefined, query)).text());
      for (const f of listing.files) { currentBytes += f.size; fileCount++; }
      next = listing.next;
      if (!next) return { currentBytes, fileCount, warnAtBytes: WARN_BYTES, hardStopBytes: STOP_BYTES, warning: currentBytes >= WARN_BYTES, blocked: currentBytes >= STOP_BYTES };
      if (seen.has(next)) throw new Error("Repeated R2 listing cursor");
      seen.add(next);
    }
    throw new Error("R2 listing exceeded safety page limit");
  }
  publicUrl(key: string) { return `${this.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`; }
  async put(key: string, bytes: Uint8Array, mime: string) { await (await this.request("PUT", key, bytes, mime)).body?.cancel(); }
  async remove(key: string) { await (await this.request("DELETE", key)).body?.cancel(); }
  async upload(file: File, card: File, id: string, color = false) {
    if (!/^[-a-zA-Z0-9_]{1,120}$/.test(id)) throw new Error("Invalid image owner ID");
    if (!file.size || file.size > MAX_IMAGE_BYTES || !card.size || card.size > MAX_CARD_BYTES || card.type !== "image/webp") throw new Error("الصورة أكبر من حد الرفع المسموح.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const cardBytes = new Uint8Array(await card.arrayBuffer());
    const ext = imageExtension(bytes, file.type);
    imageExtension(cardBytes, card.type);
    const usage = await this.usage();
    const projectedBytes = usage.currentBytes + bytes.length + cardBytes.length;
    if (projectedBytes >= STOP_BYTES) throw new Error("تم إيقاف الرفع قبل وصول صور هذا الـBucket إلى 9 GB.");
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
    const key = color ? `products/color-assets/${id}/${hash}.${ext}` : `products/${id}/${hash}.${ext}`;
    const cardKey = key.replace(/\.[^.]+$/, "-card.webp");
    // Publish the card first, so any returned main URL has its card available.
    await this.put(cardKey, cardBytes, "image/webp");
    await this.put(key, bytes, file.type);
    return { publicUrl: this.publicUrl(key), thumbnailUrl: this.publicUrl(cardKey), fileName: key, size: bytes.length, thumbnailSize: cardBytes.length, projectedBytes, warning: projectedBytes >= WARN_BYTES };
  }
}
