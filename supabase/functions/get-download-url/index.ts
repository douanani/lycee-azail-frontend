import { fail, json, serveJson } from "../_shared/http.ts";
import { adminClient, anonClient } from "../_shared/auth.ts";
import { presign } from "../_shared/r2.ts";

serveJson(async (_req, body) => {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) fail(422, "id invalid");

  // Anonymous client: RLS only exposes published resources.
  const { data: r } = await anonClient()
    .from("resources")
    .select("id,external_url,file_key,file_name,title,file_type")
    .eq("id", id)
    .maybeSingle();
  if (!r) fail(404, "Not found");

  // Only service_role may execute this RPC.
  await adminClient().rpc("increment_download", { p_id: id });

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
