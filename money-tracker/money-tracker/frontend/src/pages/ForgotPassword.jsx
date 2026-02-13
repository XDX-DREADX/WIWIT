import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reuse background logic (simplified)
  const containerRef = useRef(null);
  const cursorGradientRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      if (cursorGradientRef.current) {
        cursorGradientRef.current.style.left = `${clientX}px`;
        cursorGradientRef.current.style.top = `${clientY}px`;
      }

      const orbs = document.querySelectorAll(".parallax-orb");
      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.02;
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
        setTimeout(
          () =>
            setParticles((prev) => prev.filter((p) => p.id !== newParticle.id)),
          1000,
        );
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="auth-page" ref={containerRef}>
      <div className="cursor-effect-container">
        <div ref={cursorGradientRef} className="cursor-gradient" />
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
            style={{ top: "30%", left: "50%", animationDelay: "2s" }}
          />
        </div>
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{ left: p.x, top: p.y }}
          />
        ))}
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">💰</div>
            <div className="auth-logo-text">Money Tracker</div>
          </div>

          {!submitted ? (
            <>
              <h1 className="auth-title">Lupa Password?</h1>
              <p className="auth-subtitle">
                Masukkan email Anda untuk reset password
              </p>

              <form onSubmit={handleSubmit}>
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

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%" }}
                  disabled={loading}
                >
                  {loading ? "Memproses..." : "Kirim Link Reset"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
              <h3 className="text-xl font-bold mb-2">Periksa Email Anda</h3>
              <p className="text-muted mb-6">
                Kami telah mengirimkan instruksi reset password ke{" "}
                <strong>{email}</strong>
              </p>
              <div className="alert alert-success mb-6">
                <small>
                  Karena ini mode demo, silakan gunakan Admin Console untuk
                  mereset password secara manual.
                </small>
              </div>
            </div>
          )}

          <p className="auth-footer">
            Kembali ke <Link to="/login">Halaman Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
