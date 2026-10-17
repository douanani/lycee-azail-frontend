// Shared HTTP helpers: CORS, JSON responses, and a wrapper that turns thrown Responses into replies.
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(status: number, message: string): never {
  throw json({ error: message }, status);
}

export function serveJson(handler: (req: Request, body: any) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      return await handler(req, body);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return json({ error: "Internal error" }, 500);
    }
  });
}
