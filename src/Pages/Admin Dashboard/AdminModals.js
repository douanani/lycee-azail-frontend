// admin/AdminModals.js
import AdminModal from "./AdminModal";
import { roleConfig, audienceLabel } from "./adminUtils";

// ─── Add User Modal ────────────────────────────────────────────────────────────
export function AddUserModal({ show, onClose, userForm, setUserForm, handleAddUser, submitting }) {
  return (
    <AdminModal show={show} onClose={onClose} title="إضافة مستخدم جديد">
      <div className="form-grid">
        {[
          { label: "الاسم الكامل",       key: "name",     icon: "bi-person",   placeholder: "أ. محمد بوعزيز", type: "text" },
          { label: "البريد الإلكتروني",  key: "email",    icon: "bi-envelope", placeholder: "user@lycee.dz",  type: "email" },
          { label: "كلمة المرور",        key: "password", icon: "bi-lock",     placeholder: "••••••••",       type: "password" },
        ].map(f => (
          <div key={f.key} className="form-field">
            <label>{f.label}</label>
            <div className="field-wrap">
              <i className={`bi ${f.icon} field-icon`}></i>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={userForm[f.key]}
                onChange={e => setUserForm({ ...userForm, [f.key]: e.target.value })}
              />
            </div>
          </div>
        ))}
        <div className="form-field">
          <label>الدور</label>
          <div className="field-wrap">
            <i className="bi bi-shield field-icon"></i>
            <select
              value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value })}
            >
              {Object.entries(roleConfig)
                .filter(([k]) => k !== "admin")
                .map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
            </select>
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="modal-btn cancel" onClick={onClose}>إلغاء</button>
        <button className="modal-btn submit" onClick={handleAddUser} disabled={submitting}>
          {submitting ? <span className="btn-spinner" /> : <i className="bi bi-person-plus-fill me-2"></i>}
          إضافة
        </button>
      </div>
    </AdminModal>
  );
}

