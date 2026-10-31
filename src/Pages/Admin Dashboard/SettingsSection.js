// admin/sections/SettingsSection.js
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "../Admin Dashboard/adminUtils";
import * as svc from "../../api/services";
import AdminModal from "./AdminModal";
import { useConfirm } from "../../components/Feedback";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

const TABS = [
  { id: "years",      label: "السنة الدراسية",     icon: "bi-calendar-check-fill" },
  { id: "levels",     label: "المستويات الدراسية", icon: "bi-mortarboard-fill" },
  { id: "subjects",   label: "المواد الدراسية",    icon: "bi-book-half" },
  { id: "classrooms", label: "الأقسام",            icon: "bi-door-open-fill" },
  { id: "backup",     label: "النسخ الاحتياطي",    icon: "bi-cloud-check-fill" },
  { id: "password",   label: "كلمة المرور",        icon: "bi-shield-lock-fill" },
];

const STREAM_LABEL = { sciences: "علمي", literature: "أدبي", common: "جذع مشترك", technology: "تكنولوجي" };

export default function SettingsSection({ showToast }) {
  const [confirm, confirmDialog] = useConfirm();
  const [tab, setTab] = useState("years");
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState({});
  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }));

  // ── data ──────────────────────────────────────────────────
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const fetchYears = useCallback(async () => {
    setLoad("years", true);
    try { setYears(await svc.getAcademicYears()); }
    catch { showToast("تعذّر تحميل السنوات الدراسية", "error"); }
    finally { setLoad("years", false); }
  }, [showToast]);

  const fetchLevels = useCallback(async () => {
    setLoad("levels", true);
    try { setLevels(await svc.getGradeLevels()); }
    catch { showToast("تعذّر تحميل المستويات", "error"); }
    finally { setLoad("levels", false); }
  }, [showToast]);

  const fetchSubjects = useCallback(async () => {
    setLoad("subjects", true);
    try { setSubjects(await svc.getSubjectsAdmin()); }
    catch { showToast("تعذّر تحميل المواد", "error"); }
    finally { setLoad("subjects", false); }
  }, [showToast]);

  const fetchClassrooms = useCallback(async () => {
    setLoad("classrooms", true);
    try { setClassrooms(await svc.getClassrooms()); }
    catch { showToast("تعذّر تحميل الأقسام", "error"); }
    finally { setLoad("classrooms", false); }
  }, [showToast]);

  useEffect(() => {
    if (tab === "years") fetchYears();
    if (tab === "levels") fetchLevels();
    if (tab === "subjects") fetchSubjects();
    if (tab === "classrooms") {
      fetchClassrooms();
      if (levels.length === 0) fetchLevels();
      if (years.length === 0) fetchYears();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const closeModal = () => setModal(null);
  const err = (e, fallback) => svc.errMsg(e, fallback);

  /* ══════════ ACADEMIC YEARS ══════════ */
  const [yearForm, setYearForm] = useState({ label: "", start_date: "", end_date: "", is_current: false });

  const submitYear = async () => {
    if (!yearForm.label || !yearForm.start_date || !yearForm.end_date) {
      showToast("يرجى ملء جميع الحقول", "error"); return;
    }
    setSubmitting(true);
    try {
      await svc.createAcademicYear(yearForm);
      showToast("تمت إضافة السنة الدراسية");
      closeModal();
      setYearForm({ label: "", start_date: "", end_date: "", is_current: false });
      fetchYears();
    } catch (e) { showToast(err(e, "فشلت الإضافة"), "error"); }
    finally { setSubmitting(false); }
  };

  const setCurrentYear = async (year) => {
    try {
      await svc.setCurrentAcademicYear(year.id);
      showToast(`تم تعيين ${year.label} كسنة دراسية حالية`);
      fetchYears();
    } catch (e) { showToast(err(e, "فشلت العملية"), "error"); }
  };

  /* ══════════ GRADE LEVELS ══════════ */
  const [levelForm, setLevelForm] = useState({ id: null, name: "", code: "", year_number: 1, stream: "sciences", subject_ids: [] });

  const openLevelModal = (level = null) => {
    setLevelForm(level ? {
      id: level.id, name: level.name, code: level.code,
      year_number: level.year_number, stream: level.stream || "sciences",
      subject_ids: (level.subjects || []).map(s => s.id),
    } : { id: null, name: "", code: "", year_number: 1, stream: "sciences", subject_ids: [] });
    setModal({ type: "level" });
  };

  const toggleLevelSubject = (id) =>
    setLevelForm(p => ({
      ...p,
      subject_ids: p.subject_ids.includes(id) ? p.subject_ids.filter(x => x !== id) : [...p.subject_ids, id],
    }));

  const submitLevel = async () => {
    if (!levelForm.name || !levelForm.code) { showToast("يرجى ملء الاسم والرمز", "error"); return; }
    setSubmitting(true);
    try {
      await svc.saveGradeLevel(levelForm);
      showToast(levelForm.id ? "تم تحديث المستوى" : "تمت إضافة المستوى");
      closeModal();
      fetchLevels();
    } catch (e) { showToast(err(e, "فشلت العملية"), "error"); }
    finally { setSubmitting(false); }
  };

  const deleteLevel = async (level) => {
    if (!(await confirm({ title: "حذف مستوى", message: `حذف "${level.name}"؟` }))) return;
    try {
      await svc.deleteGradeLevel(level.id);
      showToast("تم الحذف");
      fetchLevels();
    } catch (e) { showToast(err(e, "فشل الحذف"), "error"); }
  };

  /* ══════════ SUBJECTS ══════════ */
  const [subjectForm, setSubjectForm] = useState({ id: null, name: "", name_fr: "", code: "", icon: "", color: "#4f46e5", grade_level_ids: [] });

  const openSubjectModal = async (subject = null) => {
    if (!subject) {
      setSubjectForm({ id: null, name: "", name_fr: "", code: "", icon: "", color: "#4f46e5", grade_level_ids: [] });
      setModal({ type: "subject" });
      return;
    }
    setSubjectForm({
      id: subject.id, name: subject.name, name_fr: subject.name_fr || "", code: subject.code,
      icon: subject.icon || "", color: subject.color || "#4f46e5",
      grade_level_ids: subject.grade_level_ids || [],
    });
    setModal({ type: "subject" });
  };

  const toggleSubjectLevel = (id) =>
    setSubjectForm(p => ({
      ...p,
      grade_level_ids: p.grade_level_ids.includes(id) ? p.grade_level_ids.filter(x => x !== id) : [...p.grade_level_ids, id],
    }));

  const submitSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) { showToast("يرجى ملء الاسم والرمز", "error"); return; }
    setSubmitting(true);
    try {
      await svc.saveSubject(subjectForm);
      showToast(subjectForm.id ? "تم تحديث المادة" : "تمت إضافة المادة");
      closeModal();
      fetchSubjects();
    } catch (e) { showToast(err(e, "فشلت العملية"), "error"); }
    finally { setSubmitting(false); }
  };

  const deleteSubject = async (subject) => {
    if (!(await confirm({ title: "حذف مادة", message: `حذف "${subject.name}"؟` }))) return;
    try {
      await svc.deleteSubject(subject.id);
      showToast("تم الحذف");
      fetchSubjects();
    } catch (e) { showToast(err(e, "فشل الحذف"), "error"); }
  };

  /* ══════════ CLASSROOMS ══════════ */
  const [classForm, setClassForm] = useState({ id: null, grade_level_id: "", academic_year_id: "", name: "", capacity: "" });

  const openClassModal = (cls = null) => {
    setClassForm(cls ? {
      id: cls.id, grade_level_id: cls.grade_level_id, academic_year_id: cls.academic_year_id,
      name: cls.name, capacity: cls.capacity || "",
    } : { id: null, grade_level_id: "", academic_year_id: "", name: "", capacity: "" });
    setModal({ type: "classroom" });
  };

  const submitClassroom = async () => {
    if (!classForm.grade_level_id || !classForm.academic_year_id || !classForm.name) {
      showToast("يرجى ملء جميع الحقول المطلوبة", "error"); return;
    }
    setSubmitting(true);
    try {
      await svc.saveClassroom(classForm);
      showToast(classForm.id ? "تم تحديث القسم" : "تمت إضافة القسم");
      closeModal();
      fetchClassrooms();
    } catch (e) { showToast(err(e, "فشلت العملية"), "error"); }
    finally { setSubmitting(false); }
  };

  const deleteClassroom = async (cls) => {
    if (!(await confirm({ title: "حذف قسم", message: `حذف "${cls.name}"؟` }))) return;
    try {
      await svc.deleteClassroom(cls.id);
      showToast("تم الحذف");
      fetchClassrooms();
    } catch (e) { showToast(err(e, "فشل الحذف"), "error"); }
  };

  /* ══════════ BACKUP ══════════ */
  const [downloading, setDownloading] = useState(false);
  const downloadBackup = async () => {
    setDownloading(true);
    try {
      const backup = await svc.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lycee-azail-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("تم تحميل النسخة الاحتياطية");
    } catch { showToast("فشل تحميل النسخة الاحتياطية", "error"); }
    finally { setDownloading(false); }
  };

  /* ══════════ PASSWORD ══════════ */
  const [pwForm, setPwForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const submitPassword = async () => {
    if (!pwForm.current_password || !pwForm.password || !pwForm.password_confirmation) {
      showToast("يرجى ملء جميع الحقول", "error"); return;
    }
    if (pwForm.password.length < 8) {
      showToast("كلمة المرور 8 أحرف على الأقل", "error"); return;
    }
    if (pwForm.password !== pwForm.password_confirmation) {
      showToast("كلمتا المرور غير متطابقتين", "error"); return;
    }
    setPwSubmitting(true);
    try {
      await svc.changePassword(pwForm.current_password, pwForm.password);
      showToast("تم تغيير كلمة المرور بنجاح");
      setPwForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (e) { showToast(err(e, "فشل تغيير كلمة المرور"), "error"); }
    finally { setPwSubmitting(false); }
  };

  /* ══════════ RENDER ══════════ */
  return (
    <motion.div key="settings" className="section-content" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0 }}>

      <motion.div variants={fadeUp} className="settings-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`settings-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <i className={`bi ${t.icon}`}></i><span>{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── YEARS ── */}
      {tab === "years" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header">
            <h6><i className="bi bi-calendar-check-fill me-2 text-primary"></i>السنوات الدراسية</h6>
            <button className="primary-action-btn" onClick={() => setModal({ type: "year" })}>
              <i className="bi bi-plus-lg me-2"></i>سنة جديدة
            </button>
          </div>
          {loading.years ? <div className="p-4"><Skeleton h={140} /></div> : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>السنة</th><th>البداية</th><th>النهاية</th><th>الحالة</th><th>إجراء</th></tr></thead>
                <tbody>
                  {years.map(y => (
                    <tr key={y.id}>
                      <td className="td-title">{y.label}</td>
                      <td>{y.start_date?.substring(0, 10)}</td>
                      <td>{y.end_date?.substring(0, 10)}</td>
                      <td>{y.is_current
                        ? <span className="type-chip" style={{ background: "#d1fae5", color: "#059669" }}>حالية</span>
                        : <span className="type-chip" style={{ background: "#f1f5f9", color: "#64748b" }}>—</span>}
                      </td>
                      <td>
                        {!y.is_current && (
                          <button className="tbl-action-btn view" onClick={() => setCurrentYear(y)} title="تعيين كحالية">
                            <i className="bi bi-check-lg"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {years.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">لا توجد سنوات دراسية</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <p className="settings-note">لا يمكن حذف سنة دراسية من الواجهة — الـ API الحالية لا تدعم ذلك تفاديًا لكسر البيانات المرتبطة بها.</p>
        </motion.div>
      )}

      {/* ── GRADE LEVELS ── */}
      {tab === "levels" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header">
            <h6><i className="bi bi-mortarboard-fill me-2 text-warning"></i>المستويات الدراسية</h6>
            <button className="primary-action-btn" onClick={() => openLevelModal()}>
              <i className="bi bi-plus-lg me-2"></i>مستوى جديد
            </button>
          </div>
          {loading.levels ? <div className="p-4"><Skeleton h={180} /></div> : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>الاسم</th><th>الرمز</th><th>السنة</th><th>الشعبة</th><th>عدد المواد</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {levels.map(l => (
                    <tr key={l.id}>
                      <td className="td-title">{l.name}</td>
                      <td>{l.code}</td>
                      <td>{l.year_number}</td>
                      <td>{STREAM_LABEL[l.stream] || l.stream || "—"}</td>
                      <td>{l.subjects?.length ?? 0}</td>
                      <td className="td-actions">
                        <button className="tbl-action-btn edit" onClick={() => openLevelModal(l)}><i className="bi bi-pencil-fill"></i></button>
                        <button className="tbl-action-btn delete" onClick={() => deleteLevel(l)}><i className="bi bi-trash3-fill"></i></button>
                      </td>
                    </tr>
                  ))}
                  {levels.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">لا توجد مستويات</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── SUBJECTS ── */}
      {tab === "subjects" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header">
            <h6><i className="bi bi-book-half me-2 text-danger"></i>المواد الدراسية</h6>
            <button className="primary-action-btn" onClick={() => openSubjectModal()}>
              <i className="bi bi-plus-lg me-2"></i>مادة جديدة
            </button>
          </div>
          {loading.subjects ? <div className="p-4"><Skeleton h={180} /></div> : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>الاسم</th><th>الرمز</th><th>اللون</th><th>عدد الموارد</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id}>
                      <td className="td-title"><i className={`bi ${s.icon || "bi-book"} me-2`}></i>{s.name}</td>
                      <td>{s.code}</td>
                      <td><span className="color-swatch" style={{ background: s.color || "#94a3b8" }}></span></td>
                      <td>{s.resources_count ?? 0}</td>
                      <td className="td-actions">
                        <button className="tbl-action-btn edit" onClick={() => openSubjectModal(s)}><i className="bi bi-pencil-fill"></i></button>
                        <button className="tbl-action-btn delete" onClick={() => deleteSubject(s)}><i className="bi bi-trash3-fill"></i></button>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">لا توجد مواد</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── CLASSROOMS ── */}
      {tab === "classrooms" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header">
            <h6><i className="bi bi-door-open-fill me-2 text-success"></i>الأقسام</h6>
            <button className="primary-action-btn" onClick={() => openClassModal()}>
              <i className="bi bi-plus-lg me-2"></i>قسم جديد
            </button>
          </div>
          {loading.classrooms ? <div className="p-4"><Skeleton h={180} /></div> : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>القسم</th><th>المستوى</th><th>السنة الدراسية</th><th>السعة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {classrooms.map(c => (
                    <tr key={c.id}>
                      <td className="td-title">{c.name}</td>
                      <td>{c.grade_level?.name || "—"}</td>
                      <td>{c.academic_year?.label || "—"}</td>
                      <td>{c.capacity || "—"}</td>
                      <td className="td-actions">
                        <button className="tbl-action-btn edit" onClick={() => openClassModal(c)}><i className="bi bi-pencil-fill"></i></button>
                        <button className="tbl-action-btn delete" onClick={() => deleteClassroom(c)}><i className="bi bi-trash3-fill"></i></button>
                      </td>
                    </tr>
                  ))}
                  {classrooms.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">لا توجد أقسام</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── BACKUP ── */}
      {tab === "backup" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header"><h6><i className="bi bi-cloud-check-fill me-2 text-info"></i>النسخ الاحتياطي</h6></div>
          <div className="p-4">
            <p className="settings-note" style={{ marginBottom: 16 }}>
              هذا يصدّر بيانات الجداول الأساسية (السنوات، المستويات، المواد، المستخدمين، الموارد، الإعلانات، الجداول) بصيغة JSON.
              الملفات المرفوعة نفسها (PDF...) غير مضمّنة، فقط مساراتها. هذه ليست نسخة SQL كاملة لقاعدة البيانات.
            </p>
            <button className="primary-action-btn" onClick={downloadBackup} disabled={downloading}>
              {downloading ? <span className="btn-spinner" /> : <i className="bi bi-download me-2"></i>}
              تحميل نسخة JSON
            </button>
          </div>
        </motion.div>
      )}

      {/* ── PASSWORD ── */}
      {tab === "password" && (
        <motion.div variants={fadeUp} className="table-card">
          <div className="table-card-header"><h6><i className="bi bi-shield-lock-fill me-2 text-info"></i>تغيير كلمة المرور</h6></div>
          <div className="p-4" style={{ maxWidth: 420 }}>
            <div className="form-field mb-3">
              <label>كلمة المرور الحالية</label>
              <div className="field-wrap">
                <i className="bi bi-lock field-icon"></i>
                <input type="password" value={pwForm.current_password}
                  onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
              </div>
            </div>
            <div className="form-field mb-3">
              <label>كلمة المرور الجديدة</label>
              <div className="field-wrap">
                <i className="bi bi-key field-icon"></i>
                <input type="password" value={pwForm.password}
                  onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div className="form-field mb-3">
              <label>تأكيد كلمة المرور</label>
              <div className="field-wrap">
                <i className="bi bi-key field-icon"></i>
                <input type="password" value={pwForm.password_confirmation}
                  onChange={e => setPwForm(p => ({ ...p, password_confirmation: e.target.value }))} />
              </div>
            </div>
            <p className="settings-note" style={{ marginBottom: 16 }}>
              تغيير كلمة المرور سيسجّل خروجك من كل الجلسات الأخرى المفتوحة بحسابك.
            </p>
            <button className="modal-btn submit" onClick={submitPassword} disabled={pwSubmitting}>
              {pwSubmitting ? <span className="btn-spinner" /> : <i className="bi bi-check-lg me-2"></i>}
              حفظ
            </button>
          </div>
        </motion.div>
      )}

      {/* ══ MODALS ══ */}
      <AdminModal show={modal?.type === "year"} onClose={closeModal} title="سنة دراسية جديدة">
        <div className="form-grid">
          <div className="form-field full">
            <label>التسمية (مثال: 2026/2027)</label>
            <input value={yearForm.label} onChange={e => setYearForm(p => ({ ...p, label: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field">
            <label>تاريخ البداية</label>
            <input type="date" value={yearForm.start_date} onChange={e => setYearForm(p => ({ ...p, start_date: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field">
            <label>تاريخ النهاية</label>
            <input type="date" value={yearForm.end_date} onChange={e => setYearForm(p => ({ ...p, end_date: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field full">
            <label className="checkbox-row">
              <input type="checkbox" checked={yearForm.is_current}
                onChange={e => setYearForm(p => ({ ...p, is_current: e.target.checked }))} />
              <span>تعيينها كسنة دراسية حالية فور الإنشاء</span>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={closeModal}>إلغاء</button>
          <button className="modal-btn submit" onClick={submitYear} disabled={submitting}>
            {submitting ? <span className="btn-spinner" /> : null}إضافة
          </button>
        </div>
      </AdminModal>

      <AdminModal show={modal?.type === "level"} onClose={closeModal} title={levelForm.id ? "تعديل المستوى" : "مستوى جديد"}>
        <div className="form-grid">
          <div className="form-field full">
            <label>الاسم</label>
            <input value={levelForm.name} onChange={e => setLevelForm(p => ({ ...p, name: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field">
            <label>الرمز</label>
            <input value={levelForm.code} onChange={e => setLevelForm(p => ({ ...p, code: e.target.value }))} className="plain-input" placeholder="1SC" />
          </div>
          <div className="form-field">
            <label>السنة</label>
            <select value={levelForm.year_number} onChange={e => setLevelForm(p => ({ ...p, year_number: Number(e.target.value) }))} className="plain-input">
              <option value={1}>الأولى</option><option value={2}>الثانية</option><option value={3}>الثالثة</option>
            </select>
          </div>
          <div className="form-field full">
            <label>الشعبة</label>
            <select value={levelForm.stream} onChange={e => setLevelForm(p => ({ ...p, stream: e.target.value }))} className="plain-input">
              {Object.entries(STREAM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label>المواد المرتبطة</label>
            <div className="chip-select">
              {subjects.length === 0 && <span className="settings-note">افتح تبويب "المواد الدراسية" أولاً لتحميلها</span>}
              {subjects.map(s => (
                <button type="button" key={s.id}
                  className={`chip ${levelForm.subject_ids.includes(s.id) ? "active" : ""}`}
                  onClick={() => toggleLevelSubject(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={closeModal}>إلغاء</button>
          <button className="modal-btn submit" onClick={submitLevel} disabled={submitting}>
            {submitting ? <span className="btn-spinner" /> : null}{levelForm.id ? "تحديث" : "إضافة"}
          </button>
        </div>
      </AdminModal>

      <AdminModal show={modal?.type === "subject"} onClose={closeModal} title={subjectForm.id ? "تعديل المادة" : "مادة جديدة"}>
        <div className="form-grid">
          <div className="form-field">
            <label>الاسم</label>
            <input value={subjectForm.name} onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field">
            <label>الاسم (فرنسي)</label>
            <input value={subjectForm.name_fr} onChange={e => setSubjectForm(p => ({ ...p, name_fr: e.target.value }))} className="plain-input" />
          </div>
          <div className="form-field">
            <label>الرمز</label>
            <input value={subjectForm.code} onChange={e => setSubjectForm(p => ({ ...p, code: e.target.value }))} className="plain-input" placeholder="MATH" />
          </div>
          <div className="form-field">
            <label>الأيقونة (bootstrap-icons)</label>
            <input value={subjectForm.icon} onChange={e => setSubjectForm(p => ({ ...p, icon: e.target.value }))} className="plain-input" placeholder="bi-calculator-fill" />
          </div>
          <div className="form-field full">
            <label>اللون</label>
            <input type="color" value={subjectForm.color} onChange={e => setSubjectForm(p => ({ ...p, color: e.target.value }))} className="plain-input" style={{ height: 40, padding: 4 }} />
          </div>
          <div className="form-field full">
            <label>المستويات المرتبطة</label>
            <div className="chip-select">
              {levels.length === 0 && <span className="settings-note">افتح تبويب "المستويات الدراسية" أولاً لتحميلها</span>}
              {levels.map(l => (
                <button type="button" key={l.id}
                  className={`chip ${subjectForm.grade_level_ids.includes(l.id) ? "active" : ""}`}
                  onClick={() => toggleSubjectLevel(l.id)}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={closeModal}>إلغاء</button>
          <button className="modal-btn submit" onClick={submitSubject} disabled={submitting}>
            {submitting ? <span className="btn-spinner" /> : null}{subjectForm.id ? "تحديث" : "إضافة"}
          </button>
        </div>
      </AdminModal>

      <AdminModal show={modal?.type === "classroom"} onClose={closeModal} title={classForm.id ? "تعديل القسم" : "قسم جديد"}>
        <div className="form-grid">
          <div className="form-field full">
            <label>اسم القسم</label>
            <input value={classForm.name} onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))} className="plain-input" placeholder="1 ع ت 1" />
          </div>
          <div className="form-field">
            <label>المستوى</label>
            <select value={classForm.grade_level_id} onChange={e => setClassForm(p => ({ ...p, grade_level_id: e.target.value }))} className="plain-input">
              <option value="">-- اختر --</option>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>السنة الدراسية</label>
            <select value={classForm.academic_year_id} onChange={e => setClassForm(p => ({ ...p, academic_year_id: e.target.value }))} className="plain-input">
              <option value="">-- اختر --</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label>السعة</label>
            <input type="number" value={classForm.capacity} onChange={e => setClassForm(p => ({ ...p, capacity: e.target.value }))} className="plain-input" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={closeModal}>إلغاء</button>
          <button className="modal-btn submit" onClick={submitClassroom} disabled={submitting}>
            {submitting ? <span className="btn-spinner" /> : null}{classForm.id ? "تحديث" : "إضافة"}
          </button>
        </div>
      </AdminModal>

      <style>{`
        .settings-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .settings-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px; border: 1px solid #e2e8f0; background: white;
          border-radius: 30px; font-size: 0.85rem; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s;
        }
        .settings-tab.active { background: #4f46e5; color: white; border-color: #4f46e5; }
        .settings-tab:hover:not(.active) { border-color: #4f46e5; color: #4f46e5; }
        .settings-note { font-size: 0.78rem; color: #94a3b8; padding: 12px 24px; margin: 0; }
        .color-swatch { display: inline-block; width: 22px; height: 22px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .plain-input {
          width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          font-size: 0.88rem; color: #0f172a; background: #f8fafc; outline: none;
          transition: all 0.2s; font-family: inherit;
        }
        .plain-input:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #374151; cursor: pointer; }
        .chip-select { display: flex; flex-wrap: wrap; gap: 6px; max-height: 160px; overflow-y: auto; padding: 4px 0; }
        .chip {
          padding: 6px 14px; border: 1.5px solid #e2e8f0; background: white;
          border-radius: 30px; font-size: 0.78rem; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s;
        }
        .chip.active { background: #4f46e5; color: white; border-color: #4f46e5; }
      `}</style>
      {confirmDialog}
    </motion.div>
  );
}