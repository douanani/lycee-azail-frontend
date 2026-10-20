// admin/adminUtils.js
import { useState, useEffect, useRef } from "react";


// ─── Configs ───────────────────────────────────────────────────────────────────
export const roleConfig = {
  admin:       { label: "مدير النظام",     color: "#ef4444", bg: "#fee2e2", icon: "bi-shield-fill-check" },
  teacher:     { label: "أستاذ",           color: "#4f46e5", bg: "#e0e7ff", icon: "bi-person-badge-fill" },
  counselor:   { label: "مستشار التوجيه",  color: "#10b981", bg: "#d1fae5", icon: "bi-person-hearts" },
  admin_staff: { label: "الإدارة",         color: "#f59e0b", bg: "#fef3c7", icon: "bi-building-fill-gear" },
  supervisor:  { label: "مستشار التربية",  color: "#8b5cf6", bg: "#ede9fe", icon: "bi-person-check-fill" },
};

export const typeConfig = {
  lesson:   { label: "درس",    color: "#4f46e5", bg: "#e0e7ff", icon: "bi-journal-bookmark-fill" },
  exam:     { label: "اختبار", color: "#ef4444", bg: "#fee2e2", icon: "bi-pencil-square" },
  homework: { label: "فرض",    color: "#10b981", bg: "#d1fae5", icon: "bi-journal-text" },
  guide:    { label: "دليل",   color: "#f59e0b", bg: "#fef3c7", icon: "bi-book-fill" },
};

export const audienceLabel = {
  all: "الجميع", teachers: "الأساتذة", students: "التلاميذ",
  parents: "الأولياء", guidance: "التوجيه",
};

export const SIDEBAR_ITEMS = [
  { id: "overview",      label: "نظرة عامة",        icon: "bi-grid-1x2-fill" },
  { id: "resources",     label: "الموارد التعليمية", icon: "bi-journal-bookmark-fill" },
  { id: "users",         label: "المستخدمون",        icon: "bi-people-fill" },
  { id: "announcements", label: "الإعلانات",         icon: "bi-megaphone-fill" },
  { id: "timetable",     label: "جداول الحصص",       icon: "bi-calendar-week-fill" },
  { id: "settings",      label: "إعدادات النظام",    icon: "bi-gear-fill" },
];

// ─── Animated counter ──────────────────────────────────────────────────────────

export function AnimatedNumber({ target, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !target) return;
    started.current = true;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{val.toLocaleString("ar-DZ")}</span>;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
export const Skeleton = ({ h = 20, w = "100%", r = 8 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite"
  }} />
);
