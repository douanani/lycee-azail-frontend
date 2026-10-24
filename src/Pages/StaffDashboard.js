// Minimal dashboard for counselor / admin_staff / supervisor.
// Scope: read announcements, publish announcements for the audiences the DB allows
// (mirrors public.can_publish_audience), delete your own. Anything else needs its own page.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthGuard from "../api/useAuthGuard";
import { getAnnouncements, createAnnouncement, deleteAnnouncement, logout, errMsg } from "../api/services";

const ROLE_LABEL = { counselor: "مستشار التوجيه", admin_staff: "الإدارة", supervisor: "مستشار التربية" };
const AUDIENCE_LABEL = { all: "الجميع", teachers: "الأساتذة", students: "التلاميذ", parents: "الأولياء", guidance: "التوجيه" };
// Must match public.can_publish_audience in the DB; RLS enforces it regardless of this UI.
const ALLOWED_AUDIENCES = {
  counselor:   ["students", "guidance"],
  admin_staff: ["teachers", "all"],
  supervisor:  ["students", "teachers"],
};

export default function StaffDashboard({ role }) {
  const navigate = useNavigate();
  const profile = useAuthGuard([role]);
  const audiences = ALLOWED_AUDIENCES[role] || [];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success" | "danger", text }
  const [form, setForm] = useState({ title: "", body: "", audience: audiences[0] || "all" });

  const load = useCallback(async () => {
    try { setItems(await getAnnouncements()); }
    catch (e) { setMsg({ type: "danger", text: errMsg(e, "تعذر تحميل الإعلانات") }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (profile) load(); }, [profile, load]);

  if (!profile) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    try {
      await createAnnouncement({ ...form, title: form.title.trim(), body: form.body.trim() });
      setForm({ title: "", body: "", audience: audiences[0] || "all" });
      setMsg({ type: "success", text: "تم نشر الإعلان" });
      load();
    } catch (err) {
      setMsg({ type: "danger", text: errMsg(err, "فشل النشر") });
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("حذف هذا الإعلان؟")) return;
    try { await deleteAnnouncement(id); load(); }
    catch (err) { setMsg({ type: "danger", text: errMsg(err, "فشل الحذف") }); }
  };

  return (
    <div className="container py-5" dir="rtl" style={{ maxWidth: 860, paddingBottom: 90 }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h3 className="mb-1">مرحباً {profile.name}</h3>
          <span className="text-muted">{ROLE_LABEL[role]}</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/account")}>
            <i className="bi bi-gear-fill me-1" />حسابي
          </button>
          <button className="btn btn-outline-danger" onClick={async () => { await logout(); navigate("/auth"); }}>
            <i className="bi bi-box-arrow-right me-1" />خروج
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type} py-2`} role="alert" onClick={() => setMsg(null)}>{msg.text}</div>
      )}

      <form onSubmit={submit} className="card card-body mb-4">
        <h5 className="mb-3"><i className="bi bi-megaphone-fill me-2" />نشر إعلان</h5>
        <input className="form-control mb-2" placeholder="العنوان" maxLength={150} required
               value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="form-control mb-2" rows={4} placeholder="نص الإعلان" required
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <select className="form-select" style={{ maxWidth: 220 }} value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {audiences.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
          </select>
          <button className="btn btn-primary" disabled={busy}>{busy ? "..." : "نشر"}</button>
        </div>
        {form.audience === "all" && (
          <small className="text-warning mt-2">تنبيه: «الجميع» يظهر للزوار العامّين في الموقع.</small>
        )}
      </form>

      <h5 className="mb-3">الإعلانات</h5>
      {loading ? <p className="text-muted">جاري التحميل...</p>
        : items.length === 0 ? <p className="text-muted">لا توجد إعلانات.</p>
        : items.map((a) => (
          <div key={a.id} className="card card-body mb-2">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <strong>{a.title}</strong>
                <div className="small text-muted">
                  {a.author?.name || "—"} · {AUDIENCE_LABEL[a.audience] || a.audience} · {a.published_at?.substring(0, 10)}
                </div>
              </div>
              {a.user_id === profile.id && (
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(a.id)} aria-label="حذف">
                  <i className="bi bi-trash" />
                </button>
              )}
            </div>
            <p className="mb-0 mt-2" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
          </div>
        ))}
    </div>
  );
}
