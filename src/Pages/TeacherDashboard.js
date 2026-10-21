// pages/TeacherDashboard.js
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  getResources, uploadResource, deleteResource, downloadResource,
  getAnnouncements, getGradeLevels, getSubjects, getAcademicYears,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  logout, errMsg,
} from "../api/services";
import useAuthGuard from "../api/useAuthGuard";
import MobileDashNav, { useTableLabels } from "./MobileDashNav";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const typeConfig = {
  lesson:   { label: "درس",    color: "#6366f1", bg: "#eef2ff", icon: "bi-journal-bookmark-fill" },
  exam:     { label: "اختبار", color: "#f43f5e", bg: "#fff1f2", icon: "bi-pencil-square" },
  homework: { label: "فرض",    color: "#10b981", bg: "#ecfdf5", icon: "bi-journal-text" },
  guide:    { label: "دليل",   color: "#f59e0b", bg: "#fffbeb", icon: "bi-book-fill" },
};

const semesterOptions = ["الفصل الأول", "الفصل الثاني", "الفصل الثالث"];

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to }) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !to) return;
    done.current = true;
    let s = null;
    const run = (ts) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / 1200, 1);
      setV(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [to]);
  return <>{v.toLocaleString("ar-DZ")}</>;
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
const isMobile = () => typeof window !== "undefined" && window.innerWidth < 992;

