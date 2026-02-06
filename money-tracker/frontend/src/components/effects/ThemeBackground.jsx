import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);

  // Parallax effect for dark mode
  useEffect(() => {
    if (theme !== "dark") return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [theme]);

  // Matrix Rain for hacker mode
  useEffect(() => {
    if (theme !== "hacker") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme]);

  // Render based on theme
  if (theme === "hacker") {
    return (
      <canvas
        ref={canvasRef}
        className="theme-background matrix-rain"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (theme === "dark") {
    return (
      <div
        ref={containerRef}
        className="theme-background parallax-bg"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Parallax gradient orbs that follow mouse */}
        <div
          className="parallax-orb orb-1"
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            left: `${mousePos.x * 0.05}px`,
            top: `${mousePos.y * 0.05}px`,
            transition: "left 0.3s ease-out, top 0.3s ease-out",
          }}
        />
        <div
          className="parallax-orb orb-2"
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)",
            filter: "blur(50px)",
            right: `${-mousePos.x * 0.03 + 100}px`,
            bottom: `${-mousePos.y * 0.03 + 100}px`,
            transition: "right 0.4s ease-out, bottom 0.4s ease-out",
          }}
        />
        <div
          className="parallax-orb orb-3"
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)",
            filter: "blur(40px)",
            left: `${50 + mousePos.x * 0.02}%`,
            top: `${30 + mousePos.y * 0.02}%`,
            transform: "translate(-50%, -50%)",
            transition: "left 0.5s ease-out, top 0.5s ease-out",
          }}
        />
      </div>
    );
  }

  // Light mode - subtle gradient
  return (
    <div
      className="theme-background light-bg"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        background:
          "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)",
      }}
    />
  );
}
