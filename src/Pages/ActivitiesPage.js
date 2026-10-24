// pages/ActivitiesPage.js — public feed of published announcements (النشاطات والإعلانات)
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";
import { getPublicAnnouncements } from "../api/services";

const AUDIENCE = {
  all:      { label: "إعلان عام",   color: "#4f46e5", icon: "bi-megaphone-fill" },
  students: { label: "للتلاميذ",    color: "#0ea5e9", icon: "bi-mortarboard-fill" },
  parents:  { label: "للأولياء",    color: "#10b981", icon: "bi-people-fill" },
};
const FILTERS = [{ id: "all-items", label: "الكل" }, ...Object.entries(AUDIENCE).map(([id, v]) => ({ id, label: v.label }))];
const LONG = 220; // chars before a card collapses its text

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" });
  } catch { return iso.substring(0, 10); }
};

function AnnouncementCard({ a, index }) {
  const meta = AUDIENCE[a.audience] || AUDIENCE.all;
  const [open, setOpen] = useState(false);
  const long = a.body.length > LONG;
  const text = long && !open ? a.body.slice(0, LONG).trimEnd() + "…" : a.body;

  return (
    <motion.article
      layout
      className="ann-card"
      style={{ "--accent": meta.color }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 110, damping: 16, delay: Math.min(index, 8) * 0.04 }}
    >
      <div className="ann-top">
        <span className="ann-chip"><i className={`bi ${meta.icon}`} />{meta.label}</span>
        <time className="ann-date"><i className="bi bi-calendar-event" />{fmtDate(a.published_at)}</time>
      </div>
      <h3 className="ann-title">{a.title}</h3>
      <p className="ann-body">{text}</p>
      <div className="ann-foot">
        {a.author_name && <span className="ann-author"><i className="bi bi-person-circle" />{a.author_name}</span>}
        {long && (
          <button className="ann-more" onClick={() => setOpen((v) => !v)}>
            {open ? "عرض أقل" : "قراءة المزيد"}
            <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} />
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default function ActivitiesPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [filter, setFilter] = useState("all-items");

  useEffect(() => {
    getPublicAnnouncements()
      .then((rows) => { setItems(rows); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  const shown = useMemo(
    () => (filter === "all-items" ? items : items.filter((a) => a.audience === filter)),
    [items, filter]
  );

  return (
    <>
      <PageHeader
        icon="bi-megaphone-fill"
        title="النشاطات والإعلانات"
        sub="آخر الأخبار والإعلانات الرسمية للثانوية"
      />

      <div className="container py-5 ann-wrap" dir="rtl">
        {status === "ready" && items.length > 0 && (
          <div className="ann-filters" role="tablist" aria-label="تصفية الإعلانات">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className={`ann-filter${filter === f.id ? " active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {status === "loading" && (
          <div className="ann-grid">
            {[0, 1, 2].map((i) => <div key={i} className="ann-skeleton" />)}
          </div>
        )}

        {status === "error" && (
          <div className="ann-state">
            <i className="bi bi-wifi-off" />
            <p>تعذّر تحميل الإعلانات. حاول مرة أخرى لاحقاً.</p>
            <button className="ann-more" onClick={() => window.location.reload()}>إعادة المحاولة</button>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <div className="ann-state">
            <i className="bi bi-inbox" />
            <p>{items.length === 0 ? "لا توجد إعلانات حالياً." : "لا توجد إعلانات في هذا التصنيف."}</p>
          </div>
        )}

        {status === "ready" && shown.length > 0 && (
          <div className="ann-grid">
            <AnimatePresence mode="popLayout">
              {shown.map((a, i) => <AnnouncementCard key={a.id} a={a} index={i} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        .ann-wrap { max-width: 1100px; }
        .ann-filters { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px; }
        .ann-filter {
          border: 1.5px solid #e2e8f0; background: #fff; color: #475569;
          padding: 8px 20px; border-radius: 999px; font-weight: 600; font-size: .9rem;
          font-family: inherit; cursor: pointer; transition: all .2s;
        }
        .ann-filter:hover { border-color: #1e3a5f; color: #1e3a5f; }
        .ann-filter.active { background: #1e3a5f; border-color: #1e3a5f; color: #fff; box-shadow: 0 6px 16px rgba(30,58,95,.25); }

        .ann-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 22px; }
        .ann-card {
          position: relative; background: #fff; border-radius: 18px; padding: 22px 22px 18px;
          box-shadow: 0 2px 12px rgba(15,23,42,.06); border: 1px solid #eef2f7;
          display: flex; flex-direction: column; overflow: hidden; transition: box-shadow .25s, transform .25s;
        }
        .ann-card::before { content: ""; position: absolute; inset-inline-start: 0; top: 0; bottom: 0; width: 5px; background: var(--accent); }
        .ann-card:hover { box-shadow: 0 14px 32px rgba(15,23,42,.12); transform: translateY(-3px); }
        .ann-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .ann-chip {
          display: inline-flex; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700;
          padding: 5px 12px; border-radius: 999px; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, white);
        }
        .ann-date { font-size: .8rem; color: #64748b; display: inline-flex; gap: 6px; align-items: center; }
        .ann-title { font-size: 1.12rem; font-weight: 800; color: #0f172a; line-height: 1.5; margin: 0 0 10px; }
        .ann-body { color: #475569; font-size: .95rem; line-height: 1.9; white-space: pre-wrap; margin: 0 0 16px; flex: 1; overflow-wrap: anywhere; }
        .ann-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
        .ann-author { font-size: .82rem; color: #64748b; display: inline-flex; gap: 6px; align-items: center; }
        .ann-more {
          border: 0; background: transparent; color: var(--accent, #1e3a5f); font-weight: 700; font-size: .85rem;
          font-family: inherit; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; margin-inline-start: auto;
        }
        .ann-more:hover { text-decoration: underline; }

        .ann-skeleton {
          height: 210px; border-radius: 18px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf4 37%, #f1f5f9 63%); background-size: 400% 100%;
          animation: ann-shimmer 1.4s ease infinite;
        }
        @keyframes ann-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

        .ann-state { text-align: center; color: #64748b; padding: 56px 16px; }
        .ann-state i { font-size: 3rem; color: #94a3b8; display: block; margin-bottom: 12px; }
        .ann-state p { margin-bottom: 14px; }

        @media (max-width: 575.98px) {
          .ann-grid { grid-template-columns: 1fr; }
          .ann-card { padding: 18px 16px 14px; }
          .ann-wrap { padding-bottom: 96px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ann-card, .ann-skeleton { transition: none; animation: none; }
        }
      `}</style>
    </>
  );
}