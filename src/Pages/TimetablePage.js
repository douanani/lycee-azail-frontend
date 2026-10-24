// pages/TimetablePage.js
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";
import { HOURS, DAYS } from "../Data/constants";
import { getTimetableOverview } from "../api/services";

const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const pad = (t) => (t || "").substring(0, 5).padStart(5, "0");

/** DB rows → { "قسم": { "الأحد": [8 subject names, "—" when empty] } } */
function buildTimetable({ classrooms, slots }) {
  const names = classrooms.map((c) => c.name);
  const label = (c) => (names.filter((n) => n === c.name).length > 1 ? `${c.grade_level?.name || ""} ${c.name}`.trim() : c.name);
  const hourIdx = Object.fromEntries(HOURS.map((h, i) => [pad(h), i]));
  const out = {};
  const meta = {}; // subject name → { color, icon } straight from the DB
  const byId = {};
  classrooms.forEach((c) => {
    const grid = {};
    DAYS.forEach((d) => { grid[d] = Array(HOURS.length).fill("—"); });
    out[label(c)] = grid;
    byId[c.id] = grid;
  });
  slots.forEach((sl) => {
    const grid = byId[sl.classroom_id];
    const di = DAY_EN.indexOf(sl.day);
    const hi = hourIdx[pad(sl.start_time)];
    if (!grid || di < 0 || hi === undefined || sl.is_break || !sl.subject) return;
    grid[DAYS[di]][hi] = sl.subject.name;
    meta[sl.subject.name] = { color: sl.subject.color, icon: sl.subject.icon };
  });
  return { data: out, meta };
}


