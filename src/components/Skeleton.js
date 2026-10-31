// components/Skeleton.js — one place for every loading placeholder.
import "./Skeleton.css";

/** Basic shimmer block. w/h accept numbers (px) or any CSS size. */
export function Sk({ w = "100%", h = 16, r, className = "", style }) {
  return (
    <span
      className={`sk ${className}`}
      aria-hidden="true"
      style={{ width: w, height: h, ...(r != null ? { borderRadius: r } : null), ...style }}
    />
  );
}

/** Wraps a skeleton so screen readers announce loading once instead of reading nothing. */
function Live({ children, label = "جاري التحميل" }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

/** Stack of card-shaped rows (announcements, resources, notifications...). */
export function ListSkeleton({ rows = 3 }) {
  return (
    <Live>
      <div className="sk-stack">
        {Array.from({ length: rows }, (_, i) => (
          <div className="sk-card" key={i}>
            <div className="sk-row" style={{ marginBottom: 12 }}>
              <Sk w={70} h={22} r={999} />
              <Sk w={90} h={14} style={{ marginInlineStart: "auto" }} />
            </div>
            <Sk w="60%" h={18} style={{ marginBottom: 10 }} />
            <Sk h={12} style={{ marginBottom: 7 }} />
            <Sk w="85%" h={12} />
          </div>
        ))}
      </div>
    </Live>
  );
}

/** ExamsPage / LessonsPage layout: subject sidebar + file rows. */
export function ExamsSkeleton() {
  return (
    <Live>
      <div className="d-flex justify-content-center mb-4">
        <Sk w="min(640px, 100%)" h={48} r={999} />
      </div>
      <div className="sk-exams">
        <div className="sk-card sk-stack">
          <Sk w={120} h={16} />
          {Array.from({ length: 6 }, (_, i) => (
            <div className="sk-row" key={i}>
              <Sk w={40} h={40} r={12} style={{ flexShrink: 0 }} />
              <div className="sk-col">
                <Sk w="70%" h={13} />
                <Sk w="35%" h={10} />
              </div>
            </div>
          ))}
        </div>
        <div className="sk-stack">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="sk-card sk-row" key={i}>
              <Sk w={48} h={48} r={12} style={{ flexShrink: 0 }} />
              <div className="sk-col">
                <Sk w="55%" h={15} />
                <Sk w="30%" h={11} />
              </div>
              <Sk w={84} h={36} r={10} style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </Live>
  );
}

/** TimetablePage: class chips + weekly grid. */
export function TimetableSkeleton({ rows = 6 }) {
  return (
    <Live>
      <div className="d-flex gap-2 flex-wrap justify-content-center mb-4">
        {Array.from({ length: 5 }, (_, i) => <Sk key={i} w={86} h={38} r={999} />)}
      </div>
      <div className="sk-card">
        <div className="sk-timetable-grid">
          <span />
          {Array.from({ length: 5 }, (_, i) => <Sk key={i} h={28} />)}
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} style={{ display: "contents" }}>
              <Sk h={52} />
              {Array.from({ length: 5 }, (_, c) => <Sk key={c} h={52} r={10} />)}
            </div>
          ))}
        </div>
      </div>
    </Live>
  );
}

/** Small centered form (account page, login-like screens). */
export function FormSkeleton({ fields = 3 }) {
  return (
    <Live>
      <Sk w="45%" h={26} style={{ marginBottom: 8 }} />
      <Sk w="25%" h={14} style={{ marginBottom: 24 }} />
      <div className="sk-card sk-stack">
        <Sk w="40%" h={18} />
        {Array.from({ length: fields }, (_, i) => <Sk key={i} h={42} r={10} />)}
        <Sk w={90} h={40} r={10} />
      </div>
    </Live>
  );
}

/** Dashboard shell shown while the auth guard checks the session. */
export function DashboardSkeleton() {
  return (
    <Live>
      <div className="sk-dash" dir="rtl">
        <aside className="sk-dash-side sk-stack">
          <Sk w={140} h={28} style={{ marginBottom: 12 }} />
          {Array.from({ length: 6 }, (_, i) => <Sk key={i} h={40} r={10} />)}
        </aside>
        <main className="sk-dash-main sk-stack">
          <Sk w="30%" h={28} />
          <div className="sk-stats">
            {Array.from({ length: 4 }, (_, i) => <Sk key={i} h={92} r={16} />)}
          </div>
          <Sk h={220} r={16} />
          <Sk h={140} r={16} />
        </main>
      </div>
    </Live>
  );
}

/** Route-level fallback (React.lazy chunks): neutral page skeleton. */
export function PageSkeleton() {
  return (
    <div className="container py-5" dir="rtl" style={{ maxWidth: 900 }}>
      <ListSkeleton rows={3} />
    </div>
  );
}
