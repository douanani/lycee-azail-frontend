import { AwsClient } from "npm:aws4fetch@1";

const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
const bucket = Deno.env.get("R2_BUCKET")!;

const client = new AwsClient({
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  service: "s3",
  region: "auto",
});

function objectUrl(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${path}`;
}

/** Presigned URL (query-string signature). */
export async function presign(
  method: "GET" | "PUT",
  key: string,
  expiresSeconds: number,
  opts: { headers?: Record<string, string>; query?: Record<string, string> } = {},
): Promise<string> {
  const u = new URL(objectUrl(key));
  u.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v);
  const signed = await client.sign(
    new Request(u.toString(), { method, headers: opts.headers }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const res = await client.fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}
