// admin/sections/TimetableSection.js
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getClassrooms, getSubjects, getTeachers, getAcademicYears, getTimetable, replaceTimetable, errMsg } from "../../api/services";

// ─── Constants ─────────────────────────────────────────────────────────────────
const DAYS = [
  { en: "Sunday",    ar: "الأحد" },
  { en: "Monday",    ar: "الاثنين" },
  { en: "Tuesday",   ar: "الثلاثاء" },
  { en: "Wednesday", ar: "الأربعاء" },
  { en: "Thursday",  ar: "الخميس" },
];

const TIME_SLOTS = [
  { start: "08:00", end: "09:00", label: "8:00 – 9:00",   session: "morning" },
  { start: "09:00", end: "10:00", label: "9:00 – 10:00",  session: "morning" },
  { start: "10:00", end: "11:00", label: "10:00 – 11:00", session: "morning" },
  { start: "11:00", end: "12:00", label: "11:00 – 12:00", session: "morning" },
  { start: "13:00", end: "14:00", label: "13:00 – 14:00", session: "afternoon" },
  { start: "14:00", end: "15:00", label: "14:00 – 15:00", session: "afternoon" },
  { start: "15:00", end: "16:00", label: "15:00 – 16:00", session: "afternoon" },
  { start: "16:00", end: "17:00", label: "16:00 – 17:00", session: "afternoon" },
];

const SUBJECT_COLORS = [
  "#4f46e5", "#0891b2", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
  "#84cc16", "#f97316",
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getSubjectColor(subjectId, subjects) {
  if (!subjectId) return "#94a3b8";
  const idx = subjects.findIndex(s => String(s.id) === String(subjectId));
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || "#94a3b8";
}

// Build a grid map: { "Sunday|08:00": slot }
function buildGridMap(slots) {
  const map = {};
  slots.forEach(slot => {
    const key = `${slot.day}|${slot.start_time?.substring(0, 5)}`;
    map[key] = slot;
  });
  return map;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = "100%", r = 8 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
  }} />
);

