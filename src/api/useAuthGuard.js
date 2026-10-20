import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentProfile } from "./services";
import { supabase } from "./supabase";

/**
 * Protects a dashboard route. Redirects to /auth when there is no active session
 * or the role is not allowed. Returns the profile (null while loading).
 * NOTE: this is UX only — the real protection is RLS / Edge Functions.
 */
export default function useAuthGuard(allowedRoles) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const key = allowedRoles.join(",");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const p = await getCurrentProfile();
      if (!alive) return;
      if (!p || !key.split(",").includes(p.role)) {
        navigate("/auth", { replace: true });
        return;
      }
      setProfile(p);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/auth", { replace: true });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [key, navigate]);

  return profile;
}