export default function TimetablePage() {
  const [tt, setTt] = useState({ data: {}, meta: {}, year: null });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const classes = Object.keys(tt.data);
  const [selected, setSelected] = useState(null);
  const [currentDay, setCurrentDay] = useState(null);
  const [viewMode, setViewMode] = useState(typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"); // 'week' or 'day'
  const grid = tt.data[selected] || {};

  useEffect(() => {
    getTimetableOverview()
      .then((ov) => {
        const built = buildTimetable(ov);
        setTt({ ...built, year: ov.year });
        setSelected(Object.keys(built.data)[0] || null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Get current day of week
  useEffect(() => {
    const days = DAYS;
    const today = new Date().getDay();
    // Fri/Sat: no school, show the first day so the day view is never empty
    setCurrentDay(today >= 0 && today <= 4 ? days[today] : days[0]);
  }, []);

  const getSubjectIcon = (subject) => tt.meta[subject]?.icon || "bi-book-fill";

  const getSubjectColorStyle = (subject) => tt.meta[subject]?.color || "#6b7280";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  const slideIn = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  // Get subjects for a specific day
  const getDaySchedule = (day) => {
    return grid[day] || [];
  };

  // Get current lesson
  const getCurrentLesson = () => {
    if (!currentDay) return null;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeValue = currentHour + currentMinute / 60;
    
    const schedule = getDaySchedule(currentDay);
    for (let i = 0; i < schedule.length; i++) {
      const startHour = i < 4 ? 8 + i : 13 + (i - 4);
      if (timeValue >= startHour && timeValue < startHour + 1) {
        return {
          subject: schedule[i],
          time: HOURS[i],
          index: i
        };
      }
    }
    return null;
  };

  const currentLesson = getCurrentLesson();

  if (status !== "ready" || classes.length === 0) {
    return (
      <div>
        <PageHeader icon="bi-calendar-week" title="استعمال الزمن" sub="جداول دراسية منظمة لجميع الأقسام" />
        <div className="container py-5 text-center text-muted" dir="rtl">
          {status === "loading" && "جارٍ التحميل..."}
          {status === "error" && "تعذّر تحميل الجداول. حاول مرة أخرى لاحقاً."}
          {status === "ready" && "لم يتم نشر أي جدول بعد."}
        </div>
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
        icon="bi-calendar-week"
        title="استعمال الزمن"
        sub={`جداول دراسية منظمة لجميع الأقسام${tt.year ? " — السنة الدراسية " + tt.year.label : ""}`}
      />

      <div className="container py-4">
        {/* Top Bar with Current Time and View Toggle */}
        <motion.div 
          className="top-bar mb-4"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            {/* Current Day & Time */}
            <div className="current-time-info">
              {currentDay && (
                <motion.div 
                  className="today-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <i className="bi bi-calendar-check"></i>
                  <span>اليوم: {currentDay}</span>
                </motion.div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="view-toggle-wrapper">
              <div className="view-toggle">
                <motion.button
                  className={`view-option ${viewMode === "week" ? "active" : ""}`}
                  onClick={() => setViewMode("week")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <i className="bi bi-calendar-week"></i>
                  <span>أسبوعي</span>
                </motion.button>
                <motion.button
                  className={`view-option ${viewMode === "day" ? "active" : ""}`}
                  onClick={() => setViewMode("day")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <i className="bi bi-calendar-day"></i>
                  <span>يومي</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Lesson Card */}
        {currentLesson && currentLesson.subject !== "—" && (
          <motion.div 
            className="current-lesson-card mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="current-lesson-content">
              <div className="lesson-indicator">
                <div className="pulse-dot"></div>
                <span>الحصة الحالية</span>
              </div>
              <div className="lesson-details">
                <div 
                  className="lesson-subject-badge"
                  style={{ 
                    background: `linear-gradient(135deg, ${getSubjectColorStyle(currentLesson.subject)} 0%, ${getSubjectColorStyle(currentLesson.subject)}dd 100%)` 
                  }}
                >
                  <i className={`bi ${getSubjectIcon(currentLesson.subject)}`}></i>
                  <span>{currentLesson.subject}</span>
                </div>
                <div className="lesson-time">
                  <i className="bi bi-clock"></i>
                  <span>{currentLesson.time}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Class Selector - Enhanced */}
        <motion.div 
          className="class-selector-wrapper mb-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="class-selector">
            {classes.map((cls, index) => (
              <motion.button
                key={cls}
                onClick={() => setSelected(cls)}
                className={`class-btn ${selected === cls ? "active" : ""}`}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="bi bi-people"></i>
                <span>{cls}</span>
                {selected === cls && (
                  <motion.div 
                    className="active-bg"
                    layoutId="activeClass"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Session Info Cards */}
        <motion.div 
          className="sessions-wrapper mb-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <motion.div 
                className="session-card morning"
                variants={fadeUp}
                whileHover={{ y: -5 }}
              >
                <div className="session-icon">
                  <motion.i 
                    className="bi bi-brightness-high"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </div>
                <div className="session-info">
                  <h6>الفترة الصباحية</h6>
                  <p>8:00 - 12:00</p>
                  <span className="session-lessons">4 حصص</span>
                </div>
                <div className="session-progress">
                  <div className="progress-bar" style={{ width: "100%" }}></div>
                </div>
              </motion.div>
            </div>
            <div className="col-md-6">
              <motion.div 
                className="session-card evening"
                variants={fadeUp}
                whileHover={{ y: -5 }}
              >
                <div className="session-icon">
                  <motion.i 
                    className="bi bi-moon-stars"
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </div>
                <div className="session-info">
                  <h6>الفترة المسائية</h6>
                  <p>13:00 - 17:00</p>
                  <span className="session-lessons">4 حصص</span>
                </div>
                <div className="session-progress">
                  <div className="progress-bar" style={{ width: "100%" }}></div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Timetable Content */}
        <motion.div 
          className="timetable-wrapper"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="timetable-header">
            <div className="header-left">
              <i className="bi bi-building"></i>
              <h4>{selected}</h4>
            </div>
            <div className="header-right">
              <span className="break-info">
                <i className="bi bi-cup-hot"></i>
                استراحة: 12:00 - 13:00
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "week" ? (
              <motion.div
                key="week"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="week-view"
              >
                <div className="table-responsive">
                  <table className="timetable">
                    <thead>
                      <tr>
                        <th className="day-header">اليوم / الساعة</th>
                        {HOURS.map((hour, idx) => (
                          <th 
                            key={hour} 
                            className={`time-header ${idx < 4 ? "morning" : "evening"}`}
                          >
                            <i className="bi bi-clock"></i>
                            {hour}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day, rowIndex) => {
                        const isCurrentDay = day === currentDay;
                        return (
                          <motion.tr 
                            key={day}
                            className={`${isCurrentDay ? "current-day" : ""}`}
                            variants={slideIn}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: rowIndex * 0.1 }}
                            whileHover={{ backgroundColor: "rgba(79, 70, 229, 0.02)" }}
                          >
                            <td className={`day-cell ${isCurrentDay ? "active" : ""}`}>
                              <div className="day-content">
                                <span className="day-name">{day}</span>
                                {isCurrentDay && (
                                  <span className="today-tag">اليوم</span>
                                )}
                              </div>
                            </td>
                            {(grid[day] || []).map((subject, idx) => {
                              const isBreak = subject === "—";
                              const iconClass = getSubjectIcon(subject);
                              const colorStyle = getSubjectColorStyle(subject);
                              
                              return (
                                <td key={idx} className="subject-cell">
                                  {!isBreak ? (
                                    <motion.div
                                      className="subject-badge"
                                      style={{ 
                                        background: `linear-gradient(135deg, ${colorStyle}15 0%, ${colorStyle}08 100%)`,
                                        borderColor: `${colorStyle}30`
                                      }}
                                      whileHover={{ 
                                        scale: 1.05,
                                        boxShadow: `0 4px 12px ${colorStyle}20`
                                      }}
                                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    >
                                      <i 
                                        className={`bi ${iconClass}`}
                                        style={{ color: colorStyle }}
                                      ></i>
                                      <span style={{ color: "#1f2937" }}>{subject}</span>
                                    </motion.div>
                                  ) : (
                                    <span className="break-cell">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="day"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="day-view"
              >
                <div className="day-selector">
                  {DAYS.map((day) => (
                    <motion.button
                      key={day}
                      className={`day-btn ${currentDay === day ? "active" : ""}`}
                      onClick={() => setCurrentDay(day)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {day}
                    </motion.button>
                  ))}
                </div>

                {currentDay && (
                  <div className="day-schedule">
                    {HOURS.map((hour, idx) => {
                      const subject = grid[currentDay]?.[idx];
                      const isBreak = subject === "—";
                      const iconClass = getSubjectIcon(subject);
                      const colorStyle = getSubjectColorStyle(subject);
                      const isCurrentHour = currentLesson?.index === idx;
                      
                      return (
                        <motion.div
                          key={hour}
                          className={`schedule-item ${isCurrentHour ? "current" : ""} ${idx < 4 ? "morning" : "evening"}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div className="schedule-time">
                            <i className="bi bi-clock"></i>
                            <span>{hour}</span>
                            {isCurrentHour && (
                              <span className="current-indicator">
                                <span className="pulse"></span>
                                الآن
                              </span>
                            )}
                          </div>
                          <div className="schedule-content">
                            {!isBreak ? (
                              <motion.div
                                className="schedule-subject"
                                style={{ 
                                  background: `linear-gradient(135deg, ${colorStyle}15 0%, ${colorStyle}08 100%)`,
                                  borderLeft: `4px solid ${colorStyle}`
                                }}
                                whileHover={{ x: 5 }}
                              >
                                <i 
                                  className={`bi ${iconClass}`}
                                  style={{ color: colorStyle }}
                                ></i>
                                <span>{subject}</span>
                              </motion.div>
                            ) : (
                              <div className="schedule-break">
                                <i className="bi bi-dash-circle"></i>
                                <span>استراحة / فراغ</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <motion.div 
            className="legend-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="legend-title">
              <i className="bi bi-palette"></i>
              <span>دليل المواد</span>
            </div>
            <div className="legend-items">
              {Object.keys(tt.meta).map((subject) => {
                const iconClass = getSubjectIcon(subject);
                const colorStyle = getSubjectColorStyle(subject);
                return (
                  <motion.div 
                    key={subject}
                    className="legend-item"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div 
                      className="legend-color"
                      style={{ background: colorStyle }}
                    ></div>
                    <i className={`bi ${iconClass}`} style={{ color: colorStyle }}></i>
                    <span>{subject}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        /* Top Bar */
        .top-bar {
          background: white;
          border-radius: 16px;
          padding: 16px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .today-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 30px;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .view-toggle {
          display: flex;
          gap: 5px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 40px;
        }

        .view-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border: none;
          background: transparent;
          border-radius: 30px;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-option.active {
          background: white;
          color: #4f46e5;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Current Lesson Card */
        .current-lesson-card {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 20px;
          padding: 20px 24px;
          color: white;
        }

        .current-lesson-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .lesson-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pulse-dot {
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .lesson-details {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .lesson-subject-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-radius: 40px;
          font-weight: 600;
          color: white;
        }

        .lesson-time {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.2);
          border-radius: 30px;
        }

        /* Class Selector */
        .class-selector {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .class-btn {
          position: relative;
          padding: 12px 28px;
          border: none;
          background: white;
          border-radius: 40px;
          font-weight: 600;
          color: #6b7280;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .class-btn.active {
          color: white;
        }

        .active-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 40px;
          z-index: -1;
        }

        /* Session Cards */
        .session-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .session-card.morning {
          border-top: 4px solid #f59e0b;
        }

        .session-card.evening {
          border-top: 4px solid #06b6d4;
        }

        .session-icon {
          width: 50px;
          height: 50px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }

        .session-card.morning .session-icon {
          background: #fef3c7;
          color: #f59e0b;
        }

        .session-card.evening .session-icon {
          background: #cffafe;
          color: #06b6d4;
        }

        .session-info {
          flex: 1;
        }

        .session-info h6 {
          margin: 0 0 4px;
          font-weight: 600;
          color: #1f2937;
        }

        .session-info p {
          margin: 0 0 4px;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .session-lessons {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .session-progress {
          width: 60px;
          height: 4px;
          background: #f3f4f6;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          border-radius: 2px;
        }

        .session-card.morning .progress-bar {
          background: #f59e0b;
        }

        .session-card.evening .progress-bar {
          background: #06b6d4;
        }

        /* Timetable Wrapper */
        .timetable-wrapper {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        .timetable-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-left i {
          font-size: 1.8rem;
          color: #4f46e5;
        }

        .header-left h4 {
          margin: 0;
          font-weight: 700;
          color: #1f2937;
        }

        .break-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #fef3c7;
          border-radius: 30px;
          color: #92400e;
          font-size: 0.9rem;
        }

        /* Timetable */
        .timetable {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .timetable thead th {
          padding: 16px;
          font-weight: 600;
          text-align: center;
          background: #f9fafb;
          border: none;
        }

        .time-header {
          color: #4b5563;
        }

        .time-header.morning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
        }

        .time-header.evening {
          background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
          color: #0e7490;
        }

        .time-header i {
          margin-left: 6px;
        }

        .day-cell {
          padding: 16px;
          font-weight: 600;
          background: #f9fafb;
          border-radius: 12px 0 0 12px;
        }

        .day-cell.active {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        }

        .day-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .today-tag {
          padding: 2px 8px;
          background: #4f46e5;
          color: white;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .subject-cell {
          padding: 12px 8px;
        }

        .subject-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid;
          font-weight: 500;
          transition: all 0.3s ease;
          cursor: default;
        }

        .break-cell {
          color: #d1d5db;
          font-weight: 300;
        }

        .current-day {
          background: rgba(79, 70, 229, 0.02);
        }

        /* Day View */
        .day-view {
          padding: 20px 0;
        }

        .day-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .day-btn {
          padding: 10px 20px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 30px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .day-btn.active {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
        }

        .day-schedule {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .schedule-item {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          background: #f9fafb;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .schedule-item.current {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border: 1px solid #4f46e5;
        }

        .schedule-item.morning {
          border-right: 4px solid #f59e0b;
        }

        .schedule-item.evening {
          border-right: 4px solid #06b6d4;
        }

        .schedule-time {
          min-width: 120px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #374151;
        }

        .current-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-right: 10px;
          padding: 4px 10px;
          background: #10b981;
          color: white;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .pulse {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .schedule-content {
          flex: 1;
        }

        .schedule-subject {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 500;
          transition: all 0.3s ease;
          cursor: default;
        }

        .schedule-break {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          color: #9ca3af;
        }

        /* Legend */
        .legend-wrapper {
          margin-top: 30px;
          padding-top: 24px;
          border-top: 1px solid #f3f4f6;
        }

        .legend-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-weight: 600;
          color: #374151;
        }

        .legend-items {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #f9fafb;
          border-radius: 30px;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          cursor: default;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 4px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .timetable-wrapper {
            padding: 16px;
            overflow-x: auto;
          }

          .timetable {
            min-width: 800px;
          }

          .current-lesson-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .lesson-details {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
          }

          .lesson-subject-badge {
            width: 100%;
            justify-content: center;
          }

          .schedule-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .schedule-time {
            width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
}