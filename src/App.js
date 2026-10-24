// App.js
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react"

// Import Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./Pages/HomePage";
import LessonsPage from "./Pages/LessonsPage";
import ActivitiesPage from "./Pages/ActivitiesPage";
import TimetablePage from "./Pages/TimetablePage";
import ContactPage from "./Pages/ContactPage";
import ExamsPage from "./Pages/ExamsPage";
import AuthPage from "./Pages/Authpage";
import AdminDashboard from "./Pages/Admin Dashboard/AdminDashboard";
import TeacherDashboard from "./Pages/TeacherDashboard";
import StaffDashboard from "./Pages/StaffDashboard";
import AccountPage from "./Pages/AccountPage";


// Import global styles
import "./Styles/global.css";

// Import Bootstrap JS dynamically
if (typeof window !== "undefined") {
  import("bootstrap/dist/js/bootstrap.bundle.min.js");
}

// Add Bootstrap Icons CSS
const bootstrapIconsLink = document.createElement("link");
bootstrapIconsLink.rel = "stylesheet";
bootstrapIconsLink.href =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
document.head.appendChild(bootstrapIconsLink);

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

// Animated routes — needs to be inside BrowserRouter to use useLocation
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/timetable" element={<TimetablePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/counselor" element={<StaffDashboard role="counselor" />} />
          <Route path="/admin-staff" element={<StaffDashboard role="admin_staff" />} />
          <Route path="/supervisor" element={<StaffDashboard role="supervisor" />} />
          <Route path="/account" element={<AccountPage />} />
          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <div className="d-flex flex-column min-vh-100" dir="rtl">
        <Navbar />
        <main className="flex-grow-1">
          <AnimatedRoutes />
        </main>
        <Footer />
        <Analytics />
       <SpeedInsights/>
      </div>
    </BrowserRouter>
  );
}