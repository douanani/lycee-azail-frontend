// pages/AuthPage.js
import { useState } from "react";
import { getDashboardPath } from "../api/rolePaths";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { SCHOOL_NAME } from "../Data/constants";
import { login } from "../api/services";

// ── Animation variants ────────────────────────────────────────
const inputVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.09, type: "spring", stiffness: 120, damping: 14 },
  }),
};

// ── FloatingInput ─────────────────────────────────────────────
function FloatingInput({ label, type = "text", icon, index, value, onChange, placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";

  return (
    <motion.div
      className="floating-field"
      variants={inputVariants}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <label className={`floating-label ${focused || value ? "active" : ""}`}>
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
      </label>
      <div className="input-wrap">
        <input
          type={isPassword && showPass ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={focused ? placeholder : ""}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`auth-input ${focused ? "focused" : ""}`}
          dir="rtl"
          disabled={disabled}
          autoComplete={isPassword ? "current-password" : "email"}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle-pass"
            onClick={() => setShowPass((p) => !p)}
            tabIndex={-1}
          >
            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`}></i>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── AuthPage ──────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();

  const [form, setForm]           = useState({ email: "", password: "" });
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState(""); // رسالة الخطأ
  const [fieldError, setFieldError] = useState(false); // حقول فارغة

  const set = (key) => (e) => {
    setError("");
    setFieldError(false);
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // تحقق محلي
    if (!form.email || !form.password) {
      setFieldError(true);
      setTimeout(() => setFieldError(false), 3500);
      return;
    }

    setLoading(true);
    setError("");

       try {
      const user = await login(form.email.trim(), form.password);

      setSuccess(true);

      setTimeout(() => {
        navigate(getDashboardPath(user.role));
      }, 1200);
    } catch (err) {
      setError(err.message || "حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root" dir="rtl">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className="auth-container">
        {/* ── Brand Panel ── */}
        <motion.div
          className="brand-panel"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="brand-content">
            <motion.div
              className="brand-logo"
              whileHover={{ rotate: 8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <i className="bi bi-building-fill" />
            </motion.div>
            <h1 className="brand-name">{SCHOOL_NAME}</h1>
            <p className="brand-sub">مديرية التربية لولاية تلمسان</p>
            <div className="brand-divider" />
            <p className="brand-desc">
              بوابة الإدارة والأساتذة — خاصة بالطاقم التربوي للثانوية
            </p>

            <div className="brand-features">
              {[
                { icon: "bi-person-badge-fill", text: "الأساتذة" },
                { icon: "bi-building-fill",     text: "إدارة المؤسسة" },
                { icon: "bi-shield-lock-fill",  text: "وصول آمن ومحمي" },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  className="brand-feature"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                >
                  <div className="feature-icon">
                    <i className={`bi ${f.icon}`} />
                  </div>
                  <span>{f.text}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="staff-notice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <i className="bi bi-info-circle-fill" />
              <span>
                هذه البوابة مخصصة للأساتذة والإدارة فقط. التلاميذ يستخدمون الموقع
                مباشرة بدون تسجيل.
              </span>
            </motion.div>

            <Link to="/" className="back-home-link">
              <i className="bi bi-arrow-right" />
              <span>العودة للرئيسية</span>
            </Link>
          </div>
        </motion.div>

        {/* ── Form Panel ── */}
        <div className="form-panel">

          <motion.div
            className="role-badge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <i className="bi bi-shield-fill-check" />
            <span>دخول الطاقم التربوي</span>
          </motion.div>

          {/* ── Feedback banners ── */}
          <AnimatePresence>
            {success && (
              <motion.div
                className="feedback-banner success"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <i className="bi bi-check-circle-fill" />
                <span>تم تسجيل الدخول بنجاح! جاري التوجيه...</span>
              </motion.div>
            )}
            {fieldError && (
              <motion.div
                className="feedback-banner error"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <i className="bi bi-x-circle-fill" />
                <span>يرجى ملء جميع الحقول.</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                className="feedback-banner error"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <i className="bi bi-x-circle-fill" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-heading">
            <h2>مرحباً بعودتك</h2>
            <p>أدخل بياناتك المهنية للوصول إلى لوحة التحكم</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <FloatingInput
              label="البريد الإلكتروني المهني"
              type="email"
              icon="bi-envelope-fill"
              index={0}
              value={form.email}
              onChange={set("email")}
              placeholder="prof@education.dz"
              disabled={loading || success}
            />
            <FloatingInput
              label="كلمة المرور"
              type="password"
              icon="bi-lock-fill"
              index={1}
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              disabled={loading || success}
            />

            <motion.div
              className="form-extras"
              variants={inputVariants}
              custom={2}
              initial="hidden"
              animate="visible"
            >
              <label className="remember-me">
                <input type="checkbox" />
                <span>تذكرني</span>
              </label>
              <a href="#forgot" className="forgot-link">نسيت كلمة المرور؟</a>
            </motion.div>

            <motion.button
              type="submit"
              className={`submit-btn ${loading ? "loading" : ""}`}
              variants={inputVariants}
              custom={3}
              initial="hidden"
              animate="visible"
              whileHover={!loading ? { scale: 1.02, boxShadow: "0 12px 30px rgba(59,130,246,0.45)" } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </motion.button>
          </form>

          {/* ── Students info box ── */}
          <motion.div
            className="students-info"
            variants={inputVariants}
            custom={4}
            initial="hidden"
            animate="visible"
          >
            <div className="students-info-icon">
              <i className="bi bi-mortarboard-fill" />
            </div>
            <div>
              <p className="students-info-title">أنت تلميذ؟</p>
              <p className="students-info-text">
                لا تحتاج إلى حساب.{" "}
                <Link to="/" className="students-info-link">تصفح الموقع مباشرة</Link>
                {" "}للوصول إلى الدروس والجداول والاختبارات.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .auth-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
          background: #050d1a;
          font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif;
          padding: 20px;
        }

        .auth-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); opacity: 0.35;
          animation: drift 10s ease-in-out infinite alternate;
        }
        .orb-1 { width:500px; height:500px; background:radial-gradient(circle,#1d4ed8 0%,transparent 70%); top:-150px; right:-100px; animation-duration:12s; }
        .orb-2 { width:400px; height:400px; background:radial-gradient(circle,#0ea5e9 0%,transparent 70%); bottom:-100px; left:-80px; animation-duration:15s; animation-delay:-5s; }
        .orb-3 { width:300px; height:300px; background:radial-gradient(circle,#6366f1 0%,transparent 70%); top:40%; left:30%; animation-duration:18s; animation-delay:-8s; }

        @keyframes drift {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(30px,40px) scale(1.08); }
        }

        .grid-overlay {
          position:absolute; inset:0;
          background-image:
            linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px);
          background-size:60px 60px;
        }

        .auth-container {
          position:relative; z-index:1;
          display:flex; width:100%; max-width:940px; min-height:560px;
          border-radius:28px; overflow:hidden;
          box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06);
        }

        .brand-panel {
          flex:0 0 42%;
          background:linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%);
          padding:48px 40px;
          display:flex; flex-direction:column; justify-content:center;
          position:relative; overflow:hidden;
        }
        .brand-panel::before {
          content:''; position:absolute; top:-80px; right:-80px;
          width:300px; height:300px;
          background:radial-gradient(circle,rgba(96,165,250,.15) 0%,transparent 70%);
          border-radius:50%;
        }
        .brand-content { position:relative; z-index:1; }

        .brand-logo {
          width:68px; height:68px;
          background:linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%);
          border-radius:20px; display:flex; align-items:center; justify-content:center;
          font-size:1.9rem; color:white;
          box-shadow:0 8px 25px rgba(59,130,246,.4);
          margin-bottom:20px; cursor:pointer;
        }
        .brand-name {
          font-size:1.55rem; font-weight:800; margin:0 0 6px; line-height:1.3;
          background:linear-gradient(135deg,#fff 0%,#93c5fd 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .brand-sub  { color:#93c5fd; font-size:.83rem; margin:0 0 20px; }
        .brand-divider { width:40px; height:3px; background:linear-gradient(90deg,#60a5fa,#818cf8); border-radius:2px; margin-bottom:18px; }
        .brand-desc { color:#cbd5e1; font-size:.88rem; line-height:1.7; margin-bottom:22px; }

        .brand-features { display:flex; flex-direction:column; gap:12px; margin-bottom:22px; }
        .brand-feature  { display:flex; align-items:center; gap:12px; color:#e2e8f0; font-size:.88rem; }
        .feature-icon {
          width:34px; height:34px;
          background:rgba(59,130,246,.2); border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          color:#93c5fd; flex-shrink:0;
        }

        .staff-notice {
          display:flex; align-items:flex-start; gap:10px;
          padding:12px 14px;
          background:rgba(251,191,36,.1);
          border:1px solid rgba(251,191,36,.25);
          border-radius:12px; color:#fde68a;
          font-size:.79rem; line-height:1.55; margin-bottom:22px;
        }
        .staff-notice i { flex-shrink:0; margin-top:2px; }

        .back-home-link {
          display:inline-flex; align-items:center; gap:8px;
          color:#60a5fa; text-decoration:none;
          font-size:.87rem; font-weight:500; transition:gap .2s ease;
        }
        .back-home-link:hover { gap:12px; color:white; }

        .form-panel {
          flex:1; background:#ffffff;
          padding:44px 44px 36px;
          display:flex; flex-direction:column; overflow-y:auto;
        }

        .role-badge {
          display:inline-flex; align-items:center; gap:8px;
          padding:8px 16px;
          background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);
          border:1px solid #bfdbfe; border-radius:30px;
          color:#1d4ed8; font-size:.82rem; font-weight:700;
          align-self:flex-start; margin-bottom:22px;
        }

        .feedback-banner {
          display:flex; align-items:center; gap:10px;
          padding:12px 16px; border-radius:12px;
          font-weight:600; font-size:.88rem; margin-bottom:18px;
        }
        .feedback-banner.success { background:#d1fae5; color:#065f46; }
        .feedback-banner.error   { background:#fee2e2; color:#991b1b; }

        .form-heading { margin-bottom:26px; }
        .form-heading h2 { font-size:1.65rem; font-weight:800; color:#0f172a; margin:0 0 6px; }
        .form-heading p  { color:#64748b; margin:0; font-size:.88rem; }

        .auth-form { display:flex; flex-direction:column; gap:16px; }

        .floating-field { display:flex; flex-direction:column; gap:6px; }
        .floating-label {
          display:flex; align-items:center; gap:6px;
          font-size:.82rem; font-weight:600; color:#475569; transition:color .2s;
        }
        .floating-label.active { color:#1d4ed8; }

        .input-wrap { position:relative; }
        .auth-input {
          width:100%; padding:12px 16px;
          border:1.5px solid #e2e8f0; border-radius:12px;
          font-size:.95rem; background:#f8fafc; color:#1e293b;
          font-family:inherit; transition:all .2s; outline:none; box-sizing:border-box;
        }
        .auth-input:disabled { opacity:.6; cursor:not-allowed; }
        .auth-input.focused, .auth-input:focus {
          border-color:#3b82f6; background:white;
          box-shadow:0 0 0 4px rgba(59,130,246,.1);
        }
        .toggle-pass {
          position:absolute; left:12px; top:50%; transform:translateY(-50%);
          border:none; background:transparent; color:#94a3b8;
          cursor:pointer; padding:4px; font-size:1rem; line-height:1; transition:color .2s;
        }
        .toggle-pass:hover { color:#3b82f6; }

        .form-extras { display:flex; align-items:center; justify-content:space-between; font-size:.85rem; }
        .remember-me { display:flex; align-items:center; gap:8px; color:#475569; cursor:pointer; }
        .remember-me input { accent-color:#3b82f6; }
        .forgot-link { color:#3b82f6; text-decoration:none; font-weight:500; }
        .forgot-link:hover { color:#1d4ed8; text-decoration:underline; }

        .submit-btn {
          width:100%; padding:14px 20px;
          background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#60a5fa 100%);
          color:white; border:none; border-radius:14px;
          font-size:1rem; font-weight:700; font-family:inherit;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;
          transition:all .3s; margin-top:4px;
        }
        .submit-btn:disabled { opacity:.75; cursor:not-allowed; }
        .submit-btn.loading  { background:linear-gradient(135deg,#1e40af,#3b82f6); }

        /* Spinner */
        .spinner {
          width:18px; height:18px;
          border:2.5px solid rgba(255,255,255,.3);
          border-top-color:white;
          border-radius:50%;
          animation:spin .7s linear infinite;
          flex-shrink:0;
        }
        @keyframes spin { to { transform:rotate(360deg); } }

        .students-info {
          display:flex; align-items:flex-start; gap:14px;
          margin-top:auto; padding-top:26px;
          border-top:1px dashed #e2e8f0;
        }
        .students-info-icon {
          width:40px; height:40px; flex-shrink:0;
          background:#f1f5f9; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          color:#3b82f6; font-size:1.2rem;
        }
        .students-info-title { font-weight:700; color:#1e293b; margin:0 0 4px; font-size:.9rem; }
        .students-info-text  { color:#64748b; margin:0; font-size:.82rem; line-height:1.6; }
        .students-info-link  { color:#3b82f6; font-weight:600; text-decoration:none; }
        .students-info-link:hover { text-decoration:underline; }

        @media (max-width: 768px) {
          .auth-root { padding:12px; align-items:flex-start; padding-top:20px; }
          .auth-container { flex-direction:column; border-radius:20px; min-height:unset; }
          .brand-panel { flex:unset; padding:28px 24px; }
          .brand-features, .brand-desc, .staff-notice { display:none; }
          .form-panel { padding:28px 24px; }
        }
      `}</style>
    </div>
  );
}