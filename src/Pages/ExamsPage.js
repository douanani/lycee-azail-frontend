// pages/ExamsPage.js
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";
import { ExamsSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Feedback";
import { getGradeLevels, getResources, downloadResource } from "../api/services";

const fmtSize = (b) => {
  if (!b) return "—";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

/** DB rows → { levelName: { subjectName: [{id,name,size,type,date}] } } */
function buildExams(levels, resources) {
  const out = {};
  const byKey = {};
  levels.forEach((l) => {
    out[l.name] = {};
    (l.subjects || []).forEach((sub) => {
      out[l.name][sub.name] = [];
      byKey[`${l.id}|${sub.id}`] = out[l.name][sub.name];
    });
  });
  resources.forEach((r) => {
    const list = byKey[`${r.grade_level_id}|${r.subject_id}`];
    if (list) list.push({ id: r.id, name: r.title, size: fmtSize(r.file_size), type: r.type, date: r.created_at?.substring(0, 10) });
  });
  return out;
}

/** Subject name → { color, icon } from the DB (subjects.color is a hex string). */
function buildSubjectMeta(levels) {
  const meta = {};
  levels.forEach((l) => (l.subjects || []).forEach((sub) => {
    meta[sub.name] = { color: sub.color, icon: sub.icon };
  }));
  return meta;
}

// Enhanced animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function ExamsPage() {
  const [toast, toastEl] = useToast();
  const [exams, setExams] = useState({});
  const [meta, setMeta] = useState({});
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [examType, setExamType] = useState("all"); // 'all', 'exam', 'homework'
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  useEffect(() => {
    (async () => {
      try {
        const [levels, res] = await Promise.all([
          getGradeLevels(),
          getResources({ types: ["exam", "homework"], perPage: 1000 }),
        ]);
        const built = buildExams(levels, res.data);
        setExams(built);
        setMeta(buildSubjectMeta(levels));
        const first = Object.keys(built)[0] || null;
        setSelectedLevel(first);
        setSelectedSubject(first ? Object.keys(built[first])[0] || null : null);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  const handleLevel = (lvl) => {
    setSelectedLevel(lvl);
    setSelectedSubject(Object.keys(exams[lvl] || {})[0] || null);
  };

  const subjects = exams[selectedLevel] || {};
  
  // Filter by exam type
  const filterByType = (files) => {
    if (examType === "all") return files;
    return files.filter(f => f.type === examType);
  };

  const files = filterByType((subjects[selectedSubject] || []).filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || search === "",
  ));

  // Subject color / icon come from the DB (set in the admin Settings screen)
  const getSubjectColor = (subject) => meta[subject]?.color || "#4f46e5";
  const getSubjectIcon = (subject) => meta[subject]?.icon || "bi-journal-bookmark-fill";

  // Get exam type badge
  const getExamTypeBadge = (type) => {
    if (type === "exam") {
      return {
        text: "اختبار",
        class: "exam-badge",
        icon: "bi-pencil-square"
      };
    }
    return {
      text: "فرض",
      class: "homework-badge",
      icon: "bi-journal-text"
    };
  };

  if (status !== "ready" || Object.keys(exams).length === 0) {
    return (
      <div>
        <PageHeader icon="bi-pencil-square" title="الاختبارات والفروض" sub="نماذج الاختبارات والفروض" />
        {status === "loading" ? (
          <div className="container py-4" dir="rtl"><ExamsSkeleton /></div>
        ) : (
          <div className="container py-5 text-center text-muted" dir="rtl">
            {status === "error" && "تعذّر تحميل البيانات. حاول مرة أخرى لاحقاً."}
            {status === "ready" && "لا توجد بيانات."}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        icon="bi-pencil-square-fill"
        title="الفروض و الاختبارات"
        sub="جميع الفروض والاختبارات مرتبة حسب المستوى والمادة — قابلة للتحميل"
      />

      <div className="container py-4">
        {/* Search Bar with Filter */}
        <motion.div
          className="row g-3 mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="col-md-8 mx-auto">
            <div className="search-wrapper position-relative">
              <div className="input-group shadow-lg rounded-pill overflow-hidden">
                <span className="input-group-text bg-white border-0 ps-4">
                  <i className="bi bi-search text-primary"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-0 py-3 ps-2"
                  placeholder="ابحث عن فرض أو اختبار..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <motion.button
                    className="btn btn-link text-secondary border-0 pe-4"
                    onClick={() => setSearch("")}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Level Tabs - Enhanced Design */}
        <motion.div
          className="level-tabs-wrapper mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="d-flex gap-2 flex-wrap justify-content-center">
            {Object.keys(exams).map((lvl, index) => (
              <motion.button
                key={lvl}
                onClick={() => handleLevel(lvl)}
                className={`level-tab ${selectedLevel === lvl ? "active" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="bi bi-mortarboard-fill"></i>
                <span>{lvl}</span>
                {selectedLevel === lvl && (
                  <motion.div
                    className="active-indicator"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Exam Type Filter */}
        <motion.div
          className="exam-type-filter mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="d-flex gap-3 justify-content-center">
            <motion.button
              className={`type-filter-btn ${examType === "all" ? "active" : ""}`}
              onClick={() => setExamType("all")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="bi bi-grid-3x3-gap-fill"></i>
              <span>الكل</span>
            </motion.button>
            <motion.button
              className={`type-filter-btn exam ${examType === "exam" ? "active" : ""}`}
              onClick={() => setExamType("exam")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="bi bi-pencil-square"></i>
              <span>اختبارات</span>
            </motion.button>
            <motion.button
              className={`type-filter-btn homework ${examType === "homework" ? "active" : ""}`}
              onClick={() => setExamType("homework")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="bi bi-journal-text"></i>
              <span>فروض</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="row g-4">
          {/* Subject Sidebar - Enhanced */}
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
                <span className="subject-count">
                  {Object.keys(subjects).length}
                </span>
              </div>

              <div className="subjects-list">
                <AnimatePresence mode="wait">
                  {Object.keys(subjects).map((subj, index) => {
                    const color = getSubjectColor(subj);
                    const icon = getSubjectIcon(subj);
                    const fileCount = subjects[subj].length;

                    return (
                      <motion.button
                        key={subj}
                        onClick={() => setSelectedSubject(subj)}
                        className={`subject-item ${selectedSubject === subj ? "active" : ""}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="subject-icon" style={{ background: `${color}1f` }}>
                          <i className={`bi ${icon}`} style={{ color }}></i>
                        </div>
                        <div className="subject-info">
                          <span className="subject-name">{subj}</span>
                          <span className="subject-files">{fileCount} ملف</span>
                        </div>
                        {selectedSubject === subj && (
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
              </div>
            </div>
          </motion.div>

          {/* Files Section - Enhanced */}
          <motion.div
            className="col-lg-9"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="files-section">
              {/* Header */}
              <div className="files-header">
                <div className="header-info">
                  <motion.div
                    className="subject-badge"
                    style={{ background: `${getSubjectColor(selectedSubject)}1f` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <i
                      className={`bi ${getSubjectIcon(selectedSubject)}`}
                      style={{ color: getSubjectColor(selectedSubject) }}
                    ></i>
                  </motion.div>
                  <div>
                    <h3>{selectedSubject}</h3>
                    <p className="level-name">{selectedLevel}</p>
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
                    <span>{files.length} ملف</span>
                  </motion.div>

                  {/* View Mode Toggle */}
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
                {files.length === 0 ? (
                  <motion.div
                    className="empty-state"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="empty-icon"
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, -5, 5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    >
                      <i className="bi bi-search"></i>
                    </motion.div>
                    <h5>لا توجد نتائج</h5>
                    <p>لم نتمكن من العثور على فروض أو اختبارات تطابق بحثك</p>
                    <motion.button
                      className="clear-search-btn"
                      onClick={() => setSearch("")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      مسح البحث
                    </motion.button>
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
                    {files.map((file, i) => {
                      const badge = getExamTypeBadge(file.type);
                      return (
                        <motion.div
                          className="file-card"
                          key={i}
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
                                className={`file-icon ${file.type}`}
                                whileHover={{ rotate: 5, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <i className={`bi ${badge.icon}`}></i>
                              </motion.div>
                            </div>

                            <div className="file-info">
                              <div className="file-header">
                                <h6 className="file-name">{file.name}</h6>
                                <div className={`exam-badge ${badge.class}`}>
                                  <i className={`bi ${badge.icon}`}></i>
                                  <span>{badge.text}</span>
                                </div>
                              </div>
                              <div className="file-meta">
                                <span className="file-type">
                                  <i className="bi bi-filetype-pdf"></i>
                                  PDF
                                </span>
                                <span className="file-size">
                                  <i className="bi bi-hdd-stack"></i>
                                  {file.size}
                                </span>
                                {file.date && (
                                  <span className="file-date">
                                    <i className="bi bi-calendar"></i>
                                    {file.date}
                                  </span>
                                )}
                              </div>
                            </div>

                            <motion.button
                              type="button"
                              className="download-btn"
                              onClick={() => downloadResource(file.id).catch(() => toast("تعذّر تحميل الملف", "error"))}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <i className="bi bi-download"></i>
                              <span>تحميل</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        /* Level Tabs */
        .level-tab {
          position: relative;
          padding: 12px 24px;
          border: none;
          background: white;
          border-radius: 50px;
          font-weight: 600;
          color: #6c757d;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .level-tab i {
          font-size: 1.1rem;
        }

        .level-tab.active {
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .active-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: white;
          border-radius: 3px 3px 0 0;
        }

        /* Exam Type Filter */
        .exam-type-filter {
          padding: 0 15px;
        }

        .type-filter-btn {
          padding: 10px 25px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 50px;
          font-weight: 600;
          color: #718096;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .type-filter-btn i {
          font-size: 1.1rem;
        }

        .type-filter-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .type-filter-btn.exam.active {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .type-filter-btn.homework.active {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        /* Subjects Sidebar */
        .subjects-sidebar {
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          position: sticky;
          top: 20px;
        }

        .sidebar-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-header i {
          font-size: 1.3rem;
        }

        .sidebar-header h6 {
          margin: 0;
          font-weight: 600;
          flex: 1;
        }

        .subject-count {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .subjects-list {
          padding: 10px 0;
        }

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

        .subject-item:hover {
          background: #f8f9fa;
        }

        .subject-item.active {
          background: linear-gradient(90deg, #f8f9ff 0%, white 100%);
        }

        .subject-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }

        .subject-item:hover .subject-icon {
          transform: scale(1.1);
        }

        .subject-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .subject-name {
          font-weight: 600;
          color: #2d3748;
        }

        .subject-files {
          font-size: 0.75rem;
          color: #718096;
        }

        .active-bar {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 3px 0 0 3px;
        }

        /* Files Section */
        .files-section {
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
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

        .header-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .subject-badge {
          width: 50px;
          height: 50px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .header-info h3 {
          margin: 0;
          font-weight: 700;
          color: #1a202c;
        }

        .level-name {
          margin: 5px 0 0;
          color: #718096;
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .file-count-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f7fafc;
          border-radius: 25px;
          color: #4a5568;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .view-toggle {
          display: flex;
          gap: 5px;
          background: #f7fafc;
          padding: 4px;
          border-radius: 12px;
        }

        .view-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          border-radius: 10px;
          color: #718096;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-btn.active {
          background: white;
          color: #667eea;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Files Container */
        .files-container {
          padding: 25px;
        }

        .files-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .files-container.list .file-card {
          margin-bottom: 15px;
        }

        .file-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .file-card-content {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .grid .file-card-content {
          flex-direction: column;
          text-align: center;
        }

        .file-icon-wrapper {
          flex-shrink: 0;
        }

        .file-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }

        .file-icon.exam {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
        }

        .file-icon.homework {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #059669;
        }

        .grid .file-icon {
          width: 80px;
          height: 80px;
          font-size: 2.5rem;
          margin-bottom: 10px;
        }

        .file-info {
          flex: 1;
        }

        .file-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .file-name {
          margin: 0;
          font-weight: 600;
          color: #1a202c;
          line-height: 1.4;
          flex: 1;
        }

        .exam-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .exam-badge.exam-badge {
          background: #fee2e2;
          color: #dc2626;
        }

        .exam-badge.homework-badge {
          background: #d1fae5;
          color: #059669;
        }

        .file-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .grid .file-meta {
          justify-content: center;
        }

        .file-type,
        .file-size,
        .file-date {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
          color: #718096;
        }

        .download-btn {
          border: none; cursor: pointer; font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .download-btn:hover {
          color: white;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .grid .download-btn {
          width: 100%;
          justify-content: center;
          margin-top: 15px;
        }

        /* Empty State */
        .empty-state {
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto 20px;
          background: #f7fafc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #a0aec0;
        }

        .empty-state h5 {
          margin: 0 0 10px;
          font-weight: 600;
          color: #2d3748;
        }

        .empty-state p {
          color: #718096;
          margin-bottom: 20px;
        }

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

        .clear-search-btn:hover {
          background: white;
          border-color: #667eea;
          color: #667eea;
        }

        /* Utility classes for background colors */
        .bg-primary-subtle {
          background: #e0e7ff;
        }
        .bg-info-subtle {
          background: #cffafe;
        }
        .bg-success-subtle {
          background: #d1fae5;
        }
        .bg-warning-subtle {
          background: #fef3c7;
        }
        .bg-danger-subtle {
          background: #fee2e2;
        }
        .bg-secondary-subtle {
          background: #e2e8f0;
        }
        .bg-purple-subtle {
          background: #ede9fe;
        }
        .bg-teal-subtle {
          background: #ccfbf1;
        }

        .text-purple {
          color: #8b5cf6;
        }
        .text-teal {
          color: #14b8a6;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .files-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .files-container.grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {toastEl}
    </motion.div>
  );
}