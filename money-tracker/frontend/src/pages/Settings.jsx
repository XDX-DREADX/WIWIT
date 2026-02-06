import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="page-content-animated">
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{t("settings")}</h2>
      </div>

      <div className="settings-grid" style={{ display: "grid", gap: "1.5rem" }}>
        {/* Appearance Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎨 {t("theme")}</h3>
          </div>

          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">{t("theme")}</div>
                <div className="settings-item-description">
                  {language === "id"
                    ? "Pilih tampilan gelap atau terang"
                    : "Choose dark or light appearance"}
                </div>
              </div>
              <div className="theme-selector">
                <button
                  className={`theme-option ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <span className="theme-option-icon">🌙</span>
                  <span>{t("dark")}</span>
                </button>
                <button
                  className={`theme-option ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <span className="theme-option-icon">☀️</span>
                  <span>{t("light")}</span>
                </button>
                <button
                  className={`theme-option ${theme === "hacker" ? "active" : ""}`}
                  onClick={() => setTheme("hacker")}
                >
                  <span className="theme-option-icon">🧑‍💻</span>
                  <span>{t("hacker")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚙️ {t("settings")}</h3>
          </div>

          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">{t("language")}</div>
                <div className="settings-item-description">
                  {language === "id"
                    ? "Pilih bahasa aplikasi"
                    : "Select application language"}
                </div>
              </div>
              <div
                className="language-selector"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                <button
                  className={`btn ${language === "id" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLanguage("id")}
                >
                  🇮🇩 Indonesia
                </button>
                <button
                  className={`btn ${language === "en" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLanguage("en")}
                >
                  🇺🇸 English
                </button>
                <button
                  className={`btn ${language === "ar" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLanguage("ar")}
                >
                  🇸🇦 العربية
                </button>
                <button
                  className={`btn ${language === "zh" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLanguage("zh")}
                >
                  🇨🇳 中文
                </button>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">{t("currency")}</div>
              </div>
              <select
                className="form-select"
                style={{ width: "auto" }}
                disabled
              >
                <option>IDR (Rp)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👤 {t("account")}</h3>
          </div>

          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">{t("profile")}</div>
              </div>
              <Link to="/profile" className="btn btn-secondary">
                {t("edit")} {t("profile")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .settings-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .settings-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .settings-item-info {
          flex: 1;
        }
        
        .settings-item-label {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .settings-item-description {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        
        .theme-selector {
          display: flex;
          gap: 0.5rem;
        }
        
        .theme-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--text-secondary);
        }
        
        .theme-option:hover {
          border-color: var(--primary-400);
        }
        
        .theme-option.active {
          background: var(--gradient-primary);
          border-color: transparent;
          color: white;
        }
        
        .theme-option-icon {
          font-size: 1.25rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .settings-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .theme-selector, .language-selector {
            width: 100%;
          }
          .theme-option {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
