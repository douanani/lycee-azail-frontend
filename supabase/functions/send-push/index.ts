// Called by a Supabase Database Webhook on INSERT into public.notifications.
// Sends a Web Push to every subscription of the notification's recipient.
import webpush from "npm:web-push@3.6.7";
import { adminClient } from "../_shared/auth.ts";
import { fail, json, serveJson } from "../_shared/http.ts";

const SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,          // e.g. mailto:you@example.com
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

serveJson(async (req, body) => {
  if (!SECRET || !safeEqual(req.headers.get("x-webhook-secret") ?? "", SECRET)) fail(401, "Unauthorized");
  if (body.type !== "INSERT" || body.table !== "notifications" || !body.record) return json({ skipped: true });

  const n = body.record as { user_id: string; type: string; data: Record<string, any> };
  const db = adminClient();
  const { data: subs, error } = await db
    .from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", n.user_id);
  if (error) throw error;
  if (!subs?.length) return json({ sent: 0 });

  const payload = JSON.stringify({
    title: n.type === "announcement" ? "إعلان جديد" : "إشعار جديد",
    body: n.data?.title || n.data?.message || "",
    url: "/teacher",
    tag: n.data?.announcement_id ? `ann-${n.data.announcement_id}` : undefined,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint); // unsubscribed / expired
      else console.error("push failed", e?.statusCode, e?.body);
    }
  }));
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return json({ sent, removed: dead.length });
});