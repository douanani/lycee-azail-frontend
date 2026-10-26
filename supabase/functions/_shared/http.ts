// Shared HTTP helpers: CORS, JSON responses, and a wrapper that turns thrown Responses into replies.
import { AsyncLocalStorage } from "node:async_hooks";

// ALLOWED_ORIGIN: one origin, or a comma-separated list, e.g.
//   https://lycee-azail.vercel.app,http://localhost:3000     ("*" allows any origin)
// The request's Origin is echoed back only when it is in the list; otherwise the first entry is sent
// (the browser then blocks it). CORS isn't the auth boundary here: every function checks the JWT itself.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGIN") ?? "*").split(/[\s,]+/).filter(Boolean);
const currentOrigin = new AsyncLocalStorage<string | null>();

function allowOrigin(): string {
  if (ALLOWED.length === 0 || ALLOWED.includes("*")) return "*";
  const o = currentOrigin.getStore();
  return o && ALLOWED.includes(o) ? o : ALLOWED[0];
}

// Getter so each response picks the origin of the request being served (spread `{...corsHeaders}` evaluates it).
export const corsHeaders = {
  get "Access-Control-Allow-Origin"() {
    return allowOrigin();
  },
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
  Deno.serve((req) =>
    currentOrigin.run(req.headers.get("Origin"), async () => {
      if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders } });
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
    })
  );
}