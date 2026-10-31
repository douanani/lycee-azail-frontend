// /account — profile summary + password change, for every role.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthGuard from "../api/useAuthGuard";
import { FormSkeleton } from "../components/Skeleton";
import { changePassword, errMsg } from "../api/services";
import { getDashboardPath } from "../api/rolePaths";
import { roleConfig } from "./Admin Dashboard/adminUtils";

export default function AccountPage() {
  const navigate = useNavigate();
  const profile = useAuthGuard(Object.keys(roleConfig));
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!profile) return <div className="container py-5" dir="rtl" style={{ maxWidth: 520 }}><FormSkeleton /></div>;

  const submit = async (e) => {
    e.preventDefault();
    if (form.next.length < 8) return setMsg({ type: "danger", text: "كلمة المرور 8 أحرف على الأقل" });
    if (form.next !== form.confirm) return setMsg({ type: "danger", text: "تأكيد كلمة المرور غير مطابق" });
    setBusy(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      setMsg({ type: "success", text: "تم تغيير كلمة المرور" });
    } catch (err) {
      setMsg({ type: "danger", text: errMsg(err, "فشل تغيير كلمة المرور") });
    } finally { setBusy(false); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container py-5" dir="rtl" style={{ maxWidth: 520, paddingBottom: 90 }}>
      <button className="btn btn-link px-0 mb-3" onClick={() => navigate(getDashboardPath(profile.role))}>
        <i className="bi bi-arrow-right me-1" />العودة للوحة التحكم
      </button>
      <h3 className="mb-1">{profile.name}</h3>
      <p className="text-muted mb-4">{roleConfig[profile.role]?.label}</p>

      <form onSubmit={submit} className="card card-body">
        <h5 className="mb-3">تغيير كلمة المرور</h5>
        {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}
        <input type="password" className="form-control mb-2" placeholder="كلمة المرور الحالية" required
               autoComplete="current-password" value={form.current} onChange={set("current")} />
        <input type="password" className="form-control mb-2" placeholder="كلمة المرور الجديدة" required
               autoComplete="new-password" value={form.next} onChange={set("next")} />
        <input type="password" className="form-control mb-3" placeholder="تأكيد كلمة المرور الجديدة" required
               autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        <button className="btn btn-primary" disabled={busy}>{busy ? "..." : "حفظ"}</button>
      </form>
    </div>
  );
}