// ─── Cell Editor Modal ─────────────────────────────────────────────────────────
function CellModal({ cell, subjects, teachers, onSave, onClear, onClose }) {
  const [subjectId, setSubjectId]   = useState(cell.slot?.subject_id || cell.slot?.subject?.id || "");
  const [teacherId, setTeacherId]   = useState(cell.slot?.user_id || cell.slot?.teacher?.id || "");
  const [room, setRoom]             = useState(cell.slot?.room || "");
  const [isBreak, setIsBreak]       = useState(cell.slot?.is_break || false);

  const dayLabel = DAYS.find(d => d.en === cell.day)?.ar || cell.day;
  const timeSlot = TIME_SLOTS.find(t => t.start === cell.start);

  return (
    <motion.div
      className="tt-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="tt-modal"
        initial={{ opacity: 0, scale: 0.93, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 30 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="tt-modal-head">
          <div>
            <h6 className="tt-modal-title">تعديل الحصة</h6>
            <p className="tt-modal-sub">{dayLabel} · {timeSlot?.label}</p>
          </div>
          <button className="tt-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="tt-modal-body">
          {/* Break toggle */}
          <label className="tt-toggle-row">
            <span>استراحة / فراغ</span>
            <div
              className={`tt-toggle ${isBreak ? "on" : ""}`}
              onClick={() => setIsBreak(!isBreak)}
            >
              <div className="tt-toggle-knob" />
            </div>
          </label>

          {!isBreak && (
            <>
              {/* Subject */}
              <div className="tt-field">
                <label><i className="bi bi-book me-1"></i>المادة *</label>
                <div className="tt-select-wrap">
                  <select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                    <option value="">-- اختر المادة --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {subjectId && (
                    <span
                      className="tt-color-dot"
                      style={{ background: getSubjectColor(subjectId, subjects) }}
                    />
                  )}
                </div>
              </div>

              {/* Teacher */}
              <div className="tt-field">
                <label><i className="bi bi-person-badge me-1"></i>الأستاذ</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
                  <option value="">-- اختياري --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Room */}
              <div className="tt-field">
                <label><i className="bi bi-door-open me-1"></i>القاعة</label>
                <input
                  type="text"
                  placeholder="مثال: Q01"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="tt-modal-foot">
          {cell.slot && (
            <button className="tt-btn-danger" onClick={onClear}>
              <i className="bi bi-trash3-fill me-1"></i>مسح
            </button>
          )}
          <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
            <button className="tt-btn-cancel" onClick={onClose}>إلغاء</button>
            <button
              className="tt-btn-save"
              disabled={!isBreak && !subjectId}
              onClick={() => onSave({ subjectId, teacherId, room, isBreak })}
            >
              <i className="bi bi-check2 me-1"></i>حفظ
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function TimetableSection({ showToast }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [classrooms,   setClassrooms]   = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [academicYears,setAcadYears]    = useState([]);

  const [selectedClassroom,    setSelectedClassroom]    = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  const [slots,    setSlots]    = useState([]);   // raw slots from API
  const [gridMap,  setGridMap]  = useState({});   // { "Sunday|08:00": slot }
  const [pendingMap, setPending] = useState({});  // local edits not yet saved

  const [loadingMeta,     setLoadingMeta]     = useState(true);
  const [loadingTimetable,setLoadingTimetable]= useState(false);
  const [saving,          setSaving]          = useState(false);
  const [hasChanges,      setHasChanges]      = useState(false);

  const [editCell, setEditCell] = useState(null); // { day, start, slot|null }
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // ── Load meta data (classrooms, subjects, teachers, years) ────────────────
  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const [cls, subj, teach, years] = await Promise.all([
          getClassrooms(), getSubjects(), getTeachers(), getAcademicYears(),
        ]);
        setClassrooms(cls);
        setSubjects(subj);
        setTeachers(teach);
        setAcadYears(years);

        // auto-select current year
        const cur = years.find(y => y.is_current);
        if (cur) setSelectedAcademicYear(String(cur.id));
      } catch {
        showToast("تعذّر تحميل البيانات الأساسية", "error");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // ── Load timetable when classroom + year selected ─────────────────────────
  const fetchTimetable = useCallback(async () => {
    if (!selectedClassroom || !selectedAcademicYear) return;
    setLoadingTimetable(true);
    setPending({});
    setHasChanges(false);
    try {
      const flat = await getTimetable(Number(selectedClassroom), Number(selectedAcademicYear));
      setSlots(flat);
      setGridMap(buildGridMap(flat));
    } catch (err) {
      showToast(errMsg(err, "تعذّر تحميل جدول الحصص"), "error");
      setSlots([]);
      setGridMap({});
    } finally {
      setLoadingTimetable(false);
    }
  }, [selectedClassroom, selectedAcademicYear]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  // ── Merge grid + pending ───────────────────────────────────────────────────
  const mergedMap = { ...gridMap, ...pendingMap };

  // ── Cell click → open editor ───────────────────────────────────────────────
  const handleCellClick = (day, timeSlot) => {
    const key  = `${day}|${timeSlot.start}`;
    const slot = mergedMap[key] || null;
    setEditCell({ day, start: timeSlot.start, end: timeSlot.end, key, slot });
  };

  // ── Save cell edit locally ─────────────────────────────────────────────────
  const handleCellSave = ({ subjectId, teacherId, room, isBreak }) => {
    if (!editCell) return;
    const subj = subjects.find(s => String(s.id) === String(subjectId));
    const teach = teachers.find(t => String(t.id) === String(teacherId));

    const newSlot = {
      ...(mergedMap[editCell.key] || {}),
      day:        editCell.day,
      start_time: editCell.start,
      end_time:   editCell.end,
      subject_id: subjectId || null,
      user_id:    teacherId || null,
      room:       room || null,
      is_break:   isBreak,
      // keep display refs
      subject:  subj  || null,
      teacher:  teach || null,
      _dirty:   true,
    };

    setPending(p => ({ ...p, [editCell.key]: newSlot }));
    setHasChanges(true);
    setEditCell(null);
  };

  // ── Clear a cell ───────────────────────────────────────────────────────────
  const handleCellClear = () => {
    if (!editCell) return;
    setPending(p => ({ ...p, [editCell.key]: null }));
    setHasChanges(true);
    setEditCell(null);
  };

  // ── Bulk save to backend ───────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!selectedClassroom || !selectedAcademicYear) return;
    setSaving(true);
    try {
      // Build final slots from mergedMap, skip nulled cells
      const finalSlots = [];
      DAYS.forEach(({ en: day }) => {
        TIME_SLOTS.forEach(({ start, end }) => {
          const key  = `${day}|${start}`;
          const slot = mergedMap[key];
          if (!slot) return;
          if (slot.is_break) {
            finalSlots.push({
              day, start_time: start, end_time: end,
              subject_id: slot.subject_id || subjects[0]?.id, // break still needs a subject_id
              is_break: true,
              user_id: null,
              room: null,
            });
          } else if (slot.subject_id) {
            finalSlots.push({
              day, start_time: start, end_time: end,
              subject_id: slot.subject_id,
              user_id:    slot.user_id || null,
              room:       slot.room    || null,
              is_break:   false,
            });
          }
        });
      });

      await replaceTimetable(Number(selectedClassroom), Number(selectedAcademicYear), finalSlots);

      showToast("✅ تم حفظ جدول الحصص بنجاح");
      setHasChanges(false);
      await fetchTimetable(); // reload fresh
    } catch (err) {
      showToast(errMsg(err, "فشل حفظ الجدول"), "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset local changes ────────────────────────────────────────────────────
  const handleReset = () => {
    setPending({});
    setHasChanges(false);
  };

  // ── Classroom label helper ─────────────────────────────────────────────────
  const selectedClassroomObj = classrooms.find(c => String(c.id) === String(selectedClassroom));

  // ── Filled cell count ──────────────────────────────────────────────────────
  const filledCount = Object.values(mergedMap).filter(v => v && !v.is_break).length;
  const totalCells  = DAYS.length * TIME_SLOTS.length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      key="timetable"
      className="section-content"
      variants={stagger}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
    >
      {/* ── Header bar ── */}
      <motion.div variants={fadeUp} className="tt-header-bar">
        <div className="tt-header-left">
          <h5 className="tt-page-title">
            <i className="bi bi-calendar-week-fill me-2"></i>جداول الحصص
          </h5>
          <p className="tt-page-sub">إدارة جداول الحصص لكل قسم دراسي</p>
        </div>
        <div className="tt-header-actions">
          {hasChanges && (
            <>
              <motion.button
                className="tt-btn-reset"
                onClick={handleReset}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>تراجع
              </motion.button>
              <motion.button
                className="tt-btn-save-all"
                onClick={handleSaveAll}
                disabled={saving}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(16,185,129,0.4)" }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? (
                  <><span className="tt-spin" /> جاري الحفظ...</>
                ) : (
                  <><i className="bi bi-cloud-arrow-up-fill me-1"></i>حفظ الجدول</>
                )}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Selectors ── */}
      <motion.div variants={fadeUp} className="tt-selectors">
        <div className="tt-selector-group">
          <label><i className="bi bi-calendar3 me-1"></i>السنة الدراسية</label>
          {loadingMeta ? <Sk h={42} r={12} /> : (
            <select
              value={selectedAcademicYear}
              onChange={e => { setSelectedAcademicYear(e.target.value); setSelectedClassroom(""); }}
            >
              <option value="">-- اختر --</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="tt-selector-group">
          <label><i className="bi bi-door-open me-1"></i>القسم</label>
          {loadingMeta ? <Sk h={42} r={12} /> : (
            <select
              value={selectedClassroom}
              onChange={e => setSelectedClassroom(e.target.value)}
              disabled={!selectedAcademicYear}
            >
              <option value="">-- اختر القسم --</option>
              {classrooms
                .filter(c => !selectedAcademicYear || String(c.academic_year_id) === String(selectedAcademicYear))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.grade_level?.name ? `${c.grade_level.name} — ${c.name}` : c.name}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Stats chips */}
        {selectedClassroom && !loadingTimetable && (
          <motion.div
            className="tt-stats-chips"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="tt-chip blue">
              <i className="bi bi-grid-3x3-gap me-1"></i>{filledCount} حصة
            </span>
            <span className="tt-chip grey">
              <i className="bi bi-dash-circle me-1"></i>{totalCells - filledCount} فارغة
            </span>
            {hasChanges && (
              <span className="tt-chip amber">
                <i className="bi bi-pencil me-1"></i>تعديلات غير محفوظة
              </span>
            )}
          </motion.div>
        )}

        {/* View toggle */}
        {selectedClassroom && (
          <div className="tt-view-toggle">
            <button
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              title="عرض الجدول"
            >
              <i className="bi bi-grid-3x3"></i>
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              title="عرض اليوم"
            >
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {/* Empty state */}
        {!selectedClassroom && (
          <motion.div
            key="empty"
            className="tt-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="tt-empty-icon">
              <i className="bi bi-calendar-week"></i>
            </div>
            <h6>اختر القسم لعرض الجدول</h6>
            <p>حدّد السنة الدراسية والقسم من القائمة أعلاه لعرض جدول الحصص أو تعديله</p>
          </motion.div>
        )}

        {/* Loading */}
        {selectedClassroom && loadingTimetable && (
          <motion.div
            key="loading"
            className="tt-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(5)].map((_, i) => (
              <Sk key={i} h={60} r={12} />
            ))}
          </motion.div>
        )}

        {/* Grid view */}
        {selectedClassroom && !loadingTimetable && viewMode === "grid" && (
          <motion.div
            key="grid"
            className="tt-grid-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Classroom badge */}
            <div className="tt-classroom-badge">
              <i className="bi bi-building me-2"></i>
              {selectedClassroomObj?.grade_level?.name
                ? `${selectedClassroomObj.grade_level.name} — ${selectedClassroomObj.name}`
                : selectedClassroomObj?.name}
              <span className="tt-year-tag">
                {academicYears.find(y => String(y.id) === String(selectedAcademicYear))?.label}
              </span>
            </div>

            <div className="tt-table-scroll">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th className="tt-th-time">اليوم / الوقت</th>
                    {TIME_SLOTS.map(ts => (
                      <th key={ts.start} className={`tt-th-slot ${ts.session}`}>
                        <span className="tt-slot-label">{ts.label}</span>
                        <span className={`tt-session-tag ${ts.session}`}>
                          {ts.session === "morning" ? "صباحي" : "مسائي"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(({ en, ar }, ri) => (
                    <tr key={en} className="tt-row">
                      <td className="tt-day-cell">
                        <span className="tt-day-name">{ar}</span>
                      </td>
                      {TIME_SLOTS.map(ts => {
                        const key  = `${en}|${ts.start}`;
                        const slot = mergedMap[key];
                        const isDirty = pendingMap[key] !== undefined;
                        const subj = slot?.subject || (slot?.subject_id ? subjects.find(s => String(s.id) === String(slot.subject_id)) : null);
                        const color = subj ? getSubjectColor(subj.id, subjects) : "#94a3b8";

                        return (
                          <td key={ts.start} className="tt-cell-td">
                            <motion.div
                              className={`tt-cell ${slot ? (slot.is_break ? "break" : "filled") : "empty"} ${isDirty ? "dirty" : ""}`}
                              style={slot && !slot.is_break ? {
                                background: color + "18",
                                borderColor: color + "55",
                              } : {}}
                              onClick={() => handleCellClick(en, ts)}
                              whileHover={{ scale: 1.04, zIndex: 2 }}
                              whileTap={{ scale: 0.97 }}
                              layout
                            >
                              {isDirty && <span className="tt-dirty-dot" />}

                              {!slot && (
                                <span className="tt-cell-add">
                                  <i className="bi bi-plus-lg"></i>
                                </span>
                              )}

                              {slot?.is_break && (
                                <span className="tt-cell-break">
                                  <i className="bi bi-dash-circle"></i>
                                  <span>استراحة</span>
                                </span>
                              )}

                              {slot && !slot.is_break && subj && (
                                <div className="tt-cell-content">
                                  <span
                                    className="tt-cell-dot"
                                    style={{ background: color }}
                                  />
                                  <span className="tt-cell-name" style={{ color }}>
                                    {subj.name}
                                  </span>
                                  {slot.teacher && (
                                    <span className="tt-cell-teacher">
                                      {slot.teacher.name?.split(" ").slice(-1)[0]}
                                    </span>
                                  )}
                                  {slot.room && (
                                    <span className="tt-cell-room">
                                      <i className="bi bi-door-open me-1"></i>{slot.room}
                                    </span>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subject legend */}
            <div className="tt-legend">
              <span className="tt-legend-title">
                <i className="bi bi-palette me-1"></i>المواد:
              </span>
              {subjects.map(s => {
                const used = Object.values(mergedMap).some(
                  slot => slot && !slot.is_break && String(slot.subject_id) === String(s.id)
                );
                if (!used) return null;
                return (
                  <span key={s.id} className="tt-legend-item">
                    <span
                      className="tt-legend-dot"
                      style={{ background: getSubjectColor(s.id, subjects) }}
                    />
                    {s.name}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* List (day) view */}
        {selectedClassroom && !loadingTimetable && viewMode === "list" && (
          <motion.div
            key="list"
            className="tt-list-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {DAYS.map(({ en, ar }) => (
              <div key={en} className="tt-day-block">
                <div className="tt-day-header">
                  <i className="bi bi-calendar-day me-2"></i>{ar}
                </div>
                <div className="tt-day-slots">
                  {TIME_SLOTS.map(ts => {
                    const key  = `${en}|${ts.start}`;
                    const slot = mergedMap[key];
                    const isDirty = pendingMap[key] !== undefined;
                    const subj = slot?.subject || (slot?.subject_id ? subjects.find(s => String(s.id) === String(slot.subject_id)) : null);
                    const color = subj ? getSubjectColor(subj.id, subjects) : "#94a3b8";

                    return (
                      <motion.div
                        key={ts.start}
                        className={`tt-list-slot ${slot ? (slot.is_break ? "break" : "filled") : "empty"} ${isDirty ? "dirty" : ""}`}
                        style={slot && !slot.is_break ? { borderRightColor: color } : {}}
                        onClick={() => handleCellClick(en, ts)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isDirty && <span className="tt-dirty-dot small" />}
                        <div className="tt-list-time">
                          <i className={`bi ${ts.session === "morning" ? "bi-brightness-high" : "bi-moon-stars"} me-1`}></i>
                          {ts.label}
                        </div>
                        <div className="tt-list-content">
                          {!slot && (
                            <span className="tt-list-empty">
                              <i className="bi bi-plus-circle me-1"></i>إضافة حصة
                            </span>
                          )}
                          {slot?.is_break && (
                            <span className="tt-list-break">
                              <i className="bi bi-dash-circle me-1"></i>استراحة
                            </span>
                          )}
                          {slot && !slot.is_break && (
                            <>
                              <span className="tt-list-subj" style={{ color }}>
                                <span className="tt-color-pip" style={{ background: color }} />
                                {subj?.name || "—"}
                              </span>
                              {slot.teacher && (
                                <span className="tt-list-meta">
                                  <i className="bi bi-person me-1"></i>{slot.teacher.name}
                                </span>
                              )}
                              {slot.room && (
                                <span className="tt-list-meta">
                                  <i className="bi bi-door-open me-1"></i>{slot.room}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <i className="bi bi-pencil-square tt-list-edit-icon"></i>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cell Editor Modal ── */}
      <AnimatePresence>
        {editCell && (
          <CellModal
            cell={editCell}
            subjects={subjects}
            teachers={teachers}
            onSave={handleCellSave}
            onClear={handleCellClear}
            onClose={() => setEditCell(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Styles ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes tt-spin { to { transform: rotate(360deg); } }

        /* ── Layout ── */
        .tt-header-bar {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
        }
        .tt-page-title {
          margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;
          display: flex; align-items: center;
        }
        .tt-page-sub { margin: 4px 0 0; font-size: 0.78rem; color: #94a3b8; }
        .tt-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        /* ── Buttons ── */
        .tt-btn-save-all {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 22px; background: linear-gradient(135deg, #10b981, #059669);
          color: white; border: none; border-radius: 30px;
          font-size: 0.88rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(16,185,129,0.35);
          transition: all 0.25s; font-family: inherit;
        }
        .tt-btn-save-all:disabled { opacity: 0.7; cursor: not-allowed; }
        .tt-btn-reset {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 18px; background: #f8fafc;
          border: 1.5px solid #e2e8f0; border-radius: 30px;
          font-size: 0.86rem; font-weight: 600; color: #475569; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }
        .tt-btn-reset:hover { background: #fff1f2; border-color: #fca5a5; color: #ef4444; }
        .tt-spin {
          width: 15px; height: 15px;
          border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: tt-spin 0.7s linear infinite; display: inline-block;
        }

        /* ── Selectors ── */
        .tt-selectors {
          display: flex; align-items: flex-end; gap: 16px;
          flex-wrap: wrap; margin-bottom: 20px;
          background: white; border-radius: 16px; padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
        }
        .tt-selector-group { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 200px; }
        .tt-selector-group label {
          font-size: 0.8rem; font-weight: 700; color: #374151;
          display: flex; align-items: center;
        }
        .tt-selector-group select {
          padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          font-size: 0.88rem; color: #0f172a; background: #f8fafc;
          outline: none; transition: all 0.2s; font-family: inherit; cursor: pointer;
        }
        .tt-selector-group select:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .tt-selector-group select:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Chips ── */
        .tt-stats-chips { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .tt-chip {
          display: inline-flex; align-items: center;
          padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
        }
        .tt-chip.blue   { background: #e0e7ff; color: #4f46e5; }
        .tt-chip.grey   { background: #f1f5f9; color: #64748b; }
        .tt-chip.amber  { background: #fef3c7; color: #d97706; }

        /* ── View toggle ── */
        .tt-view-toggle {
          display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 10px;
          margin-right: auto;
        }
        .tt-view-toggle button {
          width: 34px; height: 34px; border: none; background: transparent;
          border-radius: 8px; color: #64748b; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
        }
        .tt-view-toggle button.active {
          background: white; color: #4f46e5; box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        /* ── Empty state ── */
        .tt-empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 380px; text-align: center; color: #94a3b8;
          background: white; border-radius: 20px; border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .tt-empty-icon {
          width: 90px; height: 90px; border-radius: 24px; margin-bottom: 20px;
          background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          display: flex; align-items: center; justify-content: center;
          font-size: 2.5rem; color: #4f46e5;
        }
        .tt-empty-state h6 { font-size: 1.05rem; font-weight: 700; color: #334155; margin-bottom: 8px; }
        .tt-empty-state p  { font-size: 0.85rem; max-width: 360px; line-height: 1.6; }

        /* ── Loading ── */
        .tt-loading {
          display: flex; flex-direction: column; gap: 12px;
          background: white; border-radius: 20px; padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
        }

        /* ── Classroom badge ── */
        .tt-classroom-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.92rem; font-weight: 700; color: #0f172a;
          margin-bottom: 16px; padding: 12px 18px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border-radius: 12px; width: fit-content;
        }
        .tt-year-tag {
          background: #4f46e5; color: white;
          font-size: 0.72rem; padding: 2px 10px; border-radius: 20px; margin-right: 6px;
        }

        /* ── Grid wrapper ── */
        .tt-grid-wrapper {
          background: white; border-radius: 20px; padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
        }
        .tt-table-scroll { overflow-x: auto; }

        /* ── Table ── */
        .tt-table {
          width: 100%; border-collapse: separate; border-spacing: 4px;
          min-width: 900px;
        }
        .tt-th-time {
          padding: 10px 14px; background: #f8fafc; border-radius: 10px;
          font-size: 0.78rem; font-weight: 700; color: #64748b;
          text-align: right; min-width: 80px;
        }
        .tt-th-slot {
          padding: 8px 6px; border-radius: 10px; text-align: center;
          min-width: 110px;
        }
        .tt-th-slot.morning   { background: linear-gradient(135deg, #fef9c3, #fde68a); }
        .tt-th-slot.afternoon { background: linear-gradient(135deg, #cffafe, #a5f3fc); }
        .tt-slot-label {
          display: block; font-size: 0.76rem; font-weight: 700; color: #374151; margin-bottom: 2px;
        }
        .tt-session-tag {
          display: inline-block; font-size: 0.65rem; padding: 1px 7px; border-radius: 10px; font-weight: 600;
        }
        .tt-session-tag.morning   { background: #fef3c7; color: #92400e; }
        .tt-session-tag.afternoon { background: #cffafe; color: #0e7490; }

        .tt-row:hover .tt-day-cell { background: #f0f4ff; }

        .tt-day-cell {
          padding: 6px 14px; background: #f8fafc; border-radius: 10px;
          text-align: right; transition: background 0.2s; white-space: nowrap;
        }
        .tt-day-name { font-size: 0.85rem; font-weight: 700; color: #0f172a; }

        .tt-cell-td { padding: 2px; vertical-align: middle; }
        .tt-cell {
          min-height: 68px; border-radius: 10px; border: 1.5px solid #e2e8f0;
          cursor: pointer; position: relative; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center;
          padding: 6px;
        }
        .tt-cell.empty   { background: #f8fafc; }
        .tt-cell.break   { background: #fafafa; border-style: dashed; border-color: #cbd5e1; }
        .tt-cell.filled  { }
        .tt-cell.dirty   { outline: 2px solid #f59e0b; outline-offset: 1px; }

        .tt-dirty-dot {
          position: absolute; top: 4px; left: 4px;
          width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;
        }
        .tt-dirty-dot.small { width: 7px; height: 7px; }

        .tt-cell-add {
          font-size: 1.1rem; color: #cbd5e1; transition: all 0.2s;
        }
        .tt-cell:hover .tt-cell-add { color: #4f46e5; transform: scale(1.2); }

        .tt-cell-break {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          font-size: 0.7rem; color: #94a3b8; font-weight: 600;
        }
        .tt-cell-break i { font-size: 0.9rem; }

        .tt-cell-content {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; width: 100%; text-align: center;
        }
        .tt-cell-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .tt-cell-name {
          font-size: 0.76rem; font-weight: 700; line-height: 1.3;
          word-break: break-word; max-width: 100%;
        }
        .tt-cell-teacher {
          font-size: 0.65rem; color: #64748b; font-weight: 500;
        }
        .tt-cell-room {
          font-size: 0.62rem; color: #94a3b8;
        }

        /* ── Legend ── */
        .tt-legend {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
          margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;
        }
        .tt-legend-title { font-size: 0.8rem; font-weight: 700; color: #475569; }
        .tt-legend-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; color: #374151; font-weight: 500;
        }
        .tt-legend-dot {
          width: 10px; height: 10px; border-radius: 3px;
        }

        /* ── List view ── */
        .tt-list-wrapper {
          display: flex; flex-direction: column; gap: 16px;
        }
        .tt-day-block {
          background: white; border-radius: 16px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
        }
        .tt-day-header {
          padding: 14px 20px; background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; font-weight: 700; font-size: 0.92rem;
          display: flex; align-items: center;
        }
        .tt-day-slots { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .tt-list-slot {
          display: flex; align-items: center; gap: 16px;
          padding: 12px 16px; border-radius: 10px; cursor: pointer;
          border-right: 4px solid transparent; transition: all 0.2s; position: relative;
        }
        .tt-list-slot.empty   { background: #f8fafc; border-right-color: #e2e8f0; }
        .tt-list-slot.break   { background: #fafafa; border-right-color: #cbd5e1; }
        .tt-list-slot.filled  { background: #fafeff; }
        .tt-list-slot.dirty   { outline: 2px solid #f59e0b; outline-offset: 1px; }
        .tt-list-slot:hover   { background: #f0f4ff; }

        .tt-list-time {
          min-width: 130px; font-size: 0.8rem; font-weight: 600; color: #374151;
          display: flex; align-items: center;
        }
        .tt-list-content {
          flex: 1; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .tt-list-empty { font-size: 0.82rem; color: #94a3b8; font-style: italic; }
        .tt-list-break { font-size: 0.82rem; color: #94a3b8; font-weight: 600; }
        .tt-list-subj {
          font-size: 0.88rem; font-weight: 700;
          display: flex; align-items: center; gap: 6px;
        }
        .tt-color-pip {
          width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;
        }
        .tt-list-meta {
          font-size: 0.76rem; color: #64748b;
          display: flex; align-items: center;
        }
        .tt-list-edit-icon { color: #cbd5e1; font-size: 0.9rem; margin-right: auto; }
        .tt-list-slot:hover .tt-list-edit-icon { color: #4f46e5; }

        /* ── Cell Modal ── */
        .tt-modal-overlay {
          position: fixed; inset: 0; z-index: 1200;
          background: rgba(15,23,42,0.55); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .tt-modal {
          background: white; border-radius: 20px; width: 100%; max-width: 420px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          overflow: hidden;
        }
        .tt-modal-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
        }
        .tt-modal-title { margin: 0; font-weight: 800; color: #0f172a; font-size: 1rem; }
        .tt-modal-sub   { margin: 4px 0 0; font-size: 0.78rem; color: #94a3b8; }
        .tt-modal-close {
          width: 30px; height: 30px; background: #f8fafc; border: none; border-radius: 8px;
          color: #94a3b8; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
          flex-shrink: 0;
        }
        .tt-modal-close:hover { background: #fee2e2; color: #ef4444; }

        .tt-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

        .tt-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; background: #f8fafc; border-radius: 12px;
          cursor: pointer;
          font-size: 0.85rem; font-weight: 600; color: #374151;
        }
        .tt-toggle {
          width: 44px; height: 24px; border-radius: 12px; background: #e2e8f0;
          position: relative; cursor: pointer; transition: background 0.25s;
        }
        .tt-toggle.on { background: #4f46e5; }
        .tt-toggle-knob {
          position: absolute; top: 2px; right: 2px;
          width: 20px; height: 20px; border-radius: 50%; background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          transition: transform 0.25s;
        }
        .tt-toggle.on .tt-toggle-knob { transform: translateX(-20px); }

        .tt-field { display: flex; flex-direction: column; gap: 7px; }
        .tt-field label {
          font-size: 0.8rem; font-weight: 700; color: #374151;
          display: flex; align-items: center;
        }
        .tt-select-wrap { position: relative; display: flex; align-items: center; }
        .tt-color-dot {
          position: absolute; left: 12px; width: 10px; height: 10px; border-radius: 50%;
          pointer-events: none;
        }
        .tt-field select, .tt-field input[type="text"] {
          width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          font-size: 0.88rem; color: #0f172a; background: #f8fafc;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .tt-field select:focus, .tt-field input[type="text"]:focus {
          border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.08);
        }

        .tt-modal-foot {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fafafa;
        }
        .tt-btn-danger {
          display: flex; align-items: center; padding: 8px 14px;
          background: #fee2e2; color: #ef4444; border: none; border-radius: 10px;
          font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          font-family: inherit;
        }
        .tt-btn-danger:hover { background: #fecaca; }
        .tt-btn-cancel {
          padding: 9px 18px; background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 0.85rem; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .tt-btn-cancel:hover { background: #f1f5f9; }
        .tt-btn-save {
          display: flex; align-items: center; padding: 9px 20px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; border: none; border-radius: 10px;
          font-size: 0.85rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 10px rgba(79,70,229,0.3);
          transition: all 0.2s; font-family: inherit;
        }
        .tt-btn-save:hover   { transform: translateY(-1px); }
        .tt-btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Responsive */
        @media (max-width: 768px) {
          .tt-selectors { flex-direction: column; }
          .tt-selector-group { min-width: 100%; }
          .tt-view-toggle { margin-right: 0; }
          .tt-table { min-width: 700px; }
          .tt-cell { min-height: 56px; }
        }
      `}</style>
    </motion.div>
  );
}
