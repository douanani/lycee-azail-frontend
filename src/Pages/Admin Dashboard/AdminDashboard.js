// pages/AdminDashboard.js
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";

// ─── Data layer (Supabase) ─────────────────────────────────────────────────────
import {
  getDashboard, getUsers, createUser, deleteUser, setUserActive,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getResources, uploadResource, deleteResource,
  getGradeLevels, getSubjects, getAcademicYears, errMsg,
} from "../../api/services";
import useAuthGuard from "../../api/useAuthGuard";
import MobileDashNav, { useTableLabels } from "../MobileDashNav";

// ─── Layout components ─────────────────────────────────────────────────────────
import AdminSidebar from "./AdminSidebar";
import AdminTopbar  from "./AdminTopbar";

// ─── Section components ────────────────────────────────────────────────────────
import OverviewSection      from "./OverviewSection";
import ResourcesSection     from "./ResourcesSection";
import UsersSection         from "./UsersSection";
import AnnouncementsSection from "./AnnouncementsSection";
import TimetableSection     from "./TimetableSection";
import SettingsSection      from "./SettingsSection";

// ─── Modals ────────────────────────────────────────────────────────────────────
import { AddUserModal, AddAnnouncementModal, AddResourceModal } from "./AdminModals";

// ─── Toast ────────────────────────────────────────────────────────────────────
import { motion } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const adminUser = useAuthGuard(["admin"]);
  useTableLabels(); // must stay above the early return (hook order)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [modal, setModal]                 = useState(null);
  const [toast, setToast]                 = useState(null);

  // ── API data ──────────────────────────────────────────────────────────────
  const [stats, setStats]               = useState(null);
  const [recentResources, setRecentRes] = useState([]);
  const [topDownloaded, setTopDl]       = useState([]);
  const [users, setUsers]               = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [gradeLevels, setGradeLevels]   = useState([]);
  const [subjects, setSubjects]         = useState([]);
  const [academicYears, setAcadYears]   = useState([]);
  const [resources, setResources]       = useState([]);

  // ── Loading / submitting ──────────────────────────────────────────────────
  const [loading, setLoading]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct]   = useState(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [userFilter, setUserFilter]         = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [userForm, setUserForm] = useState({
    name: "", email: "", role: "teacher", password: "", password_confirmation: ""
  });
  const [announcementForm, setAnnForm] = useState({
    title: "", body: "", audience: "all"
  });
  const [resourceForm, setResForm] = useState({
    title: "", type: "lesson", subject_id: "", grade_level_id: "",
    academic_year_id: "", semester: "الفصل الأول", file: null
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoad("dashboard", true);
    try {
      const data = await getDashboard();
      setStats(data.stats);
      setRecentRes(data.recent_resources || []);
      setTopDl(data.top_downloaded || []);
    } catch { showToast("تعذّر تحميل إحصائيات لوحة التحكم", "error"); }
    finally { setLoad("dashboard", false); }
  }, [showToast]);

  const fetchUsers = useCallback(async () => {
    setLoad("users", true);
    try {
      const { data } = await getUsers({ role: userFilter !== "all" ? userFilter : undefined, perPage: 200 });
      setUsers(data);
    } catch { showToast("تعذّر تحميل المستخدمين", "error"); }
    finally { setLoad("users", false); }
  }, [userFilter, showToast]);

  const fetchAnnouncements = useCallback(async () => {
    setLoad("announcements", true);
    try {
      setAnnouncements(await getAnnouncements());
    } catch { showToast("تعذّر تحميل الإعلانات", "error"); }
    finally { setLoad("announcements", false); }
  }, [showToast]);

  const fetchResources = useCallback(async () => {
    setLoad("resources", true);
    try {
      const { data } = await getResources({
        type: resourceFilter !== "all" ? resourceFilter : undefined,
        perPage: 200,
      });
      setResources(data);
    } catch { showToast("تعذّر تحميل الموارد", "error"); }
    finally { setLoad("resources", false); }
  }, [resourceFilter, showToast]);

  const fetchFormData = useCallback(async () => {
    try {
      const [lvls, subjs, years] = await Promise.all([
        getGradeLevels(), getSubjects(), getAcademicYears(),
      ]);
      setGradeLevels(lvls);
      setSubjects(subjs);
      setAcadYears(years);
      const current = years.find(y => y.is_current);
      if (current) setResForm(p => ({ ...p, academic_year_id: current.id }));
    } catch { /* silent */ }
  }, []);

  // ── Initial load & reactive fetches (each fetch re-creates when its filter changes) ──
  useEffect(() => { fetchDashboard(); fetchFormData(); }, [fetchDashboard, fetchFormData]);
  useEffect(() => { if (activeSection === "users")         fetchUsers(); },         [activeSection, fetchUsers]);
  useEffect(() => { if (activeSection === "announcements") fetchAnnouncements(); }, [activeSection, fetchAnnouncements]);
  useEffect(() => { if (activeSection === "resources")     fetchResources(); },     [activeSection, fetchResources]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      showToast("يرجى ملء جميع الحقول المطلوبة", "error"); return;
    }
    if (userForm.password.length < 8) {
      showToast("كلمة المرور 8 أحرف على الأقل", "error"); return;
    }
    setSubmitting(true);
    try {
      await createUser({
        name: userForm.name, email: userForm.email,
        password: userForm.password, role: userForm.role,
      });
      showToast("تم إضافة المستخدم بنجاح");
      setModal(null);
      setUserForm({ name: "", email: "", role: "teacher", password: "", password_confirmation: "" });
      fetchUsers();
      fetchDashboard();
    } catch (err) {
      showToast(errMsg(err, "فشل إضافة المستخدم"), "error");
    } finally { setSubmitting(false); }
  };

  const handleToggleUser = async (user) => {
    try {
      await setUserActive(user.id, !user.is_active);
      showToast(`تم ${user.is_active ? "تعطيل" : "تفعيل"} حساب ${user.name}`);
      fetchUsers();
    } catch (err) { showToast(errMsg(err, "فشلت العملية"), "error"); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`هل تريد حذف ${user.name}؟`)) return;
    try {
      await deleteUser(user.id);
      showToast("تم حذف المستخدم بنجاح");
      fetchUsers();
      fetchDashboard();
    } catch (err) {
      showToast(errMsg(err, "فشل الحذف"), "error");
    }
  };

  const handleAddAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.body) {
      showToast("يرجى ملء العنوان والنص", "error"); return;
    }
    setSubmitting(true);
    try {
      await createAnnouncement(announcementForm);
      showToast("تم نشر الإعلان بنجاح");
      setModal(null);
      setAnnForm({ title: "", body: "", audience: "all" });
      fetchAnnouncements();
      fetchDashboard();
    } catch (err) {
      showToast(errMsg(err, "فشل النشر"), "error");
    } finally { setSubmitting(false); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("تأكيد حذف الإعلان؟")) return;
    try {
      await deleteAnnouncement(id);
      showToast("تم حذف الإعلان");
      fetchAnnouncements();
    } catch (err) { showToast(errMsg(err, "فشل الحذف"), "error"); }
  };

  const handleUploadResource = async () => {
    if (!resourceForm.title || !resourceForm.subject_id || !resourceForm.grade_level_id || !resourceForm.file) {
      showToast("يرجى ملء جميع الحقول وتحديد الملف", "error"); return;
    }
    setSubmitting(true);
    setUploadPct(0);
    try {
      const { file, ...meta } = resourceForm;
      await uploadResource({ file, meta, onProgress: setUploadPct });
      showToast("تم رفع المورد بنجاح");
      setModal(null);
      setResForm(p => ({ ...p, title: "", file: null }));
      if (activeSection === "resources") fetchResources();
      fetchDashboard();
    } catch (err) {
      showToast(errMsg(err, "فشل الرفع"), "error");
    } finally { setSubmitting(false); setUploadPct(null); }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm("تأكيد الحذف؟")) return;
    try {
      await deleteResource(id);
      showToast("تم الحذف بنجاح");
      fetchResources();
      fetchDashboard();
    } catch (err) { showToast(errMsg(err, "فشل الحذف"), "error"); }
  };

  if (!adminUser) return null; // guard is checking the session / redirecting

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-root" dir="rtl">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`admin-toast ${toast.type}`}
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
          >
            <i className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}></i>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        adminUser={adminUser}
      />

      {/* ── Main ── */}
      <main className="admin-main">
        <AdminTopbar activeSection={activeSection} />

        {/* ── Sections ── */}
        <AnimatePresence mode="wait">
          {activeSection === "overview" && (
            <OverviewSection
              stats={stats}
              recentResources={recentResources}
              topDownloaded={topDownloaded}
              loading={loading}
              setActiveSection={setActiveSection}
              setModal={setModal}
              handleDeleteResource={handleDeleteResource}
            />
          )}

          {activeSection === "resources" && (
            <ResourcesSection
              resources={resources}
              resourceFilter={resourceFilter}
              setResourceFilter={setResourceFilter}
              loading={loading}
              setModal={setModal}
              handleDeleteResource={handleDeleteResource}
            />
          )}

          {activeSection === "users" && (
            <UsersSection
              users={users}
              userFilter={userFilter}
              setUserFilter={setUserFilter}
              loading={loading}
              setModal={setModal}
              handleToggleUser={handleToggleUser}
              handleDeleteUser={handleDeleteUser}
            />
          )}

          {activeSection === "announcements" && (
            <AnnouncementsSection
              announcements={announcements}
              loading={loading}
              setModal={setModal}
              handleDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}

          {activeSection === "timetable" && <TimetableSection showToast={showToast} />}

          {activeSection === "settings" && (
            <SettingsSection showToast={showToast} />
          )}
        </AnimatePresence>
      </main>

      {/* ── Modals ── */}
      <AddUserModal
        show={modal?.type === "addUser"}
        onClose={() => setModal(null)}
        userForm={userForm}
        setUserForm={setUserForm}
        handleAddUser={handleAddUser}
        submitting={submitting}
      />

      <AddAnnouncementModal
        show={modal?.type === "addAnnouncement"}
        onClose={() => setModal(null)}
        announcementForm={announcementForm}
        setAnnForm={setAnnForm}
        handleAddAnnouncement={handleAddAnnouncement}
        submitting={submitting}
      />

      <AddResourceModal
        show={modal?.type === "addResource"}
        onClose={() => setModal(null)}
        resourceForm={resourceForm}
        setResForm={setResForm}
        handleUploadResource={handleUploadResource}
        submitting={submitting}
        uploadPct={uploadPct}
        gradeLevels={gradeLevels}
        subjects={subjects}
        academicYears={academicYears}
      />

      {/* ── Mobile bottom nav (sidebar is hidden <=991px) ── */}
      <MobileDashNav
        items={[
          { id: "overview",      label: "الرئيسية",  icon: "bi-grid-1x2-fill" },
          { id: "resources",     label: "الموارد",   icon: "bi-journal-bookmark-fill" },
          { id: "users",         label: "المستخدمون", icon: "bi-people-fill" },
          { id: "announcements", label: "الإعلانات", icon: "bi-megaphone-fill" },
        ]}
        moreItems={[
          { id: "timetable", label: "جداول الحصص",    icon: "bi-calendar-week-fill" },
          { id: "settings",  label: "إعدادات النظام", icon: "bi-gear-fill" },
        ]}
        active={activeSection}
        onSelect={setActiveSection}
        accent="#4f46e5"
      />

      {/* ── Styles (unchanged from original) ── */}
      <style>{`
        * { box-sizing: border-box; }

        .admin-root {
          display: flex; min-height: 100vh;
          background: #f1f5f9;
          font-family: 'Noto Sans Arabic', 'Segoe UI', sans-serif;
          direction: rtl;
        }

        /* Toast */
        .admin-toast {
          position: fixed; top: 20px; left: 50%; z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 24px; border-radius: 50px;
          font-weight: 600; font-size: 0.9rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15); pointer-events: none;
        }
        .admin-toast.success { background: #10b981; color: white; }
        .admin-toast.error   { background: #ef4444; color: white; }

        /* Sidebar */
        .admin-sidebar {
          background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%);
          height: 100vh; position: sticky; top: 0;
          display: flex; flex-direction: column;
          overflow: hidden; flex-shrink: 0;
          border-left: 1px solid rgba(255,255,255,0.06); z-index: 100;
        }
        .sidebar-brand {
          display: flex; align-items: center; gap: 12px;
          padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
          min-height: 80px; position: relative;
        }
        .brand-icon {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.2rem; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(59,130,246,0.35);
        }
        .brand-text { overflow: hidden; flex: 1; }
        .brand-name { display: block; color: white; font-weight: 700; font-size: 0.95rem; white-space: nowrap; }
        .brand-sub  { display: block; color: #64748b; font-size: 0.72rem; white-space: nowrap; }
        .sidebar-toggle-btn {
          position: absolute; left: -1px; top: 50%; transform: translateY(-50%);
          width: 24px; height: 24px; background: #1e3a5f;
          border: 1px solid rgba(255,255,255,0.12); border-radius: 50%;
          color: #94a3b8; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; transition: all 0.2s;
        }
        .sidebar-toggle-btn:hover { background: #3b82f6; color: white; border-color: #3b82f6; }
        .sidebar-nav {
          flex: 1; padding: 12px 10px;
          display: flex; flex-direction: column; gap: 4px;
          overflow-y: auto; overflow-x: hidden;
        }
        .sidebar-nav::-webkit-scrollbar { width: 0; }
        .sidebar-nav-item {
          position: relative; display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border: none; background: transparent;
          border-radius: 12px; color: #94a3b8; cursor: pointer;
          transition: all 0.25s; text-align: right; white-space: nowrap; overflow: hidden;
        }
        .sidebar-nav-item:hover  { background: rgba(255,255,255,0.06); color: white; }
        .sidebar-nav-item.active { color: white; background: rgba(59,130,246,0.15); }
        .nav-icon { font-size: 1.15rem; flex-shrink: 0; }
        .nav-label { font-size: 0.9rem; font-weight: 500; }
        .nav-active-bar {
          position: absolute; right: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          border-radius: 0 3px 3px 0;
        }
        .sidebar-footer {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-top: 1px solid rgba(255,255,255,0.08); overflow: hidden;
        }
        .admin-avatar {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1rem; flex-shrink: 0;
        }
        .admin-info { overflow: hidden; }
        .admin-name  { display: block; color: white; font-weight: 600; font-size: 0.85rem; white-space: nowrap; }
        .admin-email { display: block; color: #475569; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Main */
        .admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .admin-topbar {
          display: flex; align-items: center; justify-content: space-between;
          background: white; padding: 16px 28px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky; top: 0; z-index: 50;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .topbar-title      { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
        .topbar-breadcrumb { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
        .topbar-right      { display: flex; align-items: center; gap: 10px; }
        .topbar-badge {
          display: flex; align-items: center; padding: 6px 14px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 30px; font-size: 0.8rem; font-weight: 600; color: #475569;
        }
        .topbar-btn {
          width: 38px; height: 38px; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 10px;
          color: #475569; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .topbar-btn:hover { background: #4f46e5; color: white; border-color: #4f46e5; }

        /* Section */
        .section-content { padding: 28px; flex: 1; }
        .section-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
        }

        /* Stats */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px; margin-bottom: 28px;
        }
        .stat-card {
          background: white; border-radius: 20px; padding: 24px;
          display: flex; align-items: center; gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
          position: relative; overflow: hidden; transition: all 0.3s ease; cursor: default;
        }
        .stat-glow {
          position: absolute; width: 80px; height: 80px; border-radius: 50%;
          bottom: -30px; left: -20px; opacity: 0.08; pointer-events: none;
        }
        .stat-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.5rem; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .stat-value { font-size: 1.7rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .stat-label { font-size: 0.82rem; color: #94a3b8; margin-top: 4px; font-weight: 500; }

        /* Charts */
        .charts-row {
          display: grid; grid-template-columns: 1fr 340px;
          gap: 24px; margin-bottom: 28px;
        }
        .chart-card {
          background: white; border-radius: 20px; padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
        }
        .chart-header { margin-bottom: 20px; }
        .chart-header h6 { margin: 0; font-weight: 700; color: #0f172a; font-size: 0.95rem; }
        .bar-chart-wrap { display: flex; flex-direction: column; gap: 16px; }
        .bar-row { display: flex; align-items: center; gap: 12px; }
        .bar-label { min-width: 120px; font-size: 0.78rem; color: #64748b; font-weight: 500; text-align: right; }
        .bar-track { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .bar-fill {
          height: 10px; border-radius: 6px; min-width: 4px;
          display: flex; align-items: center; justify-content: flex-end;
          padding-right: 8px; font-size: 0.7rem; font-weight: 700; color: white;
        }
        .bar-fill.lessons { background: linear-gradient(90deg, #4f46e5, #818cf8); }
        .quick-actions-list { display: flex; flex-direction: column; gap: 8px; }
        .quick-action-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 12px; cursor: pointer; transition: all 0.2s;
          text-align: right; width: 100%; color: #0f172a;
          font-size: 0.88rem; font-weight: 500;
        }
        .quick-action-btn:hover { background: #eff6ff; border-color: #bfdbfe; }
        .qa-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; }
        .qa-arrow { margin-right: auto; color: #94a3b8; font-size: 0.75rem; }

        /* Table */
        .table-card {
          background: white; border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
          overflow: hidden; margin-bottom: 24px;
        }
        .table-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
        }
        .table-card-header h6 { margin: 0; font-weight: 700; color: #0f172a; }
        .see-all-btn {
          display: flex; align-items: center; gap: 6px; font-size: 0.82rem;
          color: #4f46e5; background: none; border: none; cursor: pointer; font-weight: 600; transition: gap 0.2s;
        }
        .see-all-btn:hover { gap: 10px; }
        .count-badge { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
        .data-table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead tr { background: #f8fafc; }
        .data-table thead th {
          padding: 12px 16px; text-align: right;
          font-size: 0.78rem; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
        }
        .data-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background 0.15s; }
        .data-table tbody tr:last-child { border-bottom: none; }
        .data-table tbody tr:hover { background: #f8fafc; }
        .data-table tbody td { padding: 14px 16px; font-size: 0.88rem; color: #374151; vertical-align: middle; }
        .td-title  { font-weight: 600; color: #0f172a; max-width: 220px; }
        .td-date   { color: #94a3b8; font-size: 0.8rem; white-space: nowrap; }
        .td-actions { display: flex; gap: 6px; }
        .type-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;
        }
        .tbl-action-btn {
          width: 30px; height: 30px; border: none; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; transition: all 0.2s; text-decoration: none;
        }
        .tbl-action-btn.delete { background: #fee2e2; color: #ef4444; }
        .tbl-action-btn.view   { background: #d1fae5; color: #10b981; }
        .tbl-action-btn:hover  { filter: brightness(0.9); transform: scale(1.05); }

        /* Filters */
        .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-chip {
          padding: 7px 16px; border: 1px solid #e2e8f0; background: white;
          border-radius: 30px; font-size: 0.82rem; font-weight: 600;
          color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .filter-chip.active { background: #4f46e5; color: white; border-color: #4f46e5; }
        .filter-chip:hover:not(.active) { border-color: #4f46e5; color: #4f46e5; }
        .primary-action-btn {
          display: flex; align-items: center; padding: 10px 22px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; border: none; border-radius: 30px;
          font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(79,70,229,0.35);
        }
        .primary-action-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(79,70,229,0.4); }

        /* Users */
        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .user-card {
          background: white; border-radius: 20px; border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.3s ease;
        }
        .user-card-header { padding: 24px 20px 14px; position: relative; display: flex; justify-content: center; }
        .user-avatar {
          width: 52px; height: 52px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .user-status-dot {
          position: absolute; top: 14px; left: 14px;
          width: 11px; height: 11px; border-radius: 50%; border: 2px solid white;
        }
        .user-status-dot.active   { background: #10b981; }
        .user-status-dot.inactive { background: #94a3b8; }
        .user-card-body { padding: 4px 20px 14px; text-align: center; }
        .user-name { margin: 8px 0 6px; font-weight: 700; font-size: 0.95rem; color: #0f172a; }
        .user-role-chip { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 10px; }
        .user-email, .user-last-login { margin: 4px 0; font-size: 0.78rem; color: #94a3b8; }
        .user-card-footer { display: flex; gap: 6px; padding: 12px 16px; border-top: 1px solid #f8fafc; background: #fafafa; }
        .uc-btn {
          flex: 1; padding: 7px; border: none; border-radius: 8px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .uc-btn.deactivate { background: #fef3c7; color: #d97706; }
        .uc-btn.activate   { background: #d1fae5; color: #059669; }
        .uc-btn.delete     { background: #fee2e2; color: #ef4444; max-width: 36px; flex: 0 0 36px; }
        .uc-btn:hover { filter: brightness(0.92); transform: scale(1.03); }

        /* Announcements */
        .announcements-list { display: flex; flex-direction: column; gap: 14px; }
        .announce-card {
          background: white; border-radius: 16px; border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          display: flex; align-items: center; overflow: hidden; transition: all 0.2s;
        }
        .announce-indicator { width: 5px; align-self: stretch; flex-shrink: 0; }
        .announce-card.published .announce-indicator { background: linear-gradient(180deg, #10b981, #059669); }
        .announce-card.draft     .announce-indicator { background: linear-gradient(180deg, #f59e0b, #d97706); }
        .announce-content { flex: 1; padding: 18px 20px; }
        .announce-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .announce-top h6 { margin: 0; font-weight: 700; color: #0f172a; font-size: 0.92rem; }
        .pub-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .pub-badge.published { background: #d1fae5; color: #059669; }
        .pub-badge.draft     { background: #fef3c7; color: #d97706; }
        .announce-meta { display: flex; gap: 18px; font-size: 0.78rem; color: #94a3b8; flex-wrap: wrap; }
        .announce-actions { padding: 0 16px; display: flex; gap: 8px; }

        /* Timetable placeholder */
        .timetable-placeholder {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 400px; text-align: center; color: #94a3b8;
        }
        .timetable-placeholder i   { font-size: 5rem; margin-bottom: 20px; color: #cbd5e1; }
        .timetable-placeholder h5  { color: #475569; font-weight: 700; }
        .timetable-placeholder p   { max-width: 400px; font-size: 0.88rem; }

        /* Settings */
        .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .setting-card {
          background: white; border-radius: 20px; border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 24px;
          display: flex; align-items: flex-start; gap: 16px; transition: all 0.3s ease;
        }
        .setting-icon { width: 50px; height: 50px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .setting-info { flex: 1; }
        .setting-info h6 { margin: 0 0 4px; font-weight: 700; color: #0f172a; }
        .setting-info p  { margin: 0; font-size: 0.82rem; color: #94a3b8; line-height: 1.5; }
        .setting-action-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 30px; background: transparent; border: 1px solid;
          font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; margin-top: 2px;
        }
        .setting-action-btn:hover { filter: brightness(0.9); transform: translateX(-2px); }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,23,42,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-panel {
          background: white; border-radius: 24px; width: 100%; max-width: 560px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.2);
        }
        .modal-header-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
        }
        .modal-title-text { margin: 0; font-weight: 700; color: #0f172a; font-size: 1.05rem; }
        .modal-close-btn {
          width: 32px; height: 32px; background: #f8fafc; border: none; border-radius: 10px;
          color: #94a3b8; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-close-btn:hover { background: #fee2e2; color: #ef4444; }
        .modal-body-content { padding: 24px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .form-field.full { grid-column: 1 / -1; }
        .form-field label { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .field-wrap { position: relative; display: flex; align-items: center; }
        .field-icon { position: absolute; right: 14px; z-index: 1; color: #94a3b8; font-size: 0.95rem; pointer-events: none; }
        .field-wrap input, .field-wrap select {
          width: 100%; padding: 10px 42px 10px 14px;
          border: 1.5px solid #e2e8f0; border-radius: 12px;
          font-size: 0.88rem; color: #0f172a; background: #f8fafc;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .field-wrap input:focus, .field-wrap select:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .form-field textarea {
          width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          font-size: 0.88rem; color: #0f172a; background: #f8fafc; outline: none;
          transition: all 0.2s; resize: vertical; font-family: inherit; min-height: 100px;
        }
        .form-field textarea:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .file-drop-zone {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 28px; border: 2px dashed #e2e8f0; border-radius: 14px;
          background: #f8fafc; cursor: pointer; transition: all 0.2s; color: #94a3b8; font-size: 0.88rem;
        }
        .file-drop-zone i { font-size: 2rem; color: #4f46e5; }
        .file-drop-zone:hover { border-color: #4f46e5; background: #eff6ff; }
        .modal-actions { display: flex; justify-content: flex-start; gap: 10px; }
        .modal-btn {
          padding: 10px 24px; border-radius: 30px; font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; border: none;
        }
        .modal-btn.cancel { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
        .modal-btn.submit { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
        .modal-btn.cancel:hover { background: #f1f5f9; }
        .modal-btn.submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,70,229,0.4); }
        .modal-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }

        .btn-spinner {
          width: 16px; height: 16px; margin-left: 8px;
          border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 600px) { .section-content { padding: 16px; } .stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; } .form-grid { grid-template-columns: 1fr; } .admin-topbar { padding: 12px 16px; } }
      `}</style>
    </div>
  );
}