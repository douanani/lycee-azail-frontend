import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentProfile } from "./services";
import { getDashboardPath } from "./rolePaths";

const FLAG = "entry-redirect-done";

const readStoredRole = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user"))?.role || null;
  } catch {
    return null;
  }
};

const alreadyRedirected = () => {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};

const markRedirected = () => {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch (_) {}
};

/**
 * Wraps the home route ("/").
 *  - visitor / student            -> shows the home page (children)
 *  - admin / teacher / counselor / admin_staff / supervisor -> redirected to their own dashboard
 *
 * The redirect happens ONCE per browser session (when the person enters the site).
 * After that, clicking "الرئيسية" in the navbar shows the home page normally,
 * so staff can still browse the public pages.
 * NOTE: UX only — real protection is still RLS / useAuthGuard.
 */
export default function RoleRedirect({ children }) {
  // No stored user, or already redirected in this session => no need to wait for anything.
  const needsCheck = !!readStoredRole() && !alreadyRedirected();
  const [state, setState] = useState(needsCheck ? "checking" : "home");
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!needsCheck) return;
    let alive = true;
    getCurrentProfile()
      .then((p) => {
        if (!alive) return;
        markRedirected();
        const path = p ? getDashboardPath(p.role) : "/";
        if (path !== "/") {
          setTarget(path);
          setState("redirect");
        } else {
          setState("home"); // student, inactive account or no valid session
        }
      })
      .catch(() => alive && setState("home"));
    return () => {
      alive = false;
    };
  }, [needsCheck]);

  if (state === "checking") return null; // avoids a flash of the home page for staff
  if (state === "redirect") return <Navigate to={target} replace />;
  return children;
}
