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
      // Outer wood surround
      const woodGrad = ctx.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.18);
      woodGrad.addColorStop(0, "#4a2208");
      woodGrad.addColorStop(0.4, "#2e1404");
      woodGrad.addColorStop(1, "#1a0a02");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = woodGrad;
      ctx.fill();

      // Wood grain lines
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.02 + i * 1.2, angle, angle + 0.18);
        ctx.strokeStyle = "rgba(80,35,5,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Metal outer band
      const metalGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      metalGrad.addColorStop(0, "#666");
      metalGrad.addColorStop(0.3, "#ccc");
      metalGrad.addColorStop(0.7, "#aaa");
      metalGrad.addColorStop(1, "#555");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.01, 0, Math.PI * 2);
      ctx.strokeStyle = metalGrad;
      ctx.lineWidth = 4;
      ctx.stroke();

      const startAngle = -Math.PI / 2 - Math.PI / 20;

      // Draw all segments
      for (let i = 0; i < 20; i++) {
        const a1 = startAngle + (i / 20) * Math.PI * 2;
        const a2 = startAngle + ((i + 1) / 20) * Math.PI * 2;
        const isEven = i % 2 === 0;

        // Outer sisal (between double and number)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.915, a1, a2);
        ctx.arc(cx, cy, r * 0.76, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1c1c1a" : "#ede0bc";
        ctx.fill();

        // Double ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.985, a1, a2);
        ctx.arc(cx, cy, r * 0.915, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#c8181f" : "#1a7535";
        ctx.fill();

        // Middle sisal
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.615, a1, a2);
        ctx.arc(cx, cy, r * 0.555, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#c8181f" : "#1a7535";
        ctx.fill();

        // Inner sisal
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.555, a1, a2);
        ctx.arc(cx, cy, r * 0.16, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#1c1c1a" : "#ede0bc";
        ctx.fill();

        // Treble ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.76, a1, a2);
        ctx.arc(cx, cy, r * 0.615, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = isEven ? "#c8181f" : "#1a7535";
        ctx.fill();
      }

      // Wire overlay — all rings
      const wireColor = "rgba(160,160,160,0.75)";
      [r*0.985, r*0.915, r*0.76, r*0.615, r*0.555, r*0.16].forEach(radius => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Wire segment dividers
      for (let i = 0; i < 20; i++) {
        const a = startAngle + (i / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16);
        ctx.lineTo(cx + Math.cos(a) * r * 0.985, cy + Math.sin(a) * r * 0.985);
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Numbers
      for (let i = 0; i < 20; i++) {
        const na = startAngle + ((i + 0.5) / 20) * Math.PI * 2;
        const nx = cx + Math.cos(na) * r * 1.065;
        const ny = cy + Math.sin(na) * r * 1.065;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.fillStyle = "#F8EBC6";
        ctx.font = `900 ${Math.round(r * 0.105)}px Arial Black, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(SEG_ORDER[i], 0, 0);
        ctx.restore();
      }

      // Bull outer (25)
      const bullGrad25 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.16);
      bullGrad25.addColorStop(0, "#1a8a40");
      bullGrad25.addColorStop(1, "#145c2a");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = bullGrad25;
      ctx.fill();
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Bullseye
      const bullGrad = ctx.createRadialGradient(cx - r*0.02, cy - r*0.02, 0, cx, cy, r * 0.075);
      bullGrad.addColorStop(0, "#e82020");
      bullGrad.addColorStop(1, "#9a1010");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = bullGrad;
      ctx.fill();
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bull highlight
      ctx.beginPath();
      ctx.arc(cx - r*0.025, cy - r*0.025, r * 0.028, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();

      // Board lighting — top left sheen
      const sheen = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx, cy, r);
      sheen.addColorStop(0, "rgba(255,255,255,0.04)");
      sheen.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.985, 0, Math.PI * 2);
      ctx.fillStyle = sheen;
      ctx.fill();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Steel tip
      const tipGrad = ctx.createLinearGradient(8, -1.5, 8, 1.5);
      tipGrad.addColorStop(0, "#e0e0e0");
      tipGrad.addColorStop(0.5, "#ffffff");
      tipGrad.addColorStop(1, "#888");
      ctx.beginPath();
      ctx.moveTo(32, 0);
      ctx.lineTo(10, -1.5);
      ctx.lineTo(10, 1.5);
      ctx.closePath();
      ctx.fillStyle = tipGrad;
      ctx.fill();

      // Barrel
      const barrelGrad = ctx.createLinearGradient(-14, -6, -14, 6);
      barrelGrad.addColorStop(0, "#c8a020");
      barrelGrad.addColorStop(0.15, "#f8e060");
      barrelGrad.addColorStop(0.35, "#ffe87a");
      barrelGrad.addColorStop(0.65, "#d4900a");
      barrelGrad.addColorStop(0.85, "#a06808");
      barrelGrad.addColorStop(1, "#c8a020");
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(-14, -6, 26, 12, 3);
      ctx.fillStyle = barrelGrad;
      ctx.fill();

      // Knurling grooves
      for (let k = -11; k <= 9; k += 2.8) {
        ctx.beginPath();
        ctx.rect(k, -6, 1.2, 12);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fill();
      }

      // Barrel highlight
      ctx.beginPath();
      ctx.roundRect(-14, -6, 26, 4, [3, 3, 0, 0]);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();

      // Shaft (carbon look)
      const shaftGrad = ctx.createLinearGradient(-34, -3, -34, 3);
      shaftGrad.addColorStop(0, "#444");
      shaftGrad.addColorStop(0.5, "#888");
      shaftGrad.addColorStop(1, "#333");
      ctx.beginPath();
      ctx.rect(-34, -2.5, 20, 5);
      ctx.fillStyle = shaftGrad;
      ctx.fill();

      // Flight — shaped like real dart flight
      const flightColor = "#E51D2A";
      const flightDark = "#8a0e14";

      // Left flight
      ctx.beginPath();
      ctx.moveTo(-34, -1);
      ctx.bezierCurveTo(-38, -3, -50, -18, -52, -22);
      ctx.bezierCurveTo(-50, -18, -42, -8, -34, -1);
      ctx.closePath();
      ctx.fillStyle = flightColor;
      ctx.fill();
      ctx.strokeStyle = flightDark;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Right flight
      ctx.beginPath();
      ctx.moveTo(-34, 1);
      ctx.bezierCurveTo(-38, 3, -50, 18, -52, 22);
      ctx.bezierCurveTo(-50, 18, -42, 8, -34, 1);
      ctx.closePath();
      ctx.fillStyle = flightColor;
      ctx.fill();
      ctx.strokeStyle = flightDark;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Flight shine
      ctx.beginPath();
      ctx.moveTo(-35, -2);
      ctx.bezierCurveTo(-39, -5, -46, -12, -48, -15);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    let phase = "idle";
    let flyProgress = 0;
    let flyFrom = { x: 0, y: 0 };
    let flyTo = { x: 0, y: 0 };
    let stuckX = 0, stuckY = 0;

    const throwDart = (tx, ty) => {
      if (phase !== "idle") return;
      setThrown(true);
      phase = "flying";
      flyProgress = 0;
      flyFrom = { x: cx - r - 140, y: cy + 50 };
      const dx = tx - cx, dy = ty - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = r * 0.88;
      flyTo = dist > maxDist
        ? { x: cx + (dx / dist) * maxDist, y: cy + (dy / dist) * maxDist }
        : { x: tx, y: ty };
    };

    window.__throwDart = throwDart;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle board glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.6);
      glow.addColorStop(0, "rgba(229,29,42,0.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard();

      if (phase === "idle") {
        const wobble = Math.sin(Date.now() / 800) * 4;
        drawDart(cx - r - 140 + wobble, cy + 50, -0.08);
      }

      if (phase === "flying") {
        flyProgress += 0.036;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * ease;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * ease - Math.sin(t * Math.PI) * 65;
        const angle = Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x);
        drawDart(px, py, angle);

        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x;
          stuckY = flyTo.y;
          for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1.5 + Math.random() * 5;
            particles.push({ x: stuckX, y: stuckY, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6", size: 1.5 + Math.random() * 3 });
          }
          setTimeout(() => { window.location.replace("/?from=splash"); }, 1100);
        }
      }

      if (phase === "stuck") drawDart(stuckX, stuckY, -0.08);

      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.022;
      });

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div
      className="relative flex h-screen w-screen cursor-crosshair items-center justify-center overflow-hidden bg-black"
      onClick={(e) => window.__throwDart?.(e.clientX, e.clientY)}
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