// ─── Add Announcement Modal ────────────────────────────────────────────────────
export function AddAnnouncementModal({ show, onClose, announcementForm, setAnnForm, handleAddAnnouncement, submitting }) {
  return (
    <AdminModal show={show} onClose={onClose} title="نشر إعلان جديد">
      <div className="form-grid">
        <div className="form-field full">
          <label>عنوان الإعلان</label>
          <div className="field-wrap">
            <i className="bi bi-megaphone field-icon"></i>
            <input
              type="text"
              placeholder="عنوان الإعلان..."
              value={announcementForm.title}
              onChange={e => setAnnForm({ ...announcementForm, title: e.target.value })}
            />
          </div>
        </div>
        <div className="form-field full">
          <label>نص الإعلان</label>
          <textarea
            rows={4}
            placeholder="محتوى الإعلان..."
            value={announcementForm.body}
            onChange={e => setAnnForm({ ...announcementForm, body: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label>الجمهور المستهدف</label>
          <div className="field-wrap">
            <i className="bi bi-people field-icon"></i>
            <select
              value={announcementForm.audience}
              onChange={e => setAnnForm({ ...announcementForm, audience: e.target.value })}
            >
              {Object.entries(audienceLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="modal-btn cancel" onClick={onClose}>إلغاء</button>
        <button className="modal-btn submit" onClick={handleAddAnnouncement} disabled={submitting}>
          {submitting ? <span className="btn-spinner" /> : <i className="bi bi-send-fill me-2"></i>}
          نشر
        </button>
      </div>
    </AdminModal>
  );
}

// ─── Add Resource Modal ────────────────────────────────────────────────────────
export function AddResourceModal({
  show, onClose,
  resourceForm, setResForm,
  handleUploadResource,
  submitting,
  uploadPct,
  gradeLevels,
  subjects,
  academicYears,
}) {
  return (
    <AdminModal show={show} onClose={onClose} title="رفع مورد تعليمي">
      <div className="form-grid">
        <div className="form-field full">
          <label>عنوان المورد *</label>
          <div className="field-wrap">
            <i className="bi bi-journal-text field-icon"></i>
            <input
              type="text"
              placeholder="عنوان الملف..."
              value={resourceForm.title}
              onChange={e => setResForm({ ...resourceForm, title: e.target.value })}
            />
          </div>
        </div>
        <div className="form-field">
          <label>النوع *</label>
          <div className="field-wrap">
            <i className="bi bi-tag field-icon"></i>
            <select
              value={resourceForm.type}
              onChange={e => setResForm({ ...resourceForm, type: e.target.value })}
            >
              <option value="lesson">درس</option>
              <option value="exam">اختبار</option>
              <option value="homework">فرض</option>
              <option value="guide">دليل</option>
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>المادة *</label>
          <div className="field-wrap">
            <i className="bi bi-book field-icon"></i>
            <select
              value={resourceForm.subject_id}
              onChange={e => setResForm({ ...resourceForm, subject_id: e.target.value })}
            >
              <option value="">-- اختر --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field full">
          <label>
            المستويات *
            {resourceForm.grade_level_ids.length > 0 && (
              <span style={{ color: "#4f46e5", fontWeight: 600 }}> ({resourceForm.grade_level_ids.length} محدّد)</span>
            )}
          </label>
          <div className="res-lvl-chips">
            {gradeLevels.map(l => {
              const on = resourceForm.grade_level_ids.includes(l.id);
              return (
                <button type="button" key={l.id}
                  className={`res-lvl-chip ${on ? "on" : ""}`}
                  aria-pressed={on}
                  onClick={() => setResForm({
                    ...resourceForm,
                    grade_level_ids: on
                      ? resourceForm.grade_level_ids.filter(x => x !== l.id)
                      : [...resourceForm.grade_level_ids, l.id],
                  })}>
                  {on && <i className="bi bi-check2"></i>} {l.name}
                </button>
              );
            })}
            {gradeLevels.length > 1 && (
              <button type="button" className="res-lvl-chip all"
                onClick={() => setResForm({
                  ...resourceForm,
                  grade_level_ids: resourceForm.grade_level_ids.length === gradeLevels.length ? [] : gradeLevels.map(l => l.id),
                })}>
                {resourceForm.grade_level_ids.length === gradeLevels.length ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            )}
          </div>
          <style>{`
            .res-lvl-chips { display: flex; flex-wrap: wrap; gap: 6px; }
            .res-lvl-chip {
              padding: 6px 14px; border: 1.5px solid #e2e8f0; background: white; border-radius: 30px;
              font-size: 0.78rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s;
              font-family: inherit;
            }
            .res-lvl-chip:hover { border-color: #4f46e5; color: #4f46e5; }
            .res-lvl-chip.on { background: #4f46e5; border-color: #4f46e5; color: white; }
            .res-lvl-chip.all { border-style: dashed; }
          `}</style>
        </div>
        <div className="form-field">
          <label>السنة الدراسية</label>
          <div className="field-wrap">
            <i className="bi bi-calendar3 field-icon"></i>
            <select
              value={resourceForm.academic_year_id}
              onChange={e => setResForm({ ...resourceForm, academic_year_id: e.target.value })}
            >
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>الفصل</label>
          <div className="field-wrap">
            <i className="bi bi-calendar2-week field-icon"></i>
            <select
              value={resourceForm.semester}
              onChange={e => setResForm({ ...resourceForm, semester: e.target.value })}
            >
              <option>الفصل الأول</option>
              <option>الفصل الثاني</option>
              <option>الفصل الثالث</option>
            </select>
          </div>
        </div>
        <div className="form-field full">
          <label>الملف (PDF) *</label>
          <label className="file-drop-zone" htmlFor="res-file-input">
            {resourceForm.file ? (
              <>
                <i className="bi bi-file-earmark-check-fill" style={{ color: "#10b981" }}></i>
                <span style={{ color: "#10b981", fontWeight: 600 }}>{resourceForm.file.name}</span>
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload-fill"></i>
                <span>اسحب الملف هنا أو انقر للتحميل</span>
              </>
            )}
          </label>
          <input
            id="res-file-input"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            style={{ display: "none" }}
            onChange={e => setResForm({ ...resourceForm, file: e.target.files[0] || null })}
          />
        </div>
      </div>
      <div className="modal-actions">
        <button className="modal-btn cancel" onClick={onClose}>إلغاء</button>
        <button className="modal-btn submit" onClick={handleUploadResource} disabled={submitting}>
          {submitting ? <span className="btn-spinner" /> : <i className="bi bi-cloud-upload-fill me-2"></i>}
          {uploadPct != null ? `جارٍ الرفع ${uploadPct}%` : "رفع"}
        </button>
      </div>
    </AdminModal>
  );
}