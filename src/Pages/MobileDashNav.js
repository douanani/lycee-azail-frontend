// Shared mobile chrome for the Admin and Teacher dashboards:
//  - <MobileDashNav>: app-style bottom tab bar (+ optional "more" sheet)
//  - useTableLabels(): copies <th> text into each <td data-label> so tables can render as cards on phones
import { useEffect, useState } from "react";
import "./dashboardMobile.css";

export function useTableLabels() {
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      document.querySelectorAll("table.data-table").forEach((table) => {
        const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
        table.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            if (heads[i] && td.getAttribute("data-label") !== heads[i]) td.setAttribute("data-label", heads[i]);
          });
        });
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
}

/**
 * items:     [{ id, label, icon, badge? }]   shown as tabs
 * moreItems: [{ id, label, icon }]           optional; adds a "المزيد" tab that opens a sheet
 * footer:    [{ label, icon, onClick, danger? }]  extra actions inside the sheet (home, logout…)
 */
export default function MobileDashNav({ items, active, onSelect, moreItems = [], footer = [], accent = "#4f46e5" }) {
  const [sheet, setSheet] = useState(false);
  const moreActive = moreItems.some((m) => m.id === active);
  const hasMore = moreItems.length > 0 || footer.length > 0;

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const pick = (id) => {
    setSheet(false);
    onSelect(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {sheet && <div className="dm-overlay" onClick={() => setSheet(false)} />}
      {sheet && (
        <div className="dm-sheet" dir="rtl" style={{ "--dm-accent": accent }}>
          <div className="dm-sheet-handle" />
          <div className="dm-sheet-grid">
            {moreItems.map((m) => (
              <button key={m.id} className={`dm-sheet-item${active === m.id ? " active" : ""}`} onClick={() => pick(m.id)}>
                <i className={`bi ${m.icon}`} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          {footer.length > 0 && (
            <div className="dm-sheet-footer">
              {footer.map((f) => (
                <button
                  key={f.label}
                  className={`dm-sheet-action${f.danger ? " danger" : ""}`}
                  onClick={() => { setSheet(false); f.onClick(); }}
                >
                  <i className={`bi ${f.icon}`} />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="dm-bar" dir="rtl" style={{ "--dm-accent": accent }} aria-label="التنقل">
        {items.map((it) => (
          <button key={it.id} className={`dm-tab${active === it.id ? " active" : ""}`} onClick={() => pick(it.id)}>
            <span className="dm-tab-icon">
              <i className={`bi ${it.icon}`} />
              {it.badge > 0 && <b className="dm-badge">{it.badge > 9 ? "9+" : it.badge}</b>}
            </span>
            <span className="dm-tab-label">{it.label}</span>
          </button>
        ))}
        {hasMore && (
          <button className={`dm-tab${moreActive || sheet ? " active" : ""}`} onClick={() => setSheet((v) => !v)}>
            <span className="dm-tab-icon"><i className={`bi ${sheet ? "bi-x-lg" : "bi-three-dots"}`} /></span>
            <span className="dm-tab-label">المزيد</span>
          </button>
        )}
      </nav>
    </>
  );
}
