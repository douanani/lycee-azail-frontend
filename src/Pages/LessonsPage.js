// pages/LessonsPage.js
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";

import { getGradeLevels, getResources, downloadResource, errMsg } from "../api/services";

// ─── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getSubjectColor = (subject = "") => {
  const map = {
    رياضيات: "primary",
    فيزياء: "info",
    "علوم طبيعية": "success",
    "لغة عربية": "warning",
    "اللغة الفرنسية": "danger",
    "اللغة الإنجليزية": "info",
    "تاريخ وجغرافيا": "secondary",
    "علوم إسلامية": "success",
    المعلوماتية: "dark",
    تكنولوجيا: "secondary",
    فلسفة: "dark",
    "التربية الفنية": "warning",
  };
  return map[subject] || "primary";
};

const getSubjectIcon = (subject = "") => {
  const map = {
    رياضيات: "bi-calculator-fill",
    فيزياء: "bi-lightbulb-fill",
    "علوم طبيعية": "bi-flower1",
    "لغة عربية": "bi-chat-right-text-fill",
    "اللغة الفرنسية": "bi-translate",
    "اللغة الإنجليزية": "bi-translate",
    "تاريخ وجغرافيا": "bi-globe2",
    "علوم إسلامية": "bi-book",
    المعلوماتية: "bi-cpu",
    تكنولوجيا: "bi-gear-fill",
    فلسفة: "bi-clipboard2",
    "التربية الفنية": "bi-palette-fill",
  };
  return map[subject] || "bi-journal-bookmark-fill";
};

