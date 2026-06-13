"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Splash() {
  const canvasRef = useRef(null);
  const [thrown, setThrown] = useState(false);
  const [hint, setHint] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Draw dartboard
    const drawBoard = (cx, cy, r) => {
      const colors = ["#E51D2A", "#1a1a1a", "#E51D2A", "#1a1a1a"];
      const rings = [r, r * 0.85, r * 0.55, r * 0.35, r * 0.15, r * 0.07];
      for (let i = 0; i < rings.length - 1; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, rings[i], 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? "#1a1a1a" : "#2a2a2a";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Wire segments
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 - Math.PI / 20;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      // Scoring rings
      [[r * 0.85, r * 0.75], [r * 0.55, r * 0.48]].forEach(([outer, inner]) => {
        for (let i = 0; i < 20; i++) {
          const a1 = (i / 20) * Math.PI * 2 - Math.PI / 20;
          const a2 = ((i + 1) / 20) * Math.PI * 2 - Math.PI / 20;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a1) * inner, cy + Math.sin(a1) * inner);
          ctx.arc(cx, cy, inner, a1, a2);
          ctx.arc(cx, cy, outer, a2, a1, true);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? "#E51D2A" : "#1a7a3a";
          ctx.fill();
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
      // Bull
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = "#1a7a3a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "#E51D2A";
      ctx.fill();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Barrel
      ctx.beginPath();
      ctx.rect(-18, -2.5, 26, 5);
      ctx.fillStyle = "#c8a84b";
      ctx.fill();
      // Tip
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(22, 0);
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Flight
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-32, -10);
      ctx.lineTo(-26, 0);
      ctx.lineTo(-32, 10);
      ctx.closePath();
      ctx.fillStyle = "#E51D2A";
      ctx.fill();
      ctx.restore();
    };

    // Particle burst
    const burst = (x, y) => {
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6",
          size: 2 + Math.random() * 3,
        });
      }
    };

    let dartState = { x: -80, y: 0, targetX: 0, targetY: 0, flying: false, stuck: false, stuckX: 0, stuckY: 0 };
    let cx, cy, r;

    const setBoard = () => {
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      r = Math.min(canvas.width, canvas.height) * 0.32;
    };
    setBoard();
    window.addEventListener("resize", setBoard);

    // Idle dart position
    dartState.x = cx - r - 120;
    dartState.y = cy + 40;

    let phase = "idle"; // idle | flying | stuck | done
    let flyProgress = 0;
    let flyFrom = { x: 0, y: 0 };
    let flyTo = { x: 0, y: 0 };
    let stuckX = 0, stuckY = 0;

    const throwDart = () => {
      if (phase !== "idle") return;
      setThrown(true);
      phase = "flying";
      flyProgress = 0;
      flyFrom = { x: dartState.x, y: dartState.y };
      // Aim near bullseye with slight random
      flyTo = {
        x: cx + (Math.random() - 0.5) * r * 0.25,
        y: cy + (Math.random() - 0.5) * r * 0.25,
      };
    };

    // Expose throw to click handler
    window.__throwDart = throwDart;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
      grad.addColorStop(0, "rgba(229,29,42,0.08)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard(cx, cy, r);

      if (phase === "idle") {
        const wobble = Math.sin(Date.now() / 600) * 4;
        drawDart(dartState.x + wobble, dartState.y, -0.15);
      }

      if (phase === "flying") {
        flyProgress += 0.045;
        const t = flyProgress;
        // Arc path
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * t;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * t - Math.sin(t * Math.PI) * 60;
        const angle = Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x);
        drawDart(px, py, angle);
        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x;
          stuckY = flyTo.y;
          burst(stuckX, stuckY);
          setTimeout(() => { phase = "done"; router.push("/"); }, 900);
        }
      }

      if (phase === "stuck" || phase === "done") {
        drawDart(stuckX, stuckY, -0.1);
      }

      // Particles
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.03;
      });

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", setBoard);
    };
  }, [router]);

  return (
    <div
      className="relative flex h-screen w-screen cursor-crosshair items-center justify-center overflow-hidden bg-black"
      onClick={() => window.__throwDart?.()}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Logo */}
      <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <img src="/odc-logo.png" alt="ODC" className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.4)]" />
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F8EBC6]/50">Online Darts Circuit</p>
      </div>

      {/* Hint */}
      <div
        className={`pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 text-center transition-opacity duration-700 ${hint && !thrown ? "opacity-100" : "opacity-0"}`}
      >
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E51D2A]">Click to throw</p>
        <p className="mt-1 text-xs text-[#F8EBC6]/40">Enter the ODC</p>
      </div>
    </div>
  );
}
