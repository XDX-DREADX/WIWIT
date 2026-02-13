import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import FinancialAssistant from "../widgets/FinancialAssistant";
import ThemeBackground from "../effects/ThemeBackground";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, dir } = useLanguage();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const navItems = [
    { path: "/", icon: "📊", label: t("dashboard") },
    { path: "/transactions", icon: "💳", label: t("transactions") },
    { path: "/wallets", icon: "👛", label: t("wallets") },
    { path: "/categories", icon: "📁", label: t("category") },
    { path: "/budgets", icon: "🎯", label: t("budgets") },
    { path: "/reports", icon: "📄", label: t("reports") },
  ];

  return (
    <div className={`app-layout ${dir === "rtl" ? "rtl" : ""}`} dir={dir}>
      {/* Dynamic Theme Background */}
      <ThemeBackground />

      {/* Profile Card - Top Right Corner */}
      <div className="profile-card-corner ios-glass">
        <Link to="/profile" className="profile-link">
          <div className="profile-avatar-box">
            {user?.profile_photo ? (
              <img src={user.profile_photo} alt="Profile" />
            ) : (
              <span>{user?.name?.[0] || "U"}</span>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.name || "User"}</div>
            <div className="profile-greeting">{getGreeting()} 👋</div>
          </div>
        </Link>
      </div>

      {/* Dynamic Island Navigation */}
      <nav
        className={`dynamic-island ios-glass ${isExpanded ? "expanded" : ""}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="island-content">
          <div className="island-pill">
            <div className="island-icon">💰</div>
            {isExpanded && <span className="island-title fade-in">Wisdom</span>}
          </div>

          <div className="island-menu">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `island-link ${isActive ? "active" : ""}`
                }
                title={item.label}
              >
                <span className="text-xl">{item.icon}</span>
                {isExpanded && (
                  <span className="ml-2 text-sm font-medium fade-in">
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="island-actions">
            <NavLink
              to="/settings"
              className="island-link"
              title={t("settings")}
            >
              <span>⚙️</span>
            </NavLink>

            <button
              onClick={toggleTheme}
              className="island-link"
              title="Toggle Theme"
            >
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🧑‍💻"}
            </button>

            <button onClick={logout} className="island-link" title="Logout">
              🚪
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content-island">
        <Outlet />
      </main>

      <FinancialAssistant />
    </div>
  );
}
