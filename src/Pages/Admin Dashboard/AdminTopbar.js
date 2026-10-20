// admin/AdminTopbar.js
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout, getCurrentYear } from "../../api/services";

const SIDEBAR_ITEMS = [
  { id: "overview",      label: "نظرة عامة" },
  { id: "resources",     label: "الموارد التعليمية" },
  { id: "users",         label: "المستخدمون" },
  { id: "announcements", label: "الإعلانات" },
  { id: "timetable",     label: "جداول الحصص" },
  { id: "settings",      label: "إعدادات النظام" },
];

export default function AdminTopbar({ activeSection }) {
  const navigate = useNavigate();
  const [yearLabel, setYearLabel] = useState("");
  useEffect(() => { getCurrentYear().then(y => setYearLabel(y?.label || "")).catch(() => {}); }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="admin-topbar">
      <div className="topbar-left">
        <h4 className="topbar-title">
          {SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label}
        </h4>
        <span className="topbar-breadcrumb">
          <i className="bi bi-house-fill me-1"></i>
          ثانوية حاج بن جعفر / {SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label}
        </span>
      </div>
      <div className="topbar-right">
        <div className="topbar-badge">
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: "0.5rem" }}></i>
          {yearLabel || "—"}
        </div>
        <button className="topbar-btn" onClick={() => navigate("/")}>
          <i className="bi bi-house-fill"></i>
        </button>
        <button className="topbar-btn" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
