import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const containerRef = useRef(null);
  const cursorGradientRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);

  // Cursor following & Parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Move cursor gradient
      if (cursorGradientRef.current) {
        cursorGradientRef.current.style.left = `${clientX}px`;
        cursorGradientRef.current.style.top = `${clientY}px`;
      }

      // Parallax effect for orbs
      const orbs = document.querySelectorAll(".parallax-orb");
      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.02; // Different speed for each orb
        const x = (innerWidth - clientX * 2) * speed;
        const y = (innerHeight - clientY * 2) * speed;
        orb.style.transform = `translate(${x}px, ${y}px)`;
      });

      // Create particle occasionally
      if (Math.random() > 0.92) {
        const newParticle = {
          id: particleIdRef.current++,
          x: e.clientX + (Math.random() - 0.5) * 50,
          y: e.clientY + (Math.random() - 0.5) * 50,
        };
        setParticles((prev) => [...prev.slice(-15), newParticle]);

        // Remove particle after animation
        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
        }, 1000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" ref={containerRef}>
      {/* Cursor Following Effect */}
      <div className="cursor-effect-container">
        <div ref={cursorGradientRef} className="cursor-gradient" />

        {/* Floating Orbs with Parallax Wrapper */}
        <div
          className="parallax-orb"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div className="floating-orb" style={{ top: "15%", left: "8%" }} />
        </div>
        <div
          className="parallax-orb"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            className="floating-orb"
            style={{ top: "65%", left: "85%", animationDelay: "1s" }}
          />
        </div>
        <div
          className="parallax-orb"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            className="floating-orb"
            style={{ top: "80%", left: "15%", animationDelay: "2s" }}
          />
        </div>
        <div
          className="parallax-orb"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            className="floating-orb"
            style={{ top: "25%", left: "75%", animationDelay: "3s" }}
          />
        </div>
        <div
          className="parallax-orb"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            className="floating-orb"
            style={{ top: "45%", left: "35%", animationDelay: "4s" }}
          />
        </div>

        {/* Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: particle.x,
              top: particle.y,
            }}
          />
        ))}
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div
              className="auth-logo-icon"
              style={{ animation: "float 3s ease-in-out infinite" }}
            >
              💰
            </div>
            <div className="auth-logo-text">
              Wisdom in Wealth, Income & Tracker
            </div>
          </div>

          <h1 className="auth-title">{t("welcome")}</h1>
          <p className="auth-subtitle">Masuk untuk melanjutkan ke dashboard</p>

          {error && (
            <div
              className="alert alert-error"
              style={{ animation: "springIn 0.3s ease" }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t("email")}
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                {t("password")}
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "1rem",
              }}
            >
              <Link
                to="/forgot-password"
                style={{ fontSize: "0.875rem", color: "var(--primary-400)" }}
              >
                {t("forgot_password")}
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? (
                <span
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    className="loading-spinner"
                    style={{
                      width: "20px",
                      height: "20px",
                      borderWidth: "2px",
                    }}
                  />
                  Memproses...
                </span>
              ) : (
                t("login")
              )}
            </button>
          </form>

          <p className="auth-footer">
            Belum punya akun? <Link to="/register">{t("register")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
