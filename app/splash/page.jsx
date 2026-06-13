"use client";

import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const canvasRef = useRef(null);
  const [hint, setHint] = useState(true);
  const [thrown, setThrown] = useState(false);

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

    const SEGMENTS = 20;
    const SEG_ORDER = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

    const drawBoard = (cx, cy, r) => {
      const startAngle = -Math.PI / 2 - Math.PI / SEGMENTS;

      // Outer wood ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = "#2a1a0a";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();

      for (let i = 0; i < SEGMENTS; i++) {
        const a1 = startAngle + (i / SEGMENTS) * Math.PI * 2;
        const a2 = startAngle + ((i + 1) / SEGMENTS) * Math.PI * 2;
        const isEven = i % 2 === 0;

        // Main segment (black/cream)
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r * 0.82, a1, a2);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1a1a1a" : "#f5e6c8";
        ctx.fill();

        // Treble ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.62, a1, a2);
        ctx.arc(cx, cy, r * 0.56, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#E51D2A" : "#1a7a3a";
        ctx.fill();

        // Double ring (outer)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, a1, a2);
        ctx.arc(cx, cy, r * 0.75, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#E51D2A" : "#1a7a3a";
        ctx.fill();

        // Wire lines
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * r * 0.07, cy + Math.sin(a1) * r * 0.07);
        ctx.lineTo(cx + Math.cos(a1) * r * 0.82, cy + Math.sin(a1) * r * 0.82);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Numbers
        const numAngle = startAngle + ((i + 0.5) / SEGMENTS) * Math.PI * 2;
        const numR = r * 0.92;
        ctx.fillStyle = "#F8EBC6";
        ctx.font = `bold ${Math.round(r * 0.09)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          SEG_ORDER[i],
          cx + Math.cos(numAngle) * numR,
          cy + Math.sin(numAngle) * numR
        );
      }

      // Ring borders
      [r * 0.82, r * 0.75, r * 0.62, r * 0.56].forEach((radius) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 25 ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = "#1a7a3a";
      ctx.fill();
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bull
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.065, 0, Math.PI * 2);
      ctx.fillStyle = "#E51D2A";
      ctx.fill();

      // Outer wire
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 6;

      // Tip
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(10, 0);
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Barrel
      const bgrad = ctx.createLinearGradient(-14, -4, -14, 4);
      bgrad.addColorStop(0, "#e8c84a");
      bgrad.addColorStop(0.5, "#f5d878");
      bgrad.addColorStop(1, "#b89030");
      ctx.beginPath();
      ctx.roundRect(-14, -4, 28, 8, 2);
      ctx.fillStyle = bgrad;
      ctx.fill();

      // Grip rings
      for (let i = -8; i <= 6; i += 4) {
        ctx.beginPath();
        ctx.rect(i, -4, 2, 8);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();
      }

      // Shaft
      ctx.beginPath();
      ctx.rect(-28, -1.5, 14, 3);
      ctx.fillStyle = "#333";
      ctx.fill();

      // Flight
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-42, -14);
      ctx.lineTo(-36, 0);
      ctx.lineTo(-42, 14);
      ctx.closePath();
      ctx.fillStyle = "#E51D2A";
      ctx.strokeStyle = "#c01020";
      ctx.lineWidth = 0.5;
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
    };

    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    let r = Math.min(canvas.width, canvas.height) * 0.3;

    const setBoard = () => {
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      r = Math.min(canvas.width, canvas.height) * 0.3;
      dartFrom.x = cx - r - 160;
      dartFrom.y = cy + 60;
    };

    let dartFrom = { x: cx - r - 160, y: cy + 60 };
    let phase = "idle";
    let flyProgress = 0;
    let flyTo = { x: 0, y: 0 };
    let stuckX = 0, stuckY = 0;

    window.addEventListener("resize", () => { resize(); setBoard(); });

    const burst = (x, y) => {
      for (let i = 0; i < 32; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6",
          size: 2 + Math.random() * 4,
        });
      }
    };

    const throwDart = () => {
      if (phase !== "idle") return;
      setThrown(true);
      phase = "flying";
      flyProgress = 0;
      flyTo = {
        x: cx + (Math.random() - 0.5) * r * 0.15,
        y: cy + (Math.random() - 0.5) * r * 0.15,
      };
    };

    window.__throwDart = throwDart;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
      grad.addColorStop(0, "rgba(229,29,42,0.06)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard(cx, cy, r);

      if (phase === "idle") {
        const wobble = Math.sin(Date.now() / 700) * 5;
        drawDart(dartFrom.x + wobble, dartFrom.y, -0.12);
      }

      if (phase === "flying") {
        flyProgress += 0.04;
        const t = Math.min(flyProgress, 1);
        const px = dartFrom.x + (flyTo.x - dartFrom.x) * t;
        const py = dartFrom.y + (flyTo.y - dartFrom.y) * t - Math.sin(t * Math.PI) * 80;
        const angle = Math.atan2(flyTo.y - dartFrom.y, flyTo.x - dartFrom.x);
        drawDart(px, py, angle);

        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x;
          stuckY = flyTo.y;
          burst(stuckX, stuckY);
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }
      }

      if (phase === "stuck") {
        drawDart(stuckX, stuckY, -0.08);
      }

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
        p.vy += 0.18;
        p.life -= 0.025;
      });

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="relative flex h-screen w-screen cursor-crosshair items-center justify-center overflow-hidden bg-black"
      onClick={() => window.__throwDart?.()}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <img src="/odc-logo.png" alt="ODC" className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.4)]" />
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F8EBC6]/50">Online Darts Circuit</p>
      </div>

      <div className={`pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 text-center transition-opacity duration-700 ${hint && !thrown ? "opacity-100" : "opacity-0"}`}>
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E51D2A]">Click to throw</p>
        <p className="mt-1 text-xs text-[#F8EBC6]/40">Enter the ODC</p>
      </div>
    </div>
  );
}
