import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { fail } from "./http.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type Role = "admin" | "teacher" | "counselor" | "admin_staff" | "supervisor";

export interface Caller {
  id: string;
  role: Role;
  /** Client acting AS the caller: RLS applies. */
  db: SupabaseClient;
}

/** Verifies the JWT, loads the profile, checks is_active and role. */
export async function requireUser(req: Request, roles?: Role[]): Promise<Caller> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) fail(401, "Unauthorized");

  const db = createClient(URL_, ANON, {
    global: { headers: { Authorization: authHeader! } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) fail(401, "Unauthorized");

  const { data: profile } = await db
    .from("profiles")
    .select("role,is_active")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || !profile.is_active) fail(403, "Account inactive");
  if (roles && !roles.includes(profile!.role as Role)) fail(403, "Forbidden");

  return { id: user!.id, role: profile!.role as Role, db };
}

/** Service-role client: bypasses RLS. Use only after requireUser(). */
export function adminClient(): SupabaseClient {
  return createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Anonymous client (RLS as anon). */
export function anonClient(): SupabaseClient {
  return createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}
