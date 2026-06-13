"use client";
import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const canvasRef = useRef(null);
  const [hint, setHint] = useState(true);
  const [thrown, setThrown] = useState(false);

  useEffect(() => {
    setTimeout(() => setHint(false), 3000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    let cx, cy, r;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      r = Math.min(canvas.width, canvas.height) * 0.3;
    };
    resize();
    window.addEventListener("resize", resize);

    const SEG_ORDER = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

    const drawBoard = () => {
      // Outer surround
      const surroundGrad = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.12);
      surroundGrad.addColorStop(0, "#3a1f08");
      surroundGrad.addColorStop(1, "#1a0d03");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
      ctx.fillStyle = surroundGrad;
      ctx.fill();

      // Metal outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.01, 0, Math.PI * 2);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 3;
      ctx.stroke();

      const startAngle = -Math.PI / 2 - Math.PI / 20;

      for (let i = 0; i < 20; i++) {
        const a1 = startAngle + (i / 20) * Math.PI * 2;
        const a2 = startAngle + ((i + 1) / 20) * Math.PI * 2;
        const isEven = i % 2 === 0;

        // Main sisal segment
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r * 0.74, a1, a2);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1a1a18" : "#e8dfc0";
        ctx.fill();

        // Treble ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.595, a1, a2);
        ctx.arc(cx, cy, r * 0.535, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#cc1a22" : "#1a7a3a";
        ctx.fill();

        // Inner sisal
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * r * 0.535, cy + Math.sin(a1) * r * 0.535);
        ctx.arc(cx, cy, r * 0.535, a1, a2);
        ctx.arc(cx, cy, r * 0.155, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1a1a18" : "#e8dfc0";
        ctx.fill();

        // Double ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.99, a1, a2);
        ctx.arc(cx, cy, r * 0.92, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#cc1a22" : "#1a7a3a";
        ctx.fill();

        // Outer sisal band
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.92, a1, a2);
        ctx.arc(cx, cy, r * 0.74, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1a1a18" : "#e8dfc0";
        ctx.fill();

        // Wire lines
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * r * 0.155, cy + Math.sin(a1) * r * 0.155);
        ctx.lineTo(cx + Math.cos(a1) * r * 0.99, cy + Math.sin(a1) * r * 0.99);
        ctx.strokeStyle = "rgba(180,180,180,0.6)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Numbers
        const na = startAngle + ((i + 0.5) / 20) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx + Math.cos(na) * r * 1.065, cy + Math.sin(na) * r * 1.065);
        ctx.fillStyle = "#F8EBC6";
        ctx.font = `bold ${Math.round(r * 0.1)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(SEG_ORDER[i], 0, 0);
        ctx.restore();
      }

      // Ring wires
      [r*0.99, r*0.92, r*0.74, r*0.595, r*0.535, r*0.155].forEach(radius => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,200,200,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // 25 bull outer
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.155, 0, Math.PI * 2);
      ctx.fillStyle = "#1a7a3a";
      ctx.fill();
      ctx.strokeStyle = "rgba(200,200,200,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bullseye
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = "#cc1a22";
      ctx.fill();

      // Bull shine
      ctx.beginPath();
      ctx.arc(cx - r*0.02, cy - r*0.02, r * 0.025, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
    };

    const drawDart = (x, y, angle, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Point
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(10, -1);
      ctx.lineTo(10, 1);
      ctx.closePath();
      ctx.fillStyle = "#bbb";
      ctx.fill();

      // Barrel with gradient
      const bg = ctx.createLinearGradient(-12, -5, -12, 5);
      bg.addColorStop(0, "#f0d060");
      bg.addColorStop(0.3, "#fce88a");
      bg.addColorStop(0.7, "#d4a820");
      bg.addColorStop(1, "#8a6010");
      ctx.beginPath();
      ctx.roundRect(-12, -5, 28, 10, 3);
      ctx.fillStyle = bg;
      ctx.shadowBlur = 0;
      ctx.fill();

      // Knurling
      for (let k = -8; k <= 10; k += 3.5) {
        ctx.beginPath();
        ctx.moveTo(k, -5);
        ctx.lineTo(k + 1.5, -5);
        ctx.lineTo(k + 1.5, 5);
        ctx.lineTo(k, 5);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fill();
      }

      // Shaft
      ctx.beginPath();
      ctx.rect(-30, -2, 18, 4);
      ctx.fillStyle = "#222";
      ctx.fill();

      // Flight
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.bezierCurveTo(-34, -2, -44, -14, -46, -16);
      ctx.lineTo(-38, 0);
      ctx.bezierCurveTo(-44, 14, -34, 2, -30, 0);
      ctx.closePath();
      ctx.fillStyle = "#E51D2A";
      ctx.strokeStyle = "#a01018";
      ctx.lineWidth = 0.5;
      ctx.fill();
      ctx.stroke();

      // Flight shine
      ctx.beginPath();
      ctx.moveTo(-31, -1);
      ctx.bezierCurveTo(-34, -2, -40, -8, -42, -10);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    let phase = "idle";
    let flyProgress = 0;
    let flyFrom = { x: 0, y: 0 };
    let flyTo = { x: 0, y: 0 };
    let clickTarget = { x: 0, y: 0 };
    let stuckX = 0, stuckY = 0;

    const getIdlePos = () => ({ x: cx - r - 140, y: cy + 50 });

    const throwDart = (tx, ty) => {
      if (phase !== "idle") return;
      setThrown(true);
      phase = "flying";
      flyProgress = 0;
      const idle = getIdlePos();
      flyFrom = { x: idle.x, y: idle.y };
      // Aim exactly where clicked, clamped inside board
      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = r * 0.9;
      if (dist > maxDist) {
        flyTo = { x: cx + (dx/dist)*maxDist, y: cy + (dy/dist)*maxDist };
      } else {
        flyTo = { x: tx, y: ty };
      }
    };

    window.__throwDart = throwDart;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ambient glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
      glow.addColorStop(0, "rgba(229,29,42,0.05)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard();

      if (phase === "idle") {
        const idle = getIdlePos();
        const wobble = Math.sin(Date.now() / 700) * 5;
        drawDart(idle.x + wobble, idle.y, -0.1);
      }

      if (phase === "flying") {
        flyProgress += 0.038;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * ease;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * ease - Math.sin(t * Math.PI) * 70;
        const angle = Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x);
        drawDart(px, py, angle);

        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x;
          stuckY = flyTo.y;
          // Particle burst
          for (let i = 0; i < 32; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 2 + Math.random() * 6;
            particles.push({ x: stuckX, y: stuckY, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6", size: 2 + Math.random() * 4 });
          }
          setTimeout(() => { window.location.replace("/?from=splash"); }, 1100);
        }
      }

      if (phase === "stuck") {
        drawDart(stuckX, stuckY, -0.08);
      }

      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.025;
      });

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  const handleClick = (e) => {
    window.__throwDart?.(e.clientX, e.clientY);
  };

  return (
    <div className="relative flex h-screen w-screen cursor-crosshair items-center justify-center overflow-hidden bg-black" onClick={handleClick}>
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
