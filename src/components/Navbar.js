// components/Navbar.js
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { SCHOOL_NAME } from "../Data/constants";
import { BI } from "../Utils/icons";
import { logout, getCurrentProfile } from "../api/services";

function getDashboardPath(role) {
  const paths = {
    admin:       "/admin",
    teacher:     "/teacher",
    counselor:   "/counselor",
    admin_staff: "/admin-staff",
    supervisor:  "/supervisor",
  };
  return paths[role] || "/dashboard";
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

const STYLES = `
  @keyframes nb-spin { to { transform: rotate(360deg); } }
  @keyframes nb-fadeIn {
    from { opacity: 0; transform: translateY(-6px) scale(.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes nb-fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes nb-dot-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-3px); }
  }

  /* ─── Desktop nav links ─── */
  .nb-link-item {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px;
    font-size: 0.9rem; font-weight: 500; color: rgba(255,255,255,.75);
    text-decoration: none; white-space: nowrap; position: relative;
    transition: background .25s, color .25s, transform .2s;
  }
  .nb-link-item:hover {
    background: rgba(59,130,246,.15);
    color: #fff;
    transform: translateY(-2px);
  }
  .nb-link-item.active {
    background: linear-gradient(135deg,#1d4ed8,#3b82f6);
    color: #fff; font-weight: 700;
  }
  .nb-link-item.active::after {
    content: ''; position: absolute; bottom: 3px;
    left: 50%; transform: translateX(-50%);
    width: 24px; height: 3px; border-radius: 3px;
    background: linear-gradient(90deg,#93c5fd,#fff);
  }

  .nb-link-item.dashboard-link {
    background: rgba(99,102,241,.12);
    border: 1px solid rgba(99,102,241,.25);
    color: #a5b4fc;
  }
  .nb-link-item.dashboard-link:hover {
    background: rgba(99,102,241,.25);
    border-color: rgba(99,102,241,.45);
    color: #c7d2fe;
  }
  .nb-link-item.dashboard-link.active {
    background: linear-gradient(135deg,#4338ca,#6366f1);
    border-color: transparent;
    color: #fff;
  }

  .nb-avatar-btn {
    display: flex; align-items: center; gap: 8px;
    background: none; border: none; cursor: pointer; padding: 2px;
    border-radius: 24px;
    transition: background .2s;
  }
  .nb-avatar-btn:hover { background: rgba(255,255,255,.07); }

  .nb-avatar-circle {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg,#1d4ed8,#3b82f6);
    border: 2px solid rgba(59,130,246,.45);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
    transition: box-shadow .2s, border-color .2s;
  }
  .nb-avatar-btn:hover .nb-avatar-circle,
  .nb-avatar-open .nb-avatar-circle {
    box-shadow: 0 0 0 3px rgba(59,130,246,.35);
    border-color: rgba(59,130,246,.7);
  }

  .nb-avatar-chevron {
    font-size: 1rem; color: rgba(255,255,255,.55);
    transition: transform .25s;
  }
  .nb-avatar-open .nb-avatar-chevron { transform: rotate(180deg); }

  .nb-dropdown {
    position: absolute; top: calc(100% + 10px); left: 0;
    min-width: 210px;
    background: #1e293b;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 14px;
    padding: 8px;
    box-shadow: 0 10px 36px rgba(0,0,0,.45);
    z-index: 1100;
    animation: nb-fadeIn .18s ease both;
  }

  .nb-dropdown-header {
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    margin-bottom: 6px;
  }
  .nb-dropdown-label {
    font-size: 0.72rem; color: rgba(255,255,255,.35); margin-bottom: 2px;
  }
  .nb-dropdown-name {
    font-size: 0.9rem; font-weight: 700; color: #fff;
  }

  .nb-dropdown-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 9px 12px; border-radius: 9px;
    background: none; border: none; cursor: pointer;
    font-family: 'Cairo','Tajawal',sans-serif;
    font-size: 0.85rem; text-align: right;
    transition: background .2s;
    color: rgba(255,255,255,.75);
  }
  .nb-dropdown-item:hover { background: rgba(59,130,246,.16); color: #fff; }
  .nb-dropdown-item.danger { color: #fca5a5; }
  .nb-dropdown-item.danger:hover { background: rgba(239,68,68,.14); color: #fca5a5; }
  .nb-dropdown-item i { font-size: 1rem; opacity: .65; }
  .nb-dropdown-item.danger i { opacity: 1; color: #fca5a5; }

  /* ─── Mobile bottom nav bar ─── */
  .nb-bottom-bar {
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 1050;
    background: linear-gradient(180deg, #0d1b2e 0%, #0f172a 100%);
    border-top: 1px solid rgba(255,255,255,.08);
    padding: 0;
    height: 64px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 -4px 24px rgba(0,0,0,.35);
    font-family: 'Cairo','Tajawal','Noto Sans Arabic',sans-serif;
  }

  .nb-bottom-inner {
    display: flex;
    align-items: stretch;
    height: 100%;
    max-width: 600px;
    margin: 0 auto;
    position: relative;
  }

  /* side tabs */
  .nb-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 4px 10px;
    color: rgba(255,255,255,.45);
    text-decoration: none;
    transition: color .2s;
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  .nb-tab:active { transform: scale(0.92); }
  .nb-tab.active { color: #3b82f6; }
  .nb-tab.active .nb-tab-dot {
    opacity: 1;
    animation: nb-dot-bounce .4s ease;
  }

  .nb-tab i { font-size: 1.25rem; line-height: 1; }
  .nb-tab span {
    font-size: 0.6rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  .nb-tab-dot {
    position: absolute;
    bottom: 6px;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #3b82f6;
    opacity: 0;
    transition: opacity .2s;
  }

  /* ─── Home center button ─── */
  .nb-home-wrap {
    flex: 0 0 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .nb-home-btn {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
    border: 3px solid #0f172a;
    box-shadow: 0 4px 20px rgba(59,130,246,.55), 0 0 0 1px rgba(59,130,246,.3);
    display: flex; align-items: center; justify-content: center;
    color: white;
    cursor: pointer;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform .18s, box-shadow .18s;
    margin-bottom: 12px; /* lifts above bar */
    position: relative;
    z-index: 2;
  }
  .nb-home-btn:active {
    transform: scale(0.9);
    box-shadow: 0 2px 10px rgba(59,130,246,.4);
  }
  .nb-home-btn.active {
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    box-shadow: 0 4px 24px rgba(37,99,235,.7), 0 0 0 2px rgba(59,130,246,.5);
  }
  .nb-home-btn i { font-size: 1.5rem; }

  /* Home label below */
  .nb-home-label {
    position: absolute;
    bottom: 6px;
    left: 50%; transform: translateX(-50%);
    font-size: 0.58rem;
    font-weight: 700;
    color: rgba(255,255,255,.5);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .nb-home-btn.active ~ .nb-home-label { color: #93c5fd; }

  /* ─── More panel (slide up) ─── */
  .nb-more-panel {
    position: fixed;
    bottom: 64px; left: 0; right: 0;
    background: #1e293b;
    border-top: 1px solid rgba(255,255,255,.1);
    border-radius: 20px 20px 0 0;
    padding: 16px 16px 8px;
    z-index: 1040;
    box-shadow: 0 -8px 32px rgba(0,0,0,.4);
    animation: nb-fadeInUp .22s ease both;
    font-family: 'Cairo','Tajawal','Noto Sans Arabic',sans-serif;
  }
  .nb-more-panel-handle {
    width: 36px; height: 4px; border-radius: 4px;
    background: rgba(255,255,255,.2);
    margin: 0 auto 14px;
  }
  .nb-more-panel-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .nb-more-item {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 6px;
    border-radius: 14px;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.06);
    color: rgba(255,255,255,.75);
    text-decoration: none;
    font-size: 0.7rem; font-weight: 600;
    transition: background .2s, transform .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .nb-more-item:active { transform: scale(0.94); }
  .nb-more-item.active { background: rgba(59,130,246,.18); color: #93c5fd; border-color: rgba(59,130,246,.3); }
  .nb-more-item i { font-size: 1.4rem; }

  /* auth row in more panel */
  .nb-more-auth {
    border-top: 1px solid rgba(255,255,255,.07);
    padding-top: 12px;
    display: flex; gap: 10px;
  }
  .nb-more-auth-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px 16px; border-radius: 12px; border: none; cursor: pointer;
    font-family: 'Cairo','Tajawal',sans-serif;
    font-size: 0.82rem; font-weight: 700;
    transition: all .2s;
    -webkit-tap-highlight-color: transparent;
  }
  .nb-more-auth-btn.login {
    background: linear-gradient(135deg, #1d4ed8, #3b82f6);
    color: white;
    box-shadow: 0 4px 12px rgba(59,130,246,.3);
  }
  .nb-more-auth-btn.logout {
    background: rgba(239,68,68,.14);
    color: #fca5a5;
    border: 1px solid rgba(239,68,68,.2);
  }
  .nb-more-auth-btn:active { transform: scale(0.97); }

  .nb-more-user-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 12px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    margin-bottom: 10px;
  }
  .nb-more-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg,#1d4ed8,#3b82f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;
  }
  .nb-more-user-name { color: white; font-weight: 700; font-size: 0.85rem; }
  .nb-more-user-role { color: rgba(255,255,255,.4); font-size: 0.7rem; }

  /* overlay behind more panel */
  .nb-more-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 1039;
    backdrop-filter: blur(2px);
    animation: nb-fadeIn .2s ease both;
  }

  /* body padding so content doesn't hide behind bottom bar on mobile */
  @media (max-width: 991.98px) {
    .nb-bottom-bar { display: flex !important; }
    body { padding-bottom: 64px; }
  }
`;

// Bottom nav tab definitions (excluding home, which is center)
const BOTTOM_TABS_LEFT  = [
  { id: "lessons",   label: "الدروس",    icon: "bi-journal-bookmark-fill", path: "/lessons" },
  { id: "exams",     label: "الفروض",    icon: "bi-clipboard-data-fill",   path: "/exams" },
];
const BOTTOM_TABS_RIGHT = [
  { id: "timetable", label: "الجدول",    icon: "bi-clock-fill",            path: "/timetable" },
  { id: "contact",   label: "اتصل بنا",  icon: "bi-telephone-fill",        path: "/contact" },
];

// All links that appear in the "more" panel
const MORE_LINKS = [
  { id: "activities", label: "النشاطات",     icon: "bi-calendar-event-fill",   path: "/activities" },
];

const ROLE_LABEL = {
  admin:       "مدير النظام",
  teacher:     "أستاذ",
  counselor:   "مستشار التوجيه",
  admin_staff: "الإدارة",
  supervisor:  "مستشار التربية",
};

export default function Navbar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const dropRef   = useRef(null);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auth_user")) || null; }
    catch { return null; }
  });
  const [loggingOut,    setLoggingOut]    = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [morePanelOpen, setMorePanelOpen] = useState(false);

  const NAV_LINKS = [
    { id: "home",      label: "الرئيسية",      icon: "bi-house-fill",            path: "/" },
    ...(user ? [{
      id:    "dashboard",
      label: "لوحة التحكم",
      icon:  "bi-speedometer2",
      path:  getDashboardPath(user.role),
    }] : []),
    { id: "lessons",    label: "الدروس",         icon: "bi-journal-bookmark-fill", path: "/lessons" },
    { id: "exams",      label: "فروض وامتحانات", icon: "bi-clipboard-data-fill",   path: "/exams" },
    { id: "activities", label: "النشاطات",       icon: "bi-calendar-event-fill",   path: "/activities" },
    { id: "timetable",  label: "استعمال الزمن",  icon: "bi-clock-fill",            path: "/timetable" },
    { id: "contact",    label: "اتصل بنا",       icon: "bi-telephone-fill",        path: "/contact" },
  ];

  useEffect(() => {
    const sync = () => {
      try { setUser(JSON.parse(localStorage.getItem("auth_user")) || null); }
      catch { setUser(null); }
    };
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, [location]);

    useEffect(() => {
    getCurrentProfile().then((p) => {
      if (!p) {
        try { localStorage.removeItem("auth_user"); } catch {}
        setUser(null);
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    setDropdownOpen(false);
    setMorePanelOpen(false);
    const navbarEl = document.getElementById("navbarNav");
    if (navbarEl?.classList.contains("show")) {
      const { Collapse } = window.bootstrap || {};
      Collapse
        ? Collapse.getOrCreateInstance(navbarEl).hide()
        : navbarEl.classList.remove("show");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

   const handleLogout = async () => {
    setLoggingOut(true);
    setDropdownOpen(false);
    try {
      await logout();
    } catch {}
    finally {
      setUser(null);
      setLoggingOut(false);
      navigate("/");
    }
  };
  const isActive = (path, id) =>
    location.pathname === path ||
    (id === "dashboard" && location.pathname.startsWith(path));

  const homeActive = location.pathname === "/";

  return (
    <>
      <style>{STYLES}</style>

      {/* ════════════════════════════════════════════
          DESKTOP / TABLET  — top navbar (unchanged)
          ════════════════════════════════════════════ */}
      <nav
        className="navbar navbar-expand-lg navbar-dark sticky-top"
        style={{
          background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(10px)",
          fontFamily: "'Cairo','Tajawal','Noto Sans Arabic',sans-serif",
          zIndex: 1000,
        }}
      >
        <div
          className="container py-2"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
        >
          {/* ══ الشعار ══ */}
          <Link
            to="/"
            className="navbar-brand d-flex align-items-center gap-2 flex-shrink-0"
            style={{ textDecoration: "none", transition: "opacity .2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = ".85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <div style={{
              width: "40px", height: "40px", borderRadius: "11px", flexShrink: 0,
              background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(59,130,246,.32)",
            }}>
              <BI icon="bi-building" marginEnd="me-0" style={{ fontSize: "1.3rem", color: "white" }} />
            </div>
            <div>
              <div style={{
                fontSize: "1.1rem", fontWeight: "700", lineHeight: "1.2",
                background: "linear-gradient(135deg,#fff 0%,#93c5fd 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                {SCHOOL_NAME}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                مديرية التربية لولاية تلمسان
              </div>
            </div>
          </Link>

          {/* ══ زر القائمة (موبايل bootstrap — hidden, we use bottom bar instead) ══ */}
          <button
            className="navbar-toggler border-0 d-lg-none ms-auto"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-label="Toggle navigation"
            style={{ display: "none" }} /* hidden — bottom bar handles mobile nav */
          >
            <span className="navbar-toggler-icon" />
          </button>

          {/* ══ الروابط + Auth (desktop only) ══ */}
          <div className="collapse navbar-collapse d-none d-lg-block" id="navbarNav" style={{ flexGrow: 0 }}>
            <div
              className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center"
              style={{ gap: "8px", width: "100%" }}
            >
              <ul className="navbar-nav flex-row flex-wrap gap-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <Link
                      to={link.path}
                      className={[
                        "nb-link-item",
                        link.id === "dashboard" ? "dashboard-link" : "",
                        isActive(link.path, link.id) ? "active" : "",
                      ].join(" ").trim()}
                    >
                      <BI icon={link.icon} marginEnd="me-0" style={{ fontSize: "1rem" }} />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="d-none d-lg-block flex-shrink-0"
                style={{ width: "1px", height: "30px", background: "rgba(255,255,255,.1)", margin: "0 4px" }}
              />

              {/* Auth */}
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {user ? (
                  <div ref={dropRef} style={{ position: "relative" }}>
                    <button
                      className={`nb-avatar-btn${dropdownOpen ? " nb-avatar-open" : ""}`}
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-label="قائمة المستخدم"
                      aria-expanded={dropdownOpen}
                    >
                      <div className="nb-avatar-circle">{getInitials(user.name)}</div>
                      <BI
                        icon="bi-chevron-down"
                        marginEnd="me-0"
                        className="nb-avatar-chevron d-none d-lg-block"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </button>

                    {dropdownOpen && (
                      <div className="nb-dropdown">
                        <div className="nb-dropdown-header">
                          <div className="nb-dropdown-label">مسجّل الدخول كـ</div>
                          <div className="nb-dropdown-name">{user.name}</div>
                        </div>
                        <button
                          className="nb-dropdown-item"
                          onClick={() => { setDropdownOpen(false); navigate("/account"); }}
                        >
                          <BI icon="bi-gear-fill" marginEnd="me-0" style={{ fontSize: "1rem" }} />
                          <span>إعدادات الحساب</span>
                        </button>
                        <button
                          className="nb-dropdown-item danger"
                          onClick={handleLogout}
                          disabled={loggingOut}
                        >
                          {loggingOut ? (
                            <>
                              <span style={{
                                width: "13px", height: "13px",
                                border: "2px solid rgba(252,165,165,.3)",
                                borderTopColor: "#fca5a5", borderRadius: "50%",
                                animation: "nb-spin .7s linear infinite",
                                display: "inline-block", flexShrink: 0,
                              }} />
                              <span>جاري الخروج...</span>
                            </>
                          ) : (
                            <>
                              <BI icon="bi-box-arrow-right" marginEnd="me-0" style={{ fontSize: "1rem" }} />
                              <span>تسجيل الخروج</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/auth")}
                    style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      padding: "8px 18px", borderRadius: "20px",
                      fontFamily: "'Cairo','Tajawal',sans-serif",
                      fontSize: "0.88rem", fontWeight: "600",
                      cursor: "pointer", border: "1px solid rgba(255,255,255,.22)",
                      background: "rgba(59,130,246,.14)", color: "#fff",
                      transition: "background .25s, box-shadow .25s, transform .2s",
                    }}
                  >
                    <BI icon="bi-box-arrow-in-right" marginEnd="me-0" style={{ fontSize: "1rem" }} />
                    <span>تسجيل الدخول</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          MOBILE — bottom tab bar
          ════════════════════════════════════════════ */}
      <div className="nb-bottom-bar">
        <div className="nb-bottom-inner">

          {/* LEFT TABS */}
          {BOTTOM_TABS_LEFT.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`nb-tab${isActive(tab.path, tab.id) ? " active" : ""}`}
            >
              <i className={`bi ${tab.icon}`}></i>
              <span>{tab.label}</span>
              <span className="nb-tab-dot"></span>
            </Link>
          ))}

          {/* CENTER HOME BUTTON */}
          <div className="nb-home-wrap">
            <Link
              to="/"
              className={`nb-home-btn${homeActive ? " active" : ""}`}
              aria-label="الرئيسية"
            >
              <i className="bi bi-house-fill"></i>
            </Link>
            <span className="nb-home-label">الرئيسية</span>
          </div>

          {/* RIGHT TABS */}
          {BOTTOM_TABS_RIGHT.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`nb-tab${isActive(tab.path, tab.id) ? " active" : ""}`}
            >
              <i className={`bi ${tab.icon}`}></i>
              <span>{tab.label}</span>
              <span className="nb-tab-dot"></span>
            </Link>
          ))}

          {/* MORE BUTTON */}
          <button
            className={`nb-tab${morePanelOpen ? " active" : ""}`}
            onClick={() => setMorePanelOpen((v) => !v)}
            aria-label="المزيد"
          >
            <i className={`bi ${morePanelOpen ? "bi-x-lg" : "bi-grid-3x3-gap-fill"}`}></i>
            <span>المزيد</span>
            <span className="nb-tab-dot"></span>
          </button>
        </div>
      </div>

      {/* ── More panel overlay ── */}
      {morePanelOpen && (
        <div
          className="nb-more-overlay"
          onClick={() => setMorePanelOpen(false)}
        />
      )}

      {/* ── More panel slide-up ── */}
      {morePanelOpen && (
        <div className="nb-more-panel" dir="rtl">
          <div className="nb-more-panel-handle" />

          {/* User info row (if logged in) */}
          {user && (
            <div className="nb-more-user-row">
              <div className="nb-more-avatar">{getInitials(user.name)}</div>
              <div>
                <div className="nb-more-user-name">{user.name}</div>
                <div className="nb-more-user-role">{ROLE_LABEL[user.role] || user.role}</div>
              </div>
            </div>
          )}

          {/* Grid of extra links */}
          <div className="nb-more-panel-grid">
            {/* Activities */}
            {MORE_LINKS.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                className={`nb-more-item${isActive(link.path, link.id) ? " active" : ""}`}
                onClick={() => setMorePanelOpen(false)}
              >
                <i className={`bi ${link.icon}`}></i>
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Dashboard link if logged in */}
            {user && (
              <Link
                to={getDashboardPath(user.role)}
                className={`nb-more-item${location.pathname.startsWith(getDashboardPath(user.role)) ? " active" : ""}`}
                onClick={() => setMorePanelOpen(false)}
              >
                <i className="bi bi-speedometer2"></i>
                <span>لوحة التحكم</span>
              </Link>
            )}
          </div>

          {/* Auth actions */}
          <div className="nb-more-auth">
            {user ? (
              <button
                className="nb-more-auth-btn logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <span style={{
                    width: "14px", height: "14px",
                    border: "2px solid rgba(252,165,165,.3)",
                    borderTopColor: "#fca5a5", borderRadius: "50%",
                    animation: "nb-spin .7s linear infinite",
                    display: "inline-block",
                  }} />
                ) : (
                  <i className="bi bi-box-arrow-right"></i>
                )}
                <span>{loggingOut ? "جاري الخروج..." : "تسجيل الخروج"}</span>
              </button>
            ) : (
              <button
                className="nb-more-auth-btn login"
                onClick={() => { setMorePanelOpen(false); navigate("/auth"); }}
              >
                <i className="bi bi-box-arrow-in-right"></i>
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}