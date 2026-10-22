import { fail, json, serveJson } from "../_shared/http.ts";
import { adminClient, anonClient } from "../_shared/auth.ts";
import { presign } from "../_shared/r2.ts";

// Salted hash so raw IPs are never stored. Set with: supabase secrets set IP_HASH_SALT=<random string>
const SALT = Deno.env.get("IP_HASH_SALT") ?? "";

async function ipHash(req: Request): Promise<string> {
  // cf-connecting-ip is set by Cloudflare in front of Supabase and can't be forged by the client;
  // the client can prepend to X-Forwarded-For, so only its LAST entry (added by the proxy) is trusted.
  const xff = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  const ip = req.headers.get("cf-connecting-ip") ?? xff ?? "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${SALT}|${ip}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serveJson(async (req, body) => {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) fail(422, "id invalid");

  // Anonymous client: RLS only exposes published resources.
  const { data: r } = await anonClient()
    .from("resources")
    .select("id,external_url,file_key,file_name,title,file_type")
    .eq("id", id)
    .maybeSingle();
  if (!r) fail(404, "Not found");

  // Counts at most once per IP per hour. Only service_role may execute this RPC.
  // A counting failure must never block the download itself.
  const { error: countErr } = await adminClient().rpc("increment_download", {
    p_id: id,
    p_ip_hash: await ipHash(req),
  });
  if (countErr) console.error("increment_download", countErr.message);

  if (r!.external_url) return json({ url: r!.external_url, external: true });

  const base = (r!.file_name || r!.title || "file").replace(/[^\p{L}\p{N}._ -]/gu, "_");
  const ext = r!.file_key!.split(".").pop();
  const name = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
  const url = await presign("GET", r!.file_key!, 300, {
    query: {
      "response-content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
  return json({ url, external: false });
});
