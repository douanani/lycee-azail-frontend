// pages/ContactPage.js
import PageHeader from "../components/PageHeader";
import { BI } from "../Utils/icons";

export default function ContactPage() {
  return (
    <>
      <PageHeader
        icon="bi-telephone-fill"
        title="اتصل بنا"
        sub="نحن في خدمتكم — تواصلوا مع إدارة المؤسسة"
      />

      <div className="container py-5">
        <div className="row g-4 align-items-stretch">
          <div className="col-lg-6" data-aos="fade-left">
            <div className="h-100">
              <h3 className="h4 fw-bold mb-4 d-flex align-items-center gap-2">
                <BI icon="bi-headset" className="text-primary" marginEnd="me-0" />
                <span>معلومات التواصل</span>
              </h3>

              <div className="d-flex flex-column gap-3">
                {[
                  {
                    icon: "bi-geo-alt-fill",
                    label: "العنوان",
                    value: "ثانوية حاج بن جعفر، بلدية العزايل، دائرة بني سنوس، ولاية تلمسان",
                  },
                  {
                    icon: "bi-printer-fill",
                    label: "الفاكس",
                    value: "043 54 67 64",
                  },
                  {
                    icon: "bi-envelope-fill",
                    label: "البريد الإلكتروني",
                    value: "lyceeazail@gmail.com",
                  },
                  {
                    icon: "bi-fb-fill",
                    label: "صفحة الفيسبوك",
                    value: "https://web.facebook.com/lyceeAzail",
                  },
                  {
                    icon: "bi-clock-fill",
                    label: "ساعات العمل",
                    value: "الأحد – الخميس: 8:00 ص – 5:00 م",
                  },
                ].map((item, i) => (
                  <div
                    className="d-flex gap-3"
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                  >
                    <div
                      className="bg-primary bg-opacity-10 p-3 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: "50px", height: "50px" }}
                    >
                      <BI
                        icon={item.icon}
                        className="text-primary fs-4"
                        marginEnd="me-0"
                      />
                    </div>
                    <div className="flex-grow-1">
                      <small className="text-secondary text-uppercase d-block mb-1">
                        {item.label}
                      </small>
                      <div className="fw-bold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-6" data-aos="fade-right">
            <div className="card border-0 shadow-lg h-100">
              <div className="card-body p-4 p-md-5 d-flex flex-column h-100">
                <h3 className="h4 fw-bold mb-4 d-flex align-items-center gap-2">
                  <BI
                    icon="bi-map-fill"
                    className="text-primary"
                    marginEnd="me-0"
                  />
                  <span>موقعنا على الخريطة</span>
                </h3>
                
                <div className="ratio ratio-16x9 rounded-3 overflow-hidden flex-grow-1">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3156.954312564441!2d-1.4638939!3d34.683979799999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd78bd610a0b95b5%3A0xbc191e91815e28f1!2z2KvYp9mG2YjZitipINit2KfYrCDYqNmGINis2LnZgdixIC0g2KfZhNi52LLYp9mK2YQ!5e1!3m2!1sen!2sdz!4v1776355316144!5m2!1sen!2sdz"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="موقع ثانوية حاج بن جعفر"
                  ></iframe>
                </div>
                <p className="text-muted mt-3 mb-0 small text-center">
                  <BI icon="bi-geo-alt" marginEnd="me-1" />
                  ثانوية حاج بن جعفر، بلدية العزايل، ولاية تلمسان
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}