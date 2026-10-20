// admin/sections/ResourcesSection.js
import { motion } from "framer-motion";
import { Skeleton, typeConfig } from "./adminUtils";
import { downloadResource } from "../../api/services";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

export default function ResourcesSection({
  resources,
  resourceFilter,
  setResourceFilter,
  loading,
  setModal,
  handleDeleteResource,
}) {
  return (
    <motion.div
      key="resources"
      className="section-content"
      variants={stagger}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
    >
      <motion.div variants={fadeUp} className="section-toolbar">
        <div className="filter-chips">
          {["all", "lesson", "exam", "homework"].map(t => (
            <button
              key={t}
              className={`filter-chip ${resourceFilter === t ? "active" : ""}`}
              onClick={() => setResourceFilter(t)}
            >
              {t === "all" ? "الكل" : typeConfig[t]?.label}
            </button>
          ))}
        </div>
        <button
          className="primary-action-btn"
          onClick={() => setModal({ type: "addResource" })}
        >
          <i className="bi bi-cloud-upload-fill me-2"></i>رفع مورد جديد
        </button>
      </motion.div>

      <motion.div className="table-card" variants={fadeUp}>
        <div className="table-card-header">
          <h6><i className="bi bi-journal-bookmark-fill me-2 text-primary"></i>الموارد التعليمية</h6>
          <span className="count-badge">{resources.length} نتيجة</span>
        </div>
        {loading.resources ? (
          <div className="p-4"><Skeleton h={200} /></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العنوان</th><th>النوع</th><th>المادة</th>
                  <th>المستوى</th><th>الأستاذ</th><th>التحميلات</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r, i) => {
                  const tc = typeConfig[r.type] || typeConfig.lesson;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
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
                      <td>{r.download_count || 0}</td>
                      <td className="td-actions">
                        <button
                          className="tbl-action-btn view"
                          title="فتح"
                          onClick={() => downloadResource(r.id).catch(() => {})}
                        >
                          <i className="bi bi-eye-fill"></i>
                        </button>
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
                {resources.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">لا توجد موارد</td>
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
