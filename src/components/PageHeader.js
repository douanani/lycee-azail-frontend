// components/PageHeader.js
import { BI } from "../Utils/icons";

export default function PageHeader({ icon, title, sub }) {
  return (
    <section
      className="py-5 text-white page-hero"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      }}
    >
      <div className="container">
        <div className="row justify-content-center text-center">
          <div className="col-lg-8">
            <div className="mb-4 page-hero-icon" data-aos="zoom-in">
              <BI
                icon={icon}
                className="text-info"
                style={{ fontSize: "4rem" }}
                marginEnd="me-0"
              />
            </div>
            <h1
              className="display-4 fw-bold mb-3"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              {title}
            </h1>
            <p
              className="lead text-white-50"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              {sub}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}