function Modal({ show, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);
  if (!show) return null;
  return (
    <motion.div className="t-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="t-modal"
        initial={isMobile() ? { y: "100%" } : { opacity: 0, y: 50, scale: 0.94 }}
        animate={isMobile() ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={isMobile() ? { y: "100%" } : { opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        onClick={e => e.stopPropagation()}>
        <div className="t-modal-head">
          <h5>{title}</h5>
          <button className="t-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="t-modal-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = "100%", r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
);

// ─── Sidebar items ─────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",   label: "نظرة عامة",    icon: "bi-grid-fill" },
  { id: "myresources",label: "ملفاتي",        icon: "bi-folder2-open" },
  { id: "upload",     label: "رفع ملف",       icon: "bi-cloud-upload-fill" },
  { id: "announcements", label: "الإعلانات",  icon: "bi-megaphone-fill" },
  { id: "profile",    label: "ملفي الشخصي",  icon: "bi-person-circle" },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function TeacherDashboard() {
  const navigate = useNavigate();

  // ── auth user ──────────────────────────────────────────────────────────────
  const teacher = useAuthGuard(["teacher", "admin"]);
  useTableLabels();

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [active, setActive]       = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [submitting, setSub]      = useState(false);

  // ── data ───────────────────────────────────────────────────────────────────
  const [myResources, setMyRes]   = useState([]);
  const [announcements, setAnns]  = useState([]);
  const [gradeLevels, setLevels]  = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [academicYears, setYears] = useState([]);
  const [notifications, setNotifs]= useState([]);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState({});

  // ── upload form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", type: "lesson", subject_id: "", grade_level_id: "",
    academic_year_id: "", semester: "الفصل الأول", description: "", file: null,
  });

  // ── filters ────────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter]     = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };
  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }));

  // ── fetch helpers ──────────────────────────────────────────────────────────
  const fetchMyResources = useCallback(async () => {
    setLoad("res", true);
    try {
      const { data } = await getResources({
        mine: true,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: searchQuery || undefined,
        perPage: 200,
      });
      setMyRes(data);
    } catch { showToast("تعذّر تحميل الملفات", "error"); }
    finally { setLoad("res", false); }
  }, [typeFilter, searchQuery]);

  const fetchAnnouncements = useCallback(async () => {
    setLoad("anns", true);
    try {
      setAnns(await getAnnouncements());
    } catch { showToast("تعذّر تحميل الإعلانات", "error"); }
    finally { setLoad("anns", false); }
  }, []);

  const fetchFormData = useCallback(async () => {
    try {
      const [lvls, subjs, years] = await Promise.all([
        getGradeLevels(), getSubjects(), getAcademicYears(),
      ]);
      setLevels(lvls);
      setSubjects(subjs);
      setYears(years);
      const cur = years.find(y => y.is_current);
      if (cur) setForm(p => ({ ...p, academic_year_id: cur.id }));
    } catch { /* silent */ }
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoad("profile", true);
    try {
      setProfile(teacher);
    } catch { showToast("تعذّر تحميل البيانات الشخصية", "error"); }
    finally { setLoad("profile", false); }
  }, [teacher]);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifs(await getNotifications());
    } catch { /* silent */ }
  }, []);

  // ── initial ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFormData();
    fetchNotifications();
  }, [fetchFormData, fetchNotifications]);

  useEffect(() => {
    if (active === "myresources" || active === "overview") fetchMyResources();
  }, [active, typeFilter, searchQuery, fetchMyResources]);

  useEffect(() => {
    if (active === "announcements") fetchAnnouncements();
  }, [active, fetchAnnouncements]);

  useEffect(() => {
    if (active === "profile") fetchProfile();
  }, [active, fetchProfile]);

  // ── upload resource ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!form.title || !form.subject_id || !form.grade_level_id || !form.file) {
      showToast("يرجى ملء جميع الحقول المطلوبة وتحديد الملف", "error"); return;
    }
    setSub(true);
    try {
      const { file, ...meta } = form;
      await uploadResource({ file, meta });
      showToast("✅ تم رفع الملف بنجاح");
      setForm(p => ({ ...p, title: "", description: "", file: null }));
      setActive("myresources");
    } catch (err) {
      showToast(errMsg(err, "فشل رفع الملف"), "error");
    } finally { setSub(false); }
  };

  // ── delete resource ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("تأكيد حذف هذا الملف؟")) return;
    try {
      await deleteResource(id);
      showToast("تم حذف الملف بنجاح");
      fetchMyResources();
    } catch (err) {
      showToast(errMsg(err, "فشل الحذف"), "error");
    }
  };

  // ── mark notification read ─────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifs(p => p.filter(n => n.id !== id));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifs([]);
    } catch { /* silent */ }
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:    myResources.length,
    lessons:  myResources.filter(r => r.type === "lesson").length,
    exams:    myResources.filter(r => r.type === "exam").length,
    homework: myResources.filter(r => r.type === "homework").length,
    downloads:myResources.reduce((s, r) => s + (r.download_count || 0), 0),
  };

  const unreadCount = notifications.length;

  if (!teacher) return null; // auth guard is checking / redirecting

  return (
    <div className="td-root" dir="rtl">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className={`td-toast ${toast.type}`}
            initial={{ opacity: 0, y: -24, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -24, x: "-50%" }}>
            <i className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside className="td-sidebar"
        animate={{ width: collapsed ? 68 : 250 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}>

        {/* brand */}
        <div className="td-brand">
          <div className="td-brand-icon"><i className="bi bi-mortarboard-fill" /></div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="td-brand-title">بوابة الأستاذ</p>
                <p className="td-brand-sub">ثانوية حاج بن جعفر</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button className="td-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            <i className={`bi bi-chevron-${collapsed ? "left" : "right"}`} />
          </button>
        </div>

        {/* nav */}
        <nav className="td-nav">
          {NAV.map(item => (
            <motion.button key={item.id}
              className={`td-nav-btn ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
              whileHover={{ x: 3 }} whileTap={{ scale: 0.96 }}
              title={collapsed ? item.label : ""}>
              <i className={`bi ${item.icon}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.id === "announcements" && unreadCount > 0 && (
                <span className="td-notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
              {active === item.id && (
                <motion.div className="td-nav-bar" layoutId="tbar"
                  transition={{ type: "spring", stiffness: 320, damping: 30 }} />
              )}
            </motion.button>
          ))}
        </nav>

        {/* footer */}
        <div className="td-sidebar-footer">
          <div className="td-avatar-sm">
            {teacher?.name?.charAt(0) || "أ"}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div className="td-footer-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="td-footer-name">{teacher?.name || "الأستاذ"}</span>
                <span className="td-footer-role">أستاذ</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main className="td-main">

        {/* topbar */}
        <div className="td-topbar">
          <div>
            <h4 className="td-topbar-title">{NAV.find(n => n.id === active)?.label}</h4>
            <p className="td-topbar-sub">السنة الدراسية {academicYears.find(y => y.is_current)?.label || ""}</p>
          </div>
          <div className="td-topbar-actions">
            {/* notifications bell */}
            <button className="td-icon-btn notif-bell" onClick={() => setModal({ type: "notifications" })} title="الإشعارات">
              <i className="bi bi-bell-fill" />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>
            {/* upload quick */}
            <button className="td-upload-quick" onClick={() => setActive("upload")}>
              <i className="bi bi-cloud-upload-fill" />
              <span>رفع ملف</span>
            </button>
            {/* logout */}
            <button className="td-icon-btn logout-btn" title="تسجيل الخروج" onClick={async () => {
              await logout();
              navigate("/auth");
            }}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        {/* ══ SECTIONS ══ */}
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {active === "overview" && (
            <motion.div key="ov" className="td-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* welcome banner */}
              <div className="td-welcome">
                <div className="td-welcome-text">
                  <h2>مرحباً، أستاذ 👋</h2>
                  <p>إليك ملخص نشاطاتك في المنصة لهذا الموسم الدراسي.</p>
                </div>
                <div className="td-welcome-deco">
                  <i className="bi bi-person-badge-fill" />
                </div>
              </div>

              {/* stat cards */}
              <div className="td-stats">
                {[
                  { label: "إجمالي الملفات",  value: stats.total,     icon: "bi-folder-fill",           color: "#6366f1" },
                  { label: "دروس",            value: stats.lessons,   icon: "bi-journal-bookmark-fill", color: "#0ea5e9" },
                  { label: "اختبارات وفروض",  value: stats.exams + stats.homework, icon: "bi-clipboard-fill", color: "#f43f5e" },
                  { label: "إجمالي التحميلات",value: stats.downloads, icon: "bi-download",              color: "#10b981" },
                ].map((s, i) => (
                  <motion.div key={i} className="td-stat-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }}>
                    <div className="td-stat-icon" style={{ background: s.color + "18", color: s.color }}>
                      <i className={`bi ${s.icon}`} />
                    </div>
                    <div>
                      <div className="td-stat-val" style={{ color: s.color }}>
                        <Counter to={s.value} />
                      </div>
                      <div className="td-stat-lbl">{s.label}</div>
                    </div>
                    <div className="td-stat-bg" style={{ background: s.color + "08" }} />
                  </motion.div>
                ))}
              </div>

              {/* recent uploads */}
              <div className="td-card">
                <div className="td-card-head">
                  <h6><i className="bi bi-clock-history me-2" style={{ color: "#6366f1" }} />آخر الملفات المرفوعة</h6>
                  <button className="td-see-all" onClick={() => setActive("myresources")}>
                    عرض الكل <i className="bi bi-chevron-left" />
                  </button>
                </div>
                {loading.res ? (
                  <div className="p-4"><Sk h={140} /></div>
                ) : myResources.length === 0 ? (
                  <div className="td-empty">
                    <i className="bi bi-folder2-open" />
                    <p>لم ترفع أي ملف بعد</p>
                    <button className="td-empty-btn" onClick={() => setActive("upload")}>
                      <i className="bi bi-plus-lg me-1" />ارفع أول ملف
                    </button>
                  </div>
                ) : (
                  <div className="td-resource-list">
                    {myResources.slice(0, 5).map((r, i) => {
                      const tc = typeConfig[r.type] || typeConfig.lesson;
                      return (
                        <motion.div key={r.id} className="td-resource-row"
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}>
                          <div className="td-res-icon" style={{ background: tc.bg, color: tc.color }}>
                            <i className={`bi ${tc.icon}`} />
                          </div>
                          <div className="td-res-info">
                            <span className="td-res-title">{r.title}</span>
                            <span className="td-res-meta">
                              {r.subject?.name || "—"} &bull; {r.grade_level?.name || "—"}
                            </span>
                          </div>
                          <div className="td-res-chips">
                            <span className="td-chip" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                            <span className="td-chip grey">
                              <i className="bi bi-download me-1" />{r.download_count || 0}
                            </span>
                          </div>
                          <div className="td-res-actions">
                            <button className="td-row-btn view" onClick={() => downloadResource(r.id).catch(e => showToast(errMsg(e), "error"))}>
                              <i className="bi bi-eye-fill" />
                            </button>
                            <button className="td-row-btn del" onClick={() => handleDelete(r.id)}>
                              <i className="bi bi-trash3-fill" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* announcements preview */}
              {announcements.length > 0 && (
                <div className="td-card mt-3">
                  <div className="td-card-head">
                    <h6><i className="bi bi-megaphone-fill me-2" style={{ color: "#f43f5e" }} />آخر الإعلانات</h6>
                    <button className="td-see-all" onClick={() => setActive("announcements")}>
                      عرض الكل <i className="bi bi-chevron-left" />
                    </button>
                  </div>
                  <div className="td-ann-preview">
                    {announcements.slice(0, 3).map(a => (
                      <div key={a.id} className="td-ann-row">
                        <div className="td-ann-dot" />
                        <div>
                          <p className="td-ann-title">{a.title}</p>
                          <p className="td-ann-meta">{a.author?.name || "—"} &bull; {a.published_at?.substring(0, 10)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── MY RESOURCES ── */}
          {active === "myresources" && (
            <motion.div key="res" className="td-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* toolbar */}
              <div className="td-toolbar">
                <div className="td-filters">
                  {["all", "lesson", "exam", "homework"].map(t => (
                    <button key={t}
                      className={`td-filter-btn ${typeFilter === t ? "active" : ""}`}
                      onClick={() => setTypeFilter(t)}>
                      {t === "all" ? "الكل" : typeConfig[t]?.label}
                    </button>
                  ))}
                </div>
                <div className="td-search-wrap">
                  <i className="bi bi-search td-search-icon" />
                  <input className="td-search" placeholder="بحث في ملفاتي..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} />
                  {searchQuery && (
                    <button className="td-search-clear" onClick={() => setSearchQuery("")}>
                      <i className="bi bi-x-lg" />
                    </button>
                  )}
                </div>
                <button className="td-primary-btn" onClick={() => setActive("upload")}>
                  <i className="bi bi-cloud-upload-fill me-1" />رفع ملف
                </button>
              </div>

              {loading.res ? (
                <div className="td-card p-4"><Sk h={200} /></div>
              ) : myResources.length === 0 ? (
                <div className="td-empty large">
                  <i className="bi bi-folder2-open" />
                  <p>لا توجد ملفات مطابقة</p>
                  <button className="td-empty-btn" onClick={() => setActive("upload")}>
                    <i className="bi bi-plus-lg me-1" />ارفع ملفاً جديداً
                  </button>
                </div>
              ) : (
                <div className="td-res-grid">
                  {myResources.map((r, i) => {
                    const tc = typeConfig[r.type] || typeConfig.lesson;
                    return (
                      <motion.div key={r.id} className="td-res-card"
                        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }} whileHover={{ y: -5 }}>
                        <div className="td-res-card-top" style={{ background: tc.bg }}>
                          <i className={`bi ${tc.icon}`} style={{ color: tc.color, fontSize: "2.2rem" }} />
                          <span className="td-res-card-type" style={{ background: tc.color, color: "white" }}>
                            {tc.label}
                          </span>
                        </div>
                        <div className="td-res-card-body">
                          <h6 className="td-res-card-title">{r.title}</h6>
                          <p className="td-res-card-meta">
                            <i className="bi bi-book me-1" />{r.subject?.name || "—"}
                          </p>
                          <p className="td-res-card-meta">
                            <i className="bi bi-mortarboard me-1" />{r.grade_level?.name || "—"}
                          </p>
                          <p className="td-res-card-meta">
                            <i className="bi bi-download me-1" />{r.download_count || 0} تحميل
                          </p>
                        </div>
                        <div className="td-res-card-foot">
                          <button className="td-card-btn view" onClick={() => downloadResource(r.id).catch(e => showToast(errMsg(e), "error"))}>
                            <i className="bi bi-eye-fill me-1" />فتح
                          </button>
                          <button className="td-card-btn del" onClick={() => handleDelete(r.id)}>
                            <i className="bi bi-trash3-fill" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── UPLOAD ── */}
          {active === "upload" && (
            <motion.div key="up" className="td-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="td-upload-wrap">
                <div className="td-upload-card">
                  <div className="td-upload-header">
                    <i className="bi bi-cloud-arrow-up-fill" />
                    <h5>رفع مورد تعليمي جديد</h5>
                    <p>ادعم زملاءك التلاميذ برفع دروسك واختباراتك</p>
                  </div>

                  <div className="td-form-grid">
                    {/* العنوان */}
                    <div className="td-field full">
                      <label>عنوان الملف <span className="req">*</span></label>
                      <div className="td-input-wrap">
                        <i className="bi bi-journal-text td-fi" />
                        <input type="text" placeholder="مثال: درس التعليمة الشرطية" value={form.title}
                          onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                      </div>
                    </div>

                    {/* النوع */}
                    <div className="td-field">
                      <label>نوع الملف <span className="req">*</span></label>
                      <div className="td-type-tabs">
                        {Object.entries(typeConfig).map(([k, v]) => (
                          <button key={k}
                            className={`td-type-tab ${form.type === k ? "active" : ""}`}
                            style={form.type === k ? { background: v.color, color: "white", borderColor: v.color } : {}}
                            onClick={() => setForm(p => ({ ...p, type: k }))}>
                            <i className={`bi ${v.icon}`} />
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* المادة */}
                    <div className="td-field">
                      <label>المادة <span className="req">*</span></label>
                      <div className="td-input-wrap">
                        <i className="bi bi-book td-fi" />
                        <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                          <option value="">-- اختر المادة --</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* المستوى */}
                    <div className="td-field">
                      <label>المستوى الدراسي <span className="req">*</span></label>
                      <div className="td-input-wrap">
                        <i className="bi bi-mortarboard td-fi" />
                        <select value={form.grade_level_id} onChange={e => setForm(p => ({ ...p, grade_level_id: e.target.value }))}>
                          <option value="">-- اختر المستوى --</option>
                          {gradeLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* الفصل */}
                    <div className="td-field">
                      <label>الفصل الدراسي</label>
                      <div className="td-input-wrap">
                        <i className="bi bi-calendar3 td-fi" />
                        <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                          {semesterOptions.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* السنة الدراسية */}
                    <div className="td-field">
                      <label>السنة الدراسية</label>
                      <div className="td-input-wrap">
                        <i className="bi bi-calendar-check td-fi" />
                        <select value={form.academic_year_id} onChange={e => setForm(p => ({ ...p, academic_year_id: e.target.value }))}>
                          {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* الوصف */}
                    <div className="td-field full">
                      <label>وصف اختياري</label>
                      <textarea rows={3} placeholder="وصف مختصر للملف..." value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    {/* الملف */}
                    <div className="td-field full">
                      <label>الملف <span className="req">*</span> <span className="td-hint">(PDF, Word, PPT — حد أقصى 50MB)</span></label>
                      <label className="td-dropzone" htmlFor="teacher-file">
                        {form.file ? (
                          <>
                            <i className="bi bi-file-earmark-check-fill" style={{ color: "#10b981", fontSize: "2.5rem" }} />
                            <span className="td-file-name">{form.file.name}</span>
                            <span className="td-file-size">{(form.file.size / 1024).toFixed(0)} KB</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up" style={{ fontSize: "2.5rem", color: "#6366f1" }} />
                            <span>اسحب الملف هنا أو <u>انقر للاختيار</u></span>
                            <span className="td-hint">PDF, DOC, DOCX, PPT, PPTX</span>
                          </>
                        )}
                      </label>
                      <input id="teacher-file" type="file" style={{ display: "none" }}
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        onChange={e => setForm(p => ({ ...p, file: e.target.files[0] || null }))} />
                    </div>
                  </div>

                  <div className="td-form-actions">
                    <button className="td-cancel-btn" onClick={() => setActive("myresources")}>إلغاء</button>
                    <button className="td-submit-btn" onClick={handleUpload} disabled={submitting}>
                      {submitting ? (
                        <><span className="td-spin" /> جاري الرفع...</>
                      ) : (
                        <><i className="bi bi-cloud-upload-fill me-2" />رفع الملف</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ANNOUNCEMENTS ── */}
          {active === "announcements" && (
            <motion.div key="anns" className="td-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading.anns ? (
                <div className="td-card p-4"><Sk h={200} /></div>
              ) : announcements.length === 0 ? (
                <div className="td-empty large">
                  <i className="bi bi-megaphone" />
                  <p>لا توجد إعلانات حالياً</p>
                </div>
              ) : (
                <div className="td-ann-list">
                  {announcements.map((a, i) => (
                    <motion.div key={a.id} className="td-ann-card"
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      <div className="td-ann-stripe" />
                      <div className="td-ann-body">
                        <div className="td-ann-top-row">
                          <h6>{a.title}</h6>
                          <span className={`td-ann-badge ${a.is_published ? "pub" : "draft"}`}>
                            <i className={`bi ${a.is_published ? "bi-check-circle-fill" : "bi-clock"} me-1`} />
                            {a.is_published ? "منشور" : "مسودة"}
                          </span>
                        </div>
                        <p className="td-ann-body-text">{a.body}</p>
                        <div className="td-ann-footer-meta">
                          <span><i className="bi bi-person me-1" />{a.author?.name || "—"}</span>
                          <span><i className="bi bi-people me-1" />{
                            { all: "الجميع", teachers: "الأساتذة", students: "التلاميذ", guidance: "التوجيه" }[a.audience] || a.audience
                          }</span>
                          <span><i className="bi bi-calendar me-1" />{a.published_at?.substring(0, 10)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PROFILE ── */}
          {active === "profile" && (
            <motion.div key="prof" className="td-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading.profile ? (
                <div className="td-card p-4"><Sk h={200} /></div>
              ) : (
                <div className="td-profile-wrap">
                  <div className="td-profile-card">
                    <div className="td-profile-header">
                      <div className="td-profile-avatar">
                        {(profile?.name || teacher?.name || "أ").charAt(0)}
                      </div>
                      <h4>{profile?.name || teacher?.name}</h4>
                      <p>{profile?.email || teacher?.email}</p>
                      <span className="td-role-tag">أستاذ</span>
                    </div>
                    <div className="td-profile-stats">
                      {[
                        { label: "إجمالي الملفات",   value: stats.total },
                        { label: "إجمالي التحميلات", value: stats.downloads },
                        { label: "الدروس",           value: stats.lessons },
                        { label: "الفروض والاختبارات", value: stats.exams + stats.homework },
                      ].map((s, i) => (
                        <div key={i} className="td-pstat">
                          <span className="td-pstat-val"><Counter to={s.value} /></span>
                          <span className="td-pstat-lbl">{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="td-profile-info-list">
                      {[
                        { icon: "bi-envelope-fill",   label: "البريد",    val: profile?.email  || teacher?.email || "—" },
                        { icon: "bi-telephone-fill",  label: "الهاتف",    val: profile?.phone  || "غير محدد" },
                        { icon: "bi-shield-fill",     label: "الدور",     val: "أستاذ" },
                        { icon: "bi-clock-fill",      label: "آخر دخول",  val: profile?.last_login_at?.substring(0, 10) || "—" },
                      ].map((row, i) => (
                        <div key={i} className="td-info-row">
                          <div className="td-info-icon"><i className={`bi ${row.icon}`} /></div>
                          <div>
                            <span className="td-info-label">{row.label}</span>
                            <span className="td-info-val">{row.val}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Notifications Modal ── */}
      <Modal show={modal?.type === "notifications"} onClose={() => setModal(null)} title="الإشعارات">
        {notifications.length === 0 ? (
          <div className="td-empty" style={{ minHeight: 160 }}>
            <i className="bi bi-bell-slash" />
            <p>لا توجد إشعارات غير مقروءة</p>
          </div>
        ) : (
          <>
            <button className="td-mark-all" onClick={markAllRead}>
              <i className="bi bi-check2-all me-1" />تعليم الكل كمقروء
            </button>
            <div className="td-notif-list">
              {notifications.map(n => (
                <div key={n.id} className="td-notif-item">
                  <div className="td-notif-dot-small" />
                  <div className="td-notif-content">
                    <p>{n.data?.message || n.data?.title || "إشعار جديد"}</p>
                    <span>{n.created_at?.substring(0, 10)}</span>
                  </div>
                  <button className="td-notif-read" onClick={() => markRead(n.id)} title="تعليم كمقروء">
                    <i className="bi bi-check2" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      <MobileDashNav
        items={NAV.map(n => ({ ...n, label: { overview: "الرئيسية", profile: "حسابي" }[n.id] || n.label, badge: n.id === "announcements" ? unreadCount : 0 }))}
        active={active}
        onSelect={setActive}
        accent="#6366f1"
      />

      {/* ══ STYLES ══ */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .td-root {
          display: flex; min-height: 100vh;
          background: #f0f4fa;
          font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif;
          direction: rtl;
        }

        /* ── Toast ── */
        .td-toast {
          position: fixed; top: 18px; left: 50%;
          z-index: 9999; display: flex; align-items: center; gap: 10px;
          padding: 13px 22px; border-radius: 40px;
          font-weight: 700; font-size: 0.88rem;
          box-shadow: 0 8px 28px rgba(0,0,0,0.14);
          pointer-events: none;
        }
        .td-toast.success { background: #10b981; color: white; }
        .td-toast.error   { background: #f43f5e; color: white; }

        /* ── Sidebar ── */
        .td-sidebar {
          background: #0c1a2e;
          height: 100vh; position: sticky; top: 0;
          display: flex; flex-direction: column;
          overflow: hidden; flex-shrink: 0;
          border-left: 1px solid rgba(255,255,255,0.05); z-index: 100;
        }
        .td-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          min-height: 76px; position: relative;
        }
        .td-brand-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.2rem;
          box-shadow: 0 4px 14px rgba(99,102,241,0.4);
        }
        .td-brand-title { color: white; font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
        .td-brand-sub   { color: #475569; font-size: 0.68rem; white-space: nowrap; margin-top: 2px; }
        .td-collapse-btn {
          position: absolute; left: -1px; top: 50%; transform: translateY(-50%);
          width: 22px; height: 22px;
          background: #1e3a5f; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%; color: #94a3b8; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 0.6rem; transition: all 0.2s;
        }
        .td-collapse-btn:hover { background: #6366f1; color: white; border-color: #6366f1; }

        .td-nav { flex: 1; padding: 10px 8px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; }
        .td-nav::-webkit-scrollbar { width: 0; }
        .td-nav-btn {
          position: relative; display: flex; align-items: center; gap: 10px;
          padding: 11px 13px; border: none; background: transparent;
          border-radius: 10px; color: #64748b; cursor: pointer;
          transition: all 0.22s; text-align: right; white-space: nowrap; overflow: hidden;
          font-size: 0.88rem; font-weight: 500;
        }
        .td-nav-btn:hover  { background: rgba(255,255,255,0.05); color: #cbd5e1; }
        .td-nav-btn.active { color: white; background: rgba(99,102,241,0.18); }
        .td-nav-btn i { font-size: 1.05rem; flex-shrink: 0; }
        .td-nav-bar {
          position: absolute; right: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #6366f1, #818cf8);
          border-radius: 0 3px 3px 0;
        }
        .td-notif-dot {
          margin-right: auto; background: #f43f5e; color: white;
          font-size: 0.65rem; font-weight: 700; min-width: 18px; height: 18px;
          border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px;
        }

        .td-sidebar-footer {
          display: flex; align-items: center; gap: 10px;
          padding: 14px; border-top: 1px solid rgba(255,255,255,0.06); overflow: hidden;
        }
        .td-avatar-sm {
          width: 34px; height: 34px; flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1rem; font-weight: 700;
        }
        .td-footer-info { overflow: hidden; }
        .td-footer-name { display: block; color: #e2e8f0; font-weight: 600; font-size: 0.82rem; white-space: nowrap; }
        .td-footer-role { display: block; color: #475569; font-size: 0.7rem; }

        /* ── Main ── */
        .td-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        .td-topbar {
          display: flex; align-items: center; justify-content: space-between;
          background: white; padding: 14px 26px;
          border-bottom: 1px solid #e9eef6;
          position: sticky; top: 0; z-index: 50;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .td-topbar-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
        .td-topbar-sub   { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
        .td-topbar-actions { display: flex; align-items: center; gap: 10px; }

        .td-icon-btn {
          width: 38px; height: 38px; border: 1.5px solid #e9eef6;
          background: #f8fafc; border-radius: 10px; color: #475569;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; transition: all 0.2s; position: relative;
        }
        .td-icon-btn:hover  { background: #6366f1; color: white; border-color: #6366f1; }
        .logout-btn:hover   { background: #f43f5e; border-color: #f43f5e; }

        .bell-badge {
          position: absolute; top: -4px; right: -4px;
          background: #f43f5e; color: white;
          font-size: 0.6rem; font-weight: 700; min-width: 16px; height: 16px;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          padding: 0 3px; border: 2px solid white;
        }

        .td-upload-quick {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white; border: none; border-radius: 30px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.25s;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
          font-family: inherit;
        }
        .td-upload-quick:hover { transform: translateY(-2px); box-shadow: 0 7px 18px rgba(99,102,241,0.4); }

        /* ── Section ── */
        .td-section { padding: 26px; flex: 1; }

        /* welcome */
        .td-welcome {
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
          border-radius: 20px; padding: 28px 32px; margin-bottom: 24px;
          overflow: hidden; position: relative;
        }
        .td-welcome-text h2 { color: white; font-size: 1.4rem; font-weight: 800; margin-bottom: 6px; }
        .td-welcome-text p  { color: #a5b4fc; font-size: 0.88rem; margin: 0; }
        .td-welcome-deco    { font-size: 5rem; color: rgba(255,255,255,0.08); }

        /* stats */
        .td-stats {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 18px; margin-bottom: 24px;
        }
        .td-stat-card {
          background: white; border-radius: 18px; padding: 22px 20px;
          display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          border: 1px solid #eef2f9; position: relative; overflow: hidden;
          transition: all 0.28s; cursor: default;
        }
        .td-stat-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; flex-shrink: 0;
        }
        .td-stat-val { font-size: 1.65rem; font-weight: 800; line-height: 1; }
        .td-stat-lbl { font-size: 0.78rem; color: #94a3b8; margin-top: 4px; font-weight: 500; }
        .td-stat-bg  { position: absolute; inset: 0; pointer-events: none; }

        /* card */
        .td-card {
          background: white; border-radius: 18px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #eef2f9;
          overflow: hidden; margin-bottom: 20px;
        }
        .td-card-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
        }
        .td-card-head h6 { margin: 0; font-weight: 700; color: #0f172a; font-size: 0.92rem; }
        .td-see-all {
          display: flex; align-items: center; gap: 5px; font-size: 0.8rem;
          color: #6366f1; background: none; border: none; cursor: pointer;
          font-weight: 600; transition: gap 0.2s; font-family: inherit;
        }
        .td-see-all:hover { gap: 9px; }

        /* resource list */
        .td-resource-list { padding: 8px 0; }
        .td-resource-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 22px; transition: background 0.15s;
        }
        .td-resource-row:hover { background: #f8fafc; }
        .td-res-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .td-res-info { flex: 1; min-width: 0; }
        .td-res-title { display: block; font-weight: 600; color: #1e293b; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .td-res-meta  { display: block; font-size: 0.74rem; color: #94a3b8; margin-top: 2px; }
        .td-res-chips { display: flex; gap: 6px; flex-shrink: 0; }
        .td-chip {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600;
        }
        .td-chip.grey { background: #f1f5f9; color: #64748b; }
        .td-res-actions { display: flex; gap: 6px; }
        .td-row-btn {
          width: 28px; height: 28px; border: none; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; transition: all 0.18s; text-decoration: none;
        }
        .td-row-btn.view { background: #eef2ff; color: #6366f1; }
        .td-row-btn.del  { background: #fff1f2; color: #f43f5e; }
        .td-row-btn:hover { filter: brightness(0.88); transform: scale(1.08); }

        /* empty */
        .td-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 40px 20px; text-align: center; color: #94a3b8;
        }
        .td-empty.large { min-height: 320px; }
        .td-empty i  { font-size: 3.5rem; margin-bottom: 14px; color: #cbd5e1; }
        .td-empty p  { font-size: 0.9rem; margin-bottom: 16px; }
        .td-empty-btn {
          padding: 9px 22px; background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white; border: none; border-radius: 30px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: all 0.25s; box-shadow: 0 4px 12px rgba(99,102,241,0.3);
          font-family: inherit;
        }
        .td-empty-btn:hover { transform: translateY(-2px); }

        /* toolbar */
        .td-toolbar {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 22px; flex-wrap: wrap;
        }
        .td-filters { display: flex; gap: 7px; flex-wrap: wrap; }
        .td-filter-btn {
          padding: 7px 16px; border: 1.5px solid #e9eef6;
          background: white; border-radius: 30px;
          font-size: 0.8rem; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .td-filter-btn.active { background: #6366f1; color: white; border-color: #6366f1; }
        .td-filter-btn:hover:not(.active) { border-color: #6366f1; color: #6366f1; }

        .td-search-wrap {
          position: relative; flex: 1; max-width: 280px;
        }
        .td-search-icon {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; font-size: 0.88rem;
        }
        .td-search {
          width: 100%; padding: 9px 36px 9px 36px;
          border: 1.5px solid #e9eef6; border-radius: 30px;
          font-size: 0.85rem; background: white; color: #0f172a;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .td-search:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .td-search-clear {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          border: none; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.75rem;
        }
        .td-primary-btn {
          display: flex; align-items: center; padding: 9px 20px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white; border: none; border-radius: 30px;
          font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.25s;
          box-shadow: 0 4px 10px rgba(99,102,241,0.3); font-family: inherit;
        }
        .td-primary-btn:hover { transform: translateY(-2px); }

        /* resource grid */
        .td-res-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 18px;
        }
        .td-res-card {
          background: white; border-radius: 18px;
          border: 1px solid #eef2f9; box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          overflow: hidden; transition: all 0.28s; cursor: default;
        }
        .td-res-card-top {
          padding: 24px 20px; display: flex; flex-direction: column; align-items: center;
          gap: 10px; position: relative;
        }
        .td-res-card-type {
          padding: 3px 12px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700;
        }
        .td-res-card-body { padding: 8px 18px 14px; }
        .td-res-card-title { font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 0.88rem; line-height: 1.4; }
        .td-res-card-meta  { font-size: 0.76rem; color: #94a3b8; margin-bottom: 4px; }
        .td-res-card-foot  {
          display: flex; gap: 8px; padding: 10px 16px;
          border-top: 1px solid #f8fafc; background: #fafbff;
        }
        .td-card-btn {
          flex: 1; padding: 7px; border: none; border-radius: 8px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          text-decoration: none; font-family: inherit;
        }
        .td-card-btn.view { background: #eef2ff; color: #6366f1; }
        .td-card-btn.del  { background: #fff1f2; color: #f43f5e; max-width: 36px; flex: 0; }
        .td-card-btn:hover { filter: brightness(0.9); transform: scale(1.03); }

        /* upload form */
        .td-upload-wrap { display: flex; justify-content: center; }
        .td-upload-card {
          background: white; border-radius: 22px; padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #eef2f9;
          width: 100%; max-width: 700px;
        }
        .td-upload-header {
          text-align: center; margin-bottom: 28px;
          padding-bottom: 22px; border-bottom: 1px solid #f1f5f9;
        }
        .td-upload-header i  { font-size: 3rem; color: #6366f1; margin-bottom: 10px; display: block; }
        .td-upload-header h5 { font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .td-upload-header p  { color: #94a3b8; font-size: 0.86rem; }
        .td-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
        .td-field { display: flex; flex-direction: column; gap: 7px; }
        .td-field.full { grid-column: 1 / -1; }
        .td-field label { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .req { color: #f43f5e; }
        .td-hint { font-size: 0.72rem; font-weight: 400; color: #94a3b8; }
        .td-input-wrap { position: relative; }
        .td-fi { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9rem; pointer-events: none; z-index: 1; }
        .td-input-wrap input,
        .td-input-wrap select {
          width: 100%; padding: 10px 40px 10px 14px;
          border: 1.5px solid #e9eef6; border-radius: 12px;
          font-size: 0.87rem; color: #0f172a; background: #f8fafc;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .td-input-wrap input:focus,
        .td-input-wrap select:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .td-field textarea {
          width: 100%; padding: 11px 14px; border: 1.5px solid #e9eef6; border-radius: 12px;
          font-size: 0.87rem; color: #0f172a; background: #f8fafc; outline: none;
          transition: all 0.2s; resize: vertical; min-height: 90px; font-family: inherit;
        }
        .td-field textarea:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .td-type-tabs { display: flex; gap: 7px; flex-wrap: wrap; }
        .td-type-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border: 1.5px solid #e9eef6;
          background: white; border-radius: 30px;
          font-size: 0.8rem; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .td-type-tab.active { box-shadow: 0 3px 10px rgba(0,0,0,0.12); }

        .td-dropzone {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 30px 20px; border: 2px dashed #d1d5e4; border-radius: 16px;
          background: #f8faff; cursor: pointer; transition: all 0.2s;
          color: #94a3b8; font-size: 0.86rem; text-align: center;
        }
        .td-dropzone:hover { border-color: #6366f1; background: #eef2ff; }
        .td-file-name { font-weight: 600; color: #0f172a; font-size: 0.9rem; }
        .td-file-size { color: #94a3b8; font-size: 0.75rem; }

        .td-form-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .td-cancel-btn {
          padding: 10px 24px; background: #f8fafc; border: 1.5px solid #e9eef6;
          border-radius: 30px; color: #64748b; font-size: 0.87rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .td-cancel-btn:hover { background: #f1f5f9; }
        .td-submit-btn {
          display: flex; align-items: center; padding: 11px 28px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white; border: none; border-radius: 30px;
          font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.25s;
          box-shadow: 0 5px 14px rgba(99,102,241,0.35); font-family: inherit;
        }
        .td-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.45); }
        .td-submit-btn:disabled { opacity: 0.72; cursor: not-allowed; }
        .td-spin {
          width: 16px; height: 16px; margin-left: 8px;
          border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* announcements */
        .td-ann-preview { padding: 6px 0; }
        .td-ann-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 22px; border-bottom: 1px solid #f8fafc; }
        .td-ann-row:last-child { border-bottom: none; }
        .td-ann-dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .td-ann-title { font-weight: 600; color: #1e293b; font-size: 0.86rem; margin-bottom: 3px; }
        .td-ann-meta  { font-size: 0.73rem; color: #94a3b8; }

        .td-ann-list  { display: flex; flex-direction: column; gap: 14px; }
        .td-ann-card  {
          background: white; border-radius: 16px; border: 1px solid #eef2f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          display: flex; align-items: stretch; overflow: hidden; transition: all 0.2s;
        }
        .td-ann-stripe { width: 5px; flex-shrink: 0; background: linear-gradient(180deg, #6366f1, #818cf8); }
        .td-ann-body   { flex: 1; padding: 18px 20px; }
        .td-ann-top-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .td-ann-top-row h6 { margin: 0; font-weight: 700; color: #0f172a; font-size: 0.9rem; flex: 1; }
        .td-ann-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .td-ann-badge.pub   { background: #ecfdf5; color: #059669; }
        .td-ann-badge.draft { background: #fffbeb; color: #d97706; }
        .td-ann-body-text { font-size: 0.83rem; color: #475569; line-height: 1.6; margin-bottom: 10px; }
        .td-ann-footer-meta { display: flex; gap: 18px; font-size: 0.76rem; color: #94a3b8; flex-wrap: wrap; }

        /* profile */
        .td-profile-wrap { display: flex; justify-content: center; }
        .td-profile-card {
          background: white; border-radius: 22px; padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #eef2f9;
          width: 100%; max-width: 520px;
        }
        .td-profile-header { text-align: center; margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px solid #f1f5f9; }
        .td-profile-avatar {
          width: 80px; height: 80px; border-radius: 22px; margin: 0 auto 14px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 2.2rem; font-weight: 800;
          box-shadow: 0 6px 20px rgba(99,102,241,0.35);
        }
        .td-profile-header h4 { font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .td-profile-header p  { color: #94a3b8; font-size: 0.84rem; margin-bottom: 10px; }
        .td-role-tag { background: #eef2ff; color: #6366f1; padding: 4px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; }

        .td-profile-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 22px; }
        .td-pstat { text-align: center; background: #f8faff; border-radius: 12px; padding: 14px 8px; }
        .td-pstat-val { display: block; font-size: 1.4rem; font-weight: 800; color: #6366f1; }
        .td-pstat-lbl { display: block; font-size: 0.7rem; color: #94a3b8; margin-top: 3px; }

        .td-profile-info-list { display: flex; flex-direction: column; gap: 10px; }
        .td-info-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #f8faff; border-radius: 12px; }
        .td-info-icon {
          width: 34px; height: 34px; border-radius: 10px; background: #eef2ff;
          display: flex; align-items: center; justify-content: center;
          color: #6366f1; font-size: 0.9rem; flex-shrink: 0;
        }
        .td-info-label { display: block; font-size: 0.72rem; color: #94a3b8; font-weight: 500; }
        .td-info-val   { display: block; font-size: 0.87rem; color: #0f172a; font-weight: 600; }

        /* modal */
        .t-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(12,26,46,0.6); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .t-modal {
          background: white; border-radius: 22px;
          width: 100%; max-width: 500px; max-height: 88vh;
          overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        .t-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
        }
        .t-modal-head h5 { margin: 0; font-weight: 700; color: #0f172a; }
        .t-close {
          width: 30px; height: 30px; background: #f8fafc; border: none; border-radius: 8px;
          color: #94a3b8; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .t-close:hover { background: #fff1f2; color: #f43f5e; }
        .t-modal-body { padding: 22px; }

        /* notifications */
        .td-mark-all {
          display: flex; align-items: center; margin-bottom: 14px;
          font-size: 0.82rem; font-weight: 600; color: #6366f1;
          background: none; border: none; cursor: pointer; font-family: inherit; padding: 0;
        }
        .td-notif-list  { display: flex; flex-direction: column; gap: 10px; }
        .td-notif-item  { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8faff; border-radius: 12px; }
        .td-notif-dot-small { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; flex-shrink: 0; }
        .td-notif-content { flex: 1; }
        .td-notif-content p    { font-size: 0.84rem; color: #1e293b; font-weight: 500; margin-bottom: 2px; }
        .td-notif-content span { font-size: 0.72rem; color: #94a3b8; }
        .td-notif-read {
          width: 28px; height: 28px; background: #ecfdf5; color: #10b981;
          border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; transition: all 0.18s;
        }
        .td-notif-read:hover { background: #10b981; color: white; }

        /* shimmer */
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* responsive */
        @media (max-width: 900px) {
          .td-stats { grid-template-columns: 1fr 1fr; }
          .td-form-grid { grid-template-columns: 1fr; }
          .td-profile-stats { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 600px) {
          .td-section { padding: 14px; }
          .td-topbar  { padding: 12px 14px; }
          .td-stats   { grid-template-columns: 1fr 1fr; gap: 12px; }
          .td-welcome { padding: 20px; }
          .td-welcome-deco { display: none; }
          .td-res-grid { grid-template-columns: 1fr; }
          .td-toolbar  { flex-direction: column; align-items: flex-start; }
          .td-search-wrap { max-width: 100%; width: 100%; }
        }
      `}</style>
    </div>
  );
}