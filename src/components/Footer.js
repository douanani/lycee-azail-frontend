// components/Footer.js
import { Link } from "react-router-dom";
import { NAV_LINKS, SCHOOL_NAME } from "../Data/constants";
import { BI } from "../Utils/icons";

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-5 mt-auto">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-5" data-aos="fade-up">
            <div className="d-flex align-items-center gap-2 mb-3">
              <BI icon="bi-building" className="fs-2 text-info" marginEnd="me-0" />
              <h5 className="fw-bold mb-0">{SCHOOL_NAME}</h5>
            </div>
            <p className="text-white-50 lh-base">
              مؤسسة تعليمية عمومية في ولاية تلمسان تسعى إلى تقديم تعليم راقٍ
              وبيئة دراسية مثالية.
            </p>
          </div>

          <div className="col-lg-3 col-md-7" data-aos="fade-up" data-aos-delay="100">
            <h6 className="fw-bold text-uppercase small mb-3 text-white-50">
              روابط سريعة
            </h6>
            <ul className="list-unstyled">
              {NAV_LINKS.map((l) => {
                const path = l.id === "home" ? "/" : `/${l.id}`;
                return (
                  <li key={l.id} className="mb-2">
                    <Link
                      to={path}
                      className="text-white-50 text-decoration-none d-inline-flex align-items-center gap-2"
                      style={{ transition: "color 0.2s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                    >
                      <BI icon={l.icon} className="small" marginEnd="me-0" />
                      <span>{l.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="200">
            <h6 className="fw-bold text-uppercase small mb-3 text-white-50">
              معلومات الاتصال
            </h6>
            <ul className="list-unstyled text-white-50">
              <li className="mb-2 d-flex align-items-center gap-2">
                <BI icon="bi-geo-alt-fill" marginEnd="me-0" />
                <span>بلدية العزايل، ولاية تلمسان</span>
              </li>
              <li className="mb-2 d-flex align-items-center gap-2">
                <BI icon="bi-telephone-fill" marginEnd="me-0" />
                <span>043 54 67 64</span>
              </li>
              <li className="mb-2 d-flex align-items-center gap-2">
                <BI icon="bi-envelope-fill" marginEnd="me-0" />
                <span>lyceeazail@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="my-4 bg-secondary" />

        <div className="text-center text-white-50 small">
         © Designed and Developed by Djilali Ouanani 
        </div>
        <div className="text-center text-white-50 small">
          التصميم والبرمجة بواسطة جيلالي وناني ©
        </div>
      </div>
    </footer>
  );
}