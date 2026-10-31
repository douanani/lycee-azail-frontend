// components/ErrorBoundary.js — a render error in one page no longer blanks the whole site.
// `resetKey` (e.g. the current pathname) clears the error when the user navigates elsewhere.
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook for Sentry/etc. later; at least leave a trace in the console.
    console.error("UI error:", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container py-5 text-center" dir="rtl" style={{ maxWidth: 560, minHeight: "55vh" }} role="alert">
        <div style={{ fontSize: "3.5rem", color: "#f59e0b" }}><i className="bi bi-exclamation-triangle-fill" /></div>
        <h2 className="h4 fw-bold mt-3 mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-secondary mb-4">
          تعذّر عرض هذه الصفحة. جرّب إعادة التحميل، وإذا استمرت المشكلة تواصل معنا.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <button className="btn btn-primary px-4" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-2" />إعادة التحميل
          </button>
          <a className="btn btn-outline-secondary px-4" href="/">الرئيسية</a>
        </div>
      </div>
    );
  }
}
