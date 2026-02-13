import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const cursorGradientRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);

  // Cursor following effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorGradientRef.current) {
        cursorGradientRef.current.style.left = `${e.clientX}px`;
        cursorGradientRef.current.style.top = `${e.clientY}px`;
      }

      // Parallax effect for orbs
      const { innerWidth, innerHeight } = window;
      const { clientX, clientY } = e;
      const orbs = document.querySelectorAll(".parallax-orb");
      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.02; // Different speed for each orb
        const x = (innerWidth - clientX * 2) * speed;
        const y = (innerHeight - clientY * 2) * speed;
        orb.style.transform = `translate(${x}px, ${y}px)`;
      });

      if (Math.random() > 0.92) {
        const newParticle = {
          id: particleIdRef.current++,
          x: e.clientX + (Math.random() - 0.5) * 50,
          y: e.clientY + (Math.random() - 0.5) * 50,
        };
        setParticles((prev) => [...prev.slice(-15), newParticle]);
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

    if (password !== confirmPassword) {
      setError("Password tidak sama");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error || "Registrasi gagal. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
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

        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{ left: particle.x, top: particle.y }}
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

          <h1 className="auth-title">Buat Akun Baru</h1>
          <p className="auth-subtitle">
            Mulai kelola keuanganmu dengan lebih baik
          </p>

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
              <label className="form-label" htmlFor="name">
                Nama Lengkap
              </label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
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
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Konfirmasi Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
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
                "Daftar"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
