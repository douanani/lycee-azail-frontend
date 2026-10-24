// Single source of truth: where each role lands after login / from the navbar.
export const ROLE_HOME = {
  admin:       "/admin",
  teacher:     "/teacher",
  counselor:   "/counselor",
  admin_staff: "/admin-staff",
  supervisor:  "/supervisor",
};

export const getDashboardPath = (role) => ROLE_HOME[role] || "/";
