// admin/sections/OverviewSection.js
import { motion } from "framer-motion";
import { AnimatedNumber, Skeleton, typeConfig } from "./adminUtils";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.88 }, visible: { opacity: 1, scale: 1 } };

export default function OverviewSection({
  stats,
  recentResources,
  topDownloaded,
  loading,
  setActiveSection,
  setModal,
  handleDeleteResource,
}) {
  const statCards = stats ? [
    { label: "المستخدمون",    value: stats.total_users,         icon: "bi-people-fill",           bg: "linear-gradient(135deg,#4f46e5,#7c3aed)" },
    { label: "الأساتذة",      value: stats.teachers,            icon: "bi-person-badge-fill",     bg: "linear-gradient(135deg,#0891b2,#0e7490)" },
    { label: "الدروس",        value: stats.total_lessons,       icon: "bi-journal-bookmark-fill", bg: "linear-gradient(135deg,#10b981,#059669)" },
    { label: "الفروض",        value: stats.total_exams + stats.total_homework, icon: "bi-clipboard-data-fill", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { label: "التحميلات",     value: stats.total_downloads,     icon: "bi-download",              bg: "linear-gradient(135deg,#ef4444,#dc2626)" },
    { label: "الإعلانات",     value: stats.active_announcements,icon: "bi-megaphone-fill",        bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
    { label: "السنة الدراسية",value: stats.current_year?.label || "—", icon: "bi-calendar-check-fill",                bg: "linear-gradient(135deg,#475569,#334155)", noCount: true },
  ] : [];

  return (
    <motion.div
      key="overview"
      className="section-content"
      variants={stagger}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
    >
      {/* Stat Grid */}
      {loading.dashboard ? (
        <div className="stats-grid mb-4">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="stat-card"><Skeleton h={80} /></div>
          ))}
        </div>
      ) : (
        <div className="stats-grid">
          {statCards.map((card, i) => (
            <motion.div
              key={i}
              className="stat-card"
              variants={scaleIn}
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
            >
              <div className="stat-icon-wrap" style={{ background: card.bg }}>
                <i className={`bi ${card.icon}`}></i>
              </div>
              <div className="stat-body">
                <div className="stat-value">
                  {card.noCount ? card.value : <AnimatedNumber target={Number(card.value || 0)} />}
                </div>
                <div className="stat-label">{card.label}</div>
              </div>
              <div className="stat-glow" style={{ background: card.bg }}></div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="charts-row">
        {/* Top downloaded bar chart */}
        <motion.div className="chart-card wide" variants={fadeUp}>
          <div className="chart-header">
            <h6><i className="bi bi-download me-2 text-primary"></i>الأكثر تحميلاً</h6>
          </div>
          {loading.dashboard ? <Skeleton h={180} /> : (
            <div className="bar-chart-wrap">
              {topDownloaded.map((r, i) => {
                const max = topDownloaded[0]?.download_count || 1;
                return (
                  <div key={r.id} className="bar-row">
                    <span className="bar-label" title={r.title}>{r.title?.substring(0, 22)}...</span>
                    <div className="bar-track">
                      <motion.div
                        className="bar-fill lessons"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.download_count / max) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      >
                        {r.download_count > 0 && <span>{r.download_count}</span>}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
              {topDownloaded.length === 0 && (
                <p className="text-center text-muted py-3">لا توجد بيانات</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div className="chart-card narrow" variants={fadeUp}>
          <div className="chart-header">
            <h6><i className="bi bi-lightning-charge-fill me-2 text-warning"></i>إجراءات سريعة</h6>
          </div>
          <div className="quick-actions-list">
            {[
              { label: "إضافة مستخدم جديد", icon: "bi-person-plus-fill", color: "#4f46e5", action: () => setModal({ type: "addUser" }) },
              { label: "نشر إعلان",           icon: "bi-megaphone-fill",    color: "#ef4444", action: () => setModal({ type: "addAnnouncement" }) },
              { label: "إدارة المستخدمين",    icon: "bi-people-fill",       color: "#10b981", action: () => setActiveSection("users") },
              { label: "رفع مورد تعليمي",     icon: "bi-cloud-upload-fill", color: "#f59e0b", action: () => setModal({ type: "addResource" }) },
              { label: "جداول الحصص",         icon: "bi-calendar-week-fill",color: "#8b5cf6", action: () => setActiveSection("timetable") },
              { label: "إعدادات النظام",      icon: "bi-gear-fill",         color: "#64748b", action: () => setActiveSection("settings") },
            ].map((a, i) => (
              <motion.button
                key={i}
                className="quick-action-btn"
                onClick={a.action}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="qa-icon" style={{ background: a.color + "20", color: a.color }}>
                  <i className={`bi ${a.icon}`}></i>
                </div>
                <span>{a.label}</span>
                <i className="bi bi-chevron-left qa-arrow"></i>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent uploads */}
      <motion.div className="table-card" variants={fadeUp}>
        <div className="table-card-header">
          <h6><i className="bi bi-clock-history me-2 text-info"></i>آخر الموارد المضافة</h6>
          <button className="see-all-btn" onClick={() => setActiveSection("resources")}>
            عرض الكل <i className="bi bi-chevron-left"></i>
          </button>
        </div>
        {loading.dashboard ? (
          <div className="p-4"><Skeleton h={120} /></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العنوان</th><th>النوع</th><th>المادة</th>
                  <th>المستوى</th><th>الأستاذ</th><th>التاريخ</th><th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {recentResources.map((r, i) => {
                  const tc = typeConfig[r.type] || typeConfig.lesson;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <td className="td-title">{r.title}</td>
                      <td>
                        <span className="type-chip" style={{ background: tc.bg, color: tc.color }}>
                          <i className={`bi ${tc.icon}`}></i> {tc.label}
                        </span>
                      </td>
                      <td>{r.subject?.name || "—"}</td>
                      <td>{r.grade_level?.name || "—"}</td>
                      <td>{r.uploader?.name || "—"}</td>
                      <td className="td-date">{r.created_at?.substring(0, 10)}</td>
                      <td>
                        <button
                          className="tbl-action-btn delete"
                          onClick={() => handleDeleteResource(r.id)}
                        >
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {recentResources.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">لا توجد موارد بعد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
