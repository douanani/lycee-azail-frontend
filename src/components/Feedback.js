// components/Feedback.js — replaces window.confirm() and alert() with accessible, styled UI.
//
//   const [confirm, confirmDialog] = useConfirm();
//   ...
//   if (!(await confirm({ message: "حذف هذا الملف؟" }))) return;
//   ...
//   return (<>... {confirmDialog}</>);
//
//   const [toast, toastEl] = useToast();   toast("تعذّر التحميل", "error")   ...   {toastEl}
//
// Both render through a portal to <body>, so they work inside transformed ancestors (framer-motion).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Feedback.css";

function ConfirmDialog({ opts, onResult }) {
  const cancelRef = useRef(null);
  const { title, message, confirmText, cancelText, danger } = opts;

  useEffect(() => {
    const prev = document.activeElement;
    cancelRef.current?.focus(); // safest default for destructive actions
    const onKey = (e) => e.key === "Escape" && onResult(false);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onResult]);

  return createPortal(
    <div className="fb-overlay" onMouseDown={(e) => e.target === e.currentTarget && onResult(false)}>
      <div className={`fb-dialog ${danger ? "danger" : ""}`} role="alertdialog" aria-modal="true"
           aria-labelledby="fb-title" aria-describedby="fb-msg" dir="rtl">
        <div className="fb-icon"><i className={`bi ${danger ? "bi-trash3-fill" : "bi-question-lg"}`} /></div>
        <h5 className="fb-title" id="fb-title">{title}</h5>
        <p className="fb-msg" id="fb-msg">{message}</p>
        <div className="fb-actions">
          <button ref={cancelRef} className="fb-btn cancel" onClick={() => onResult(false)}>{cancelText}</button>
          <button className="fb-btn ok" onClick={() => onResult(true)}>{confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Returns [confirm(opts) -> Promise<boolean>, dialogElement]. Render dialogElement once in the component. */
export function useConfirm() {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const finish = useCallback((v) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  const confirm = useCallback((o = {}) => {
    resolver.current?.(false); // a second call cancels the first
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOpts({
        title: o.title || "تأكيد الحذف",
        message: o.message || "هل أنت متأكد؟",
        confirmText: o.confirmText || "حذف",
        cancelText: o.cancelText || "إلغاء",
        danger: o.danger !== false,
      });
    });
  }, []);

  // Never leave a pending promise behind if the component unmounts with the dialog open.
  useEffect(() => () => resolver.current?.(false), []);

  return [confirm, opts ? <ConfirmDialog opts={opts} onResult={finish} /> : null];
}

/** Returns [toast(message, "success" | "error"), toastElement]. */
export function useToast(ms = 3200) {
  const [t, setT] = useState(null);
  const timer = useRef(null);

  const toast = useCallback((message, type = "success") => {
    clearTimeout(timer.current);
    setT({ message, type });
    timer.current = setTimeout(() => setT(null), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [
    toast,
    t ? createPortal(<div className={`fb-toast ${t.type}`} role="status" dir="rtl">{t.message}</div>, document.body) : null,
  ];
}