// Skeleton placeholder for loading state
function SkeletonCard() {
  return (
    <div
      className="file-card"
      style={{ padding: "20px", display: "flex", alignItems: "center", gap: "15px" }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            height: 14,
            borderRadius: 8,
            background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            width: "70%",
          }}
        />
        <div
          style={{
            height: 10,
            borderRadius: 8,
            background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            width: "40%",
          }}
        />
      </div>
      <div
        style={{
          width: 90,
          height: 36,
          borderRadius: 30,
          background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LessonsPage() {
  // ── API state ──
  const [gradeLevels, setGradeLevels] = useState([]);   // [{id, name, code, ...}]
  const [subjects, setSubjects] = useState([]);          // [{id, name, ...}] for sidebar
  const [files, setFiles] = useState([]);                // resources from API
  const [meta, setMeta] = useState(null);                // pagination meta
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);

  // ── UI state ──
  const [selectedLevel, setSelectedLevel] = useState(null);   // grade level object
  const [selectedSubject, setSelectedSubject] = useState(null); // subject object
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [page, setPage] = useState(1);

  const filesRef = useRef(null);
  const searchTimer = useRef(null);

  // ── 1. Load grade levels on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingLevels(true);
        const levels = await getGradeLevels();
        setGradeLevels(levels);
        if (levels.length > 0) setSelectedLevel(levels[0]);
      } catch (err) {
        setError("تعذّر تحميل المستويات الدراسية. تحقق من الاتصال بالخادم.");
      } finally {
        setLoadingLevels(false);
      }
    })();
  }, []);

  // ── 2. Load subjects when grade level changes ──────────────────────────────
  useEffect(() => {
    if (!selectedLevel) return;
    (async () => {
      try {
        setLoadingSubjects(true);
        setSubjects([]);
        setSelectedSubject(null);
        setFiles([]);

        // The API returns grade level with its subjects via eager load
        const subs = selectedLevel.subjects ?? [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0]);
      } catch {
        setError("تعذّر تحميل المواد الدراسية.");
      } finally {
        setLoadingSubjects(false);
      }
    })();
  }, [selectedLevel]);

  // ── 3. Load resources when subject / search / page changes ────────────────
  const fetchFiles = useCallback(async () => {
    if (!selectedLevel || !selectedSubject) return;
    try {
      setLoadingFiles(true);
      setError(null);
      const res = await getResources({
        type: "lesson",
        gradeLevelId: selectedLevel.id,
        subjectId: selectedSubject.id,
        page,
        search: debouncedSearch || undefined,
      });
      setFiles(res.data);
      setMeta(res.meta);
    } catch {
      setError("تعذّر تحميل الدروس.");
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedLevel, selectedSubject, debouncedSearch, page]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // ── Debounce search ────────────────────────────────────────────────────────
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  };

  const handleSubjectChange = (subj) => {
    setSelectedSubject(subj);
    setPage(1);
    if (window.innerWidth < 992) {
      setTimeout(
        () => filesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    }
  };

  // ── Human-readable file size ───────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
    return bytes + " B";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        icon="bi-journal-bookmark-fill"
        title="مكتبة الدروس"
        sub="جميع الدروس مرتبة حسب المستوى والمادة — قابلة للتحميل"
      />

      <div className="container py-4">
        {/* Global error */}
        {error && (
          <motion.div
            className="alert alert-danger d-flex align-items-center gap-2 rounded-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <span>{error}</span>
            <button
              className="btn btn-sm btn-outline-danger ms-auto"
              onClick={fetchFiles}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>إعادة المحاولة
            </button>
          </motion.div>
        )}

        {/* ── Search ── */}
        <motion.div
          className="row g-3 mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="col-md-8 mx-auto">
            <div className="input-group shadow-lg rounded-pill overflow-hidden">
              <span className="input-group-text bg-white border-0 ps-4">
                {loadingFiles ? (
                  <div
                    className="spinner-border spinner-border-sm text-primary"
                    role="status"
                  />
                ) : (
                  <i className="bi bi-search text-primary"></i>
                )}
              </span>
              <input
                type="text"
                className="form-control border-0 py-3 ps-2"
                placeholder="ابحث عن درس..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <motion.button
                  className="btn btn-link text-secondary border-0 pe-4"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setPage(1);
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <i className="bi bi-x-lg"></i>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Level Tabs ── */}
        <motion.div
          className="level-tabs-wrapper mb-5"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {loadingLevels ? (
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  style={{
                    width: 140,
                    height: 44,
                    borderRadius: 50,
                    background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              {gradeLevels.map((lvl, index) => (
                <motion.button
                  key={lvl.id}
                  onClick={() => handleLevelChange(lvl)}
                  className={`level-tab ${selectedLevel?.id === lvl.id ? "active" : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <i className="bi bi-mortarboard-fill"></i>
                  <span>{lvl.name}</span>
                  {selectedLevel?.id === lvl.id && (
                    <motion.div
                      className="active-indicator"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        <div className="row g-4">
          {/* ── Subjects Sidebar ── */}
          <motion.div
            className="col-lg-3"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="subjects-sidebar">
              <div className="sidebar-header">
                <i className="bi bi-grid-3x3-gap-fill"></i>
                <h6>المواد الدراسية</h6>
                <span className="subject-count">{subjects.length}</span>
              </div>

              <div className="subjects-list">
                {loadingSubjects ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        margin: "10px 20px",
                        height: 44,
                        borderRadius: 12,
                        background:
                          "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                  ))
                ) : (
                  <AnimatePresence mode="wait">
                    {subjects.map((subj, index) => {
                      const color = getSubjectColor(subj.name);
                      const icon = subj.icon || getSubjectIcon(subj.name);

                      return (
                        <motion.button
                          key={subj.id}
                          onClick={() => handleSubjectChange(subj)}
                          className={`subject-item ${selectedSubject?.id === subj.id ? "active" : ""}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`subject-icon bg-${color}-subtle`}>
                            <i className={`bi ${icon} text-${color}`}></i>
                          </div>
                          <div className="subject-info">
                            <span className="subject-name">{subj.name}</span>
                          </div>
                          {selectedSubject?.id === subj.id && (
                            <motion.div
                              className="active-bar"
                              layoutId="activeSubject"
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                              }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Files Section ── */}
          <motion.div
            className="col-lg-9"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="files-section" ref={filesRef}>
              {/* Header */}
              <div className="files-header">
                <div className="header-info">
                  <motion.div
                    className={`subject-badge bg-${getSubjectColor(selectedSubject?.name)}-subtle`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <i
                      className={`bi ${
                        selectedSubject?.icon || getSubjectIcon(selectedSubject?.name)
                      } text-${getSubjectColor(selectedSubject?.name)}`}
                    ></i>
                  </motion.div>
                  <div>
                    <h3>{selectedSubject?.name ?? "—"}</h3>
                    <p className="level-name">{selectedLevel?.name ?? ""}</p>
                  </div>
                </div>

                <div className="header-actions">
                  <motion.div
                    className="file-count-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <i className="bi bi-file-earmark-text"></i>
                    <span>{meta?.total ?? files.length} درس</span>
                  </motion.div>

                  <div className="view-toggle">
                    <motion.button
                      className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                      onClick={() => setViewMode("list")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className="bi bi-list-ul"></i>
                    </motion.button>
                    <motion.button
                      className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className="bi bi-grid-3x3"></i>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Files Content */}
              <AnimatePresence mode="wait">
                {loadingFiles ? (
                  <motion.div
                    key="skeleton"
                    className="files-container list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </motion.div>
                ) : files.length === 0 ? (
                  <motion.div
                    key="empty"
                    className="empty-state"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="empty-icon"
                      animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                    >
                      <i className="bi bi-search"></i>
                    </motion.div>
                    <h5>لا توجد نتائج</h5>
                    <p>
                      {debouncedSearch
                        ? "لم نتمكن من العثور على دروس تطابق بحثك"
                        : "لا توجد دروس متاحة لهذه المادة حالياً"}
                    </p>
                    {debouncedSearch && (
                      <motion.button
                        className="clear-search-btn"
                        onClick={() => {
                          setSearch("");
                          setDebouncedSearch("");
                          setPage(1);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        مسح البحث
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={viewMode}
                    className={`files-container ${viewMode}`}
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                  >
                    {files.map((file) => (
                      <motion.div
                        className="file-card"
                        key={file.id}
                        variants={staggerItem}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 15px 30px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="file-card-content">
                          <div className="file-icon-wrapper">
                            <motion.div
                              className="file-icon"
                              whileHover={{ rotate: 5, scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <i className="bi bi-file-pdf-fill"></i>
                            </motion.div>
                          </div>

                          <div className="file-info">
                            <h6 className="file-name">{file.title}</h6>
                            <div className="file-meta">
                              <span className="file-type">
                                <i className="bi bi-filetype-pdf"></i>
                                {file.file_type?.toUpperCase() || "PDF"}
                              </span>
                              {file.file_size && (
                                <span className="file-size">
                                  <i className="bi bi-hdd-stack"></i>
                                  {file.file_size_human || formatSize(file.file_size)}
                                </span>
                              )}
                              {file.semester && (
                                <span className="file-semester">
                                  <i className="bi bi-bookmark"></i>
                                  {file.semester}
                                </span>
                              )}
                            </div>
                            {file.description && (
                              <p className="file-desc">{file.description}</p>
                            )}
                          </div>

                          <motion.button
                            type="button"
                            className="download-btn"
                            onClick={() => downloadResource(file.id).catch((e) => setError(errMsg(e, "تعذّر تحميل الملف")))}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <i className="bi bi-download"></i>
                            <span>تحميل</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Pagination ── */}
              {meta && meta.last_page > 1 && !loadingFiles && (
                <motion.div
                  className="pagination-wrapper"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>

                  {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    className="page-btn"
                    disabled={page === meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Level Tabs */
        .level-tab {
          position: relative;
          padding: 12px 24px;
          border: none;
          background: white;
          border-radius: 50px;
          font-weight: 600;
          color: #6c757d;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .level-tab i { font-size: 1.1rem; }
        .level-tab.active {
          color: white;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          box-shadow: 0 4px 15px rgba(102,126,234,0.4);
        }
        .active-indicator {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: white;
          border-radius: 3px 3px 0 0;
        }

        /* Sidebar */
        .subjects-sidebar {
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.05);
          overflow: hidden;
          position: sticky;
          top: 20px;
        }
        .sidebar-header {
          padding: 20px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-header i { font-size: 1.3rem; }
        .sidebar-header h6 { margin: 0; font-weight: 600; flex: 1; }
        .subject-count {
          background: rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .subjects-list { padding: 10px 0; }
        .subject-item {
          position: relative;
          width: 100%;
          padding: 15px 20px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: right;
        }
        .subject-item:hover { background: #f8f9fa; }
        .subject-item.active {
          background: linear-gradient(90deg,#f8f9ff 0%,white 100%);
        }
        .subject-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }
        .subject-item:hover .subject-icon { transform: scale(1.1); }
        .subject-info {
          flex: 1;
          display: flex; flex-direction: column; gap: 4px;
        }
        .subject-name { font-weight: 600; color: #2d3748; }
        .active-bar {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          border-radius: 3px 0 0 3px;
        }

        /* Files section */
        .files-section {
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.05);
          overflow: hidden;
          min-height: 500px;
        }
        .files-header {
          padding: 25px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .header-info { display: flex; align-items: center; gap: 15px; }
        .subject-badge {
          width: 50px; height: 50px;
          border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
        }
        .header-info h3 { margin: 0; font-weight: 700; color: #1a202c; }
        .level-name { margin: 5px 0 0; color: #718096; font-size: 0.9rem; }
        .header-actions { display: flex; align-items: center; gap: 15px; }
        .file-count-badge {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          background: #f7fafc;
          border-radius: 25px;
          color: #4a5568;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .view-toggle {
          display: flex; gap: 5px;
          background: #f7fafc;
          padding: 4px;
          border-radius: 12px;
        }
        .view-btn {
          width: 36px; height: 36px;
          border: none; background: transparent;
          border-radius: 10px;
          color: #718096;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .view-btn.active {
          background: white; color: #667eea;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Files container */
        .files-container { padding: 25px; }
        .files-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px,1fr));
          gap: 20px;
        }
        .files-container.list .file-card { margin-bottom: 15px; }
        .file-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .file-card-content {
          padding: 20px;
          display: flex; align-items: center; gap: 15px;
        }
        .grid .file-card-content {
          flex-direction: column; text-align: center;
        }
        .file-icon-wrapper { flex-shrink: 0; }
        .file-icon {
          width: 50px; height: 50px;
          background: linear-gradient(135deg,#fee2e2 0%,#fecaca 100%);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: #dc2626;
          font-size: 1.8rem;
        }
        .grid .file-icon { width: 80px; height: 80px; font-size: 2.5rem; margin-bottom: 10px; }
        .file-info { flex: 1; }
        .file-name { margin: 0 0 8px; font-weight: 600; color: #1a202c; line-height: 1.4; }
        .file-desc {
          margin: 6px 0 0;
          font-size: 0.8rem;
          color: #718096;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .file-meta { display: flex; gap: 12px; flex-wrap: wrap; }
        .grid .file-meta { justify-content: center; }
        .file-type, .file-size, .file-semester {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.8rem; color: #718096;
        }
        .download-btn {
          border: none; cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color: white;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .download-btn:hover { color: white; box-shadow: 0 5px 15px rgba(102,126,234,0.4); }
        .grid .download-btn { width: 100%; justify-content: center; margin-top: 15px; }

        /* Empty state */
        .empty-state { padding: 60px 20px; text-align: center; }
        .empty-icon {
          width: 100px; height: 100px;
          margin: 0 auto 20px;
          background: #f7fafc;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: #a0aec0;
        }
        .empty-state h5 { margin: 0 0 10px; font-weight: 600; color: #2d3748; }
        .empty-state p { color: #718096; margin-bottom: 20px; }
        .clear-search-btn {
          padding: 10px 25px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 25px;
          color: #4a5568;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .clear-search-btn:hover { background: white; border-color: #667eea; color: #667eea; }

        /* Pagination */
        .pagination-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 20px 25px;
          border-top: 1px solid #e2e8f0;
        }
        .page-btn {
          min-width: 36px; height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 10px;
          color: #4a5568;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 0 10px;
        }
        .page-btn:hover:not(:disabled) { border-color: #667eea; color: #667eea; }
        .page-btn.active {
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          border-color: transparent;
          color: white;
        }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Subtle color classes */
        .bg-primary-subtle   { background: #e0e7ff; }
        .bg-info-subtle      { background: #cffafe; }
        .bg-success-subtle   { background: #d1fae5; }
        .bg-warning-subtle   { background: #fef3c7; }
        .bg-danger-subtle    { background: #fee2e2; }
        .bg-secondary-subtle { background: #e2e8f0; }
        .bg-dark-subtle      { background: #e5e7eb; }

        /* Responsive */
        @media (max-width: 992px) {
          .files-section { scroll-margin-top: 20px; }
        }
        @media (max-width: 768px) {
          .files-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; justify-content: space-between; }
          .files-container.grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </motion.div>
  );
}