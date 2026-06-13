"use client";
import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const canvasRef = useRef(null);
  const [hint, setHint] = useState(true);
  const [thrown, setThrown] = useState(false);

  useEffect(() => { setTimeout(() => setHint(false), 3000); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, particles = [];
    let cx, cy, r;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      r = Math.min(canvas.width, canvas.height) * 0.29;
    };
    resize();
    window.addEventListener("resize", resize);

    const SEG = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

    const drawBoard = () => {
      const SA = -Math.PI / 2 - Math.PI / 20;

      // ── Wood surround ──────────────────────────────
      for (let ring = 0; ring < 6; ring++) {
        const rOuter = r * (1.22 - ring * 0.004);
        const rInner = r * (1.185 - ring * 0.004);
        const woodColors = ["#5c2d0a","#3e1c06","#6a3410","#2e1404","#7a3e14","#3a1a05"];
        ctx.beginPath();
        ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
        ctx.fillStyle = woodColors[ring];
        ctx.fill();
      }
      const woodBase = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, r*0.8, cx, cy, r*1.22);
      woodBase.addColorStop(0, "rgba(120,60,10,0.4)");
      woodBase.addColorStop(1, "rgba(10,4,0,0.6)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
      ctx.fillStyle = woodBase;
      ctx.fill();

      // ── Outer metal ring ───────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.005, 0, Math.PI * 2);
      ctx.strokeStyle = "#999";
      ctx.lineWidth = r * 0.018;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.005, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = r * 0.006;
      ctx.stroke();

      // ── Segment fills ──────────────────────────────
      const zones = [
        // [outerR, innerR, evenColor, oddColor]
        [0.998, 0.924, "#c8181f", "#1a7535"],   // double ring
        [0.924, 0.765, "#1c1c1a", "#e8dab8"],   // outer sisal
        [0.765, 0.618, "#c8181f", "#1a7535"],   // treble ring
        [0.618, 0.555, "#1c1c1a", "#e8dab8"],   // inner sisal top
        [0.555, 0.162, "#1c1c1a", "#e8dab8"],   // inner sisal
      ];

      zones.forEach(([outer, inner, evenCol, oddCol]) => {
        for (let i = 0; i < 20; i++) {
          const a1 = SA + (i / 20) * Math.PI * 2;
          const a2 = SA + ((i + 1) / 20) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r * outer, a1, a2);
          ctx.arc(cx, cy, r * inner, a2, a1, true);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? evenCol : oddCol;
          ctx.fill();
        }
      });

      // ── Sisal texture overlay ──────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.998, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 300; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(x, y, 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fill();
      }
      ctx.restore();

      // ── Wires ──────────────────────────────────────
      const wire = "rgba(200,200,200,0.85)";
      const wireW = r * 0.005;

      // Ring wires
      [0.998, 0.924, 0.765, 0.618, 0.555, 0.162].forEach(rad => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, 0, Math.PI * 2);
        ctx.strokeStyle = wire;
        ctx.lineWidth = wireW;
        ctx.stroke();
        // wire highlight
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = wireW * 0.5;
        ctx.stroke();
      });

      // Divider wires
      for (let i = 0; i < 20; i++) {
        const a = SA + (i / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.162, cy + Math.sin(a) * r * 0.162);
        ctx.lineTo(cx + Math.cos(a) * r * 0.998, cy + Math.sin(a) * r * 0.998);
        ctx.strokeStyle = wire;
        ctx.lineWidth = wireW;
        ctx.stroke();
      }

      // ── Numbers ────────────────────────────────────
      for (let i = 0; i < 20; i++) {
        const na = SA + ((i + 0.5) / 20) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx + Math.cos(na) * r * 1.072, cy + Math.sin(na) * r * 1.072);
        ctx.fillStyle = "#fff";
        ctx.font = `900 ${Math.round(r * 0.108)}px Arial Black, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 5;
        ctx.fillText(SEG[i], 0, 0);
        ctx.restore();
      }

      // ── Bull outer (25) ────────────────────────────
      const b25 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.162);
      b25.addColorStop(0, "#22a050");
      b25.addColorStop(0.7, "#1a7535");
      b25.addColorStop(1, "#0e4a20");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.162, 0, Math.PI * 2);
      ctx.fillStyle = b25;
      ctx.fill();
      ctx.strokeStyle = wire;
      ctx.lineWidth = wireW;
      ctx.stroke();

      // ── Bullseye ───────────────────────────────────
      const bull = ctx.createRadialGradient(cx - r*0.02, cy - r*0.02, 0, cx, cy, r * 0.078);
      bull.addColorStop(0, "#ff3030");
      bull.addColorStop(0.5, "#cc1818");
      bull.addColorStop(1, "#7a0808");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.078, 0, Math.PI * 2);
      ctx.fillStyle = bull;
      ctx.fill();
      ctx.strokeStyle = wire;
      ctx.lineWidth = wireW;
      ctx.stroke();

      // Bull highlight
      ctx.beginPath();
      ctx.arc(cx - r*0.02, cy - r*0.025, r * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();

      // ── Board lighting sheen ───────────────────────
      const sheen = ctx.createRadialGradient(cx - r*0.25, cy - r*0.35, 0, cx, cy, r);
      sheen.addColorStop(0, "rgba(255,255,255,0.055)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.01)");
      sheen.addColorStop(1, "rgba(0,0,0,0.15)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.998, 0, Math.PI * 2);
      ctx.fillStyle = sheen;
      ctx.fill();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Drop shadow
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      // ── Steel point ────────────────────────────────
      const ptG = ctx.createLinearGradient(10, -1.5, 10, 1.5);
      ptG.addColorStop(0, "#d0d0d0");
      ptG.addColorStop(0.4, "#ffffff");
      ptG.addColorStop(1, "#707070");
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.lineTo(11, -1.8);
      ctx.lineTo(11, 1.8);
      ctx.closePath();
      ctx.fillStyle = ptG;
      ctx.fill();

      // Point ridges
      for (let pr = 0; pr < 4; pr++) {
        ctx.beginPath();
        ctx.arc(11 + pr * 6, 0, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,180,180,${0.3 - pr * 0.06})`;
        ctx.fill();
      }

      // ── Barrel ─────────────────────────────────────
      ctx.shadowBlur = 0;
      const bG = ctx.createLinearGradient(-16, -7, -16, 7);
      bG.addColorStop(0, "#9a7010");
      bG.addColorStop(0.12, "#f0d458");
      bG.addColorStop(0.28, "#ffe878");
      bG.addColorStop(0.5, "#ffd040");
      bG.addColorStop(0.72, "#c88a18");
      bG.addColorStop(0.88, "#a06010");
      bG.addColorStop(1, "#6a3c08");
      ctx.beginPath();
      ctx.roundRect(-16, -7, 30, 14, 4);
      ctx.fillStyle = bG;
      ctx.fill();

      // Knurling
      for (let k = -13; k <= 11; k += 2.2) {
        const kg = ctx.createLinearGradient(k, -7, k + 1, -7);
        kg.addColorStop(0, "rgba(0,0,0,0.28)");
        kg.addColorStop(0.5, "rgba(0,0,0,0.08)");
        kg.addColorStop(1, "rgba(0,0,0,0.28)");
        ctx.beginPath();
        ctx.rect(k, -7, 1.1, 14);
        ctx.fillStyle = kg;
        ctx.fill();
      }

      // Barrel top highlight
      ctx.beginPath();
      ctx.roundRect(-16, -7, 30, 5, [4, 4, 0, 0]);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      // ── Shaft ──────────────────────────────────────
      const shG = ctx.createLinearGradient(-42, -3, -42, 3);
      shG.addColorStop(0, "#555");
      shG.addColorStop(0.4, "#999");
      shG.addColorStop(0.6, "#bbb");
      shG.addColorStop(1, "#444");
      ctx.beginPath();
      ctx.rect(-40, -3, 24, 6);
      ctx.fillStyle = shG;
      ctx.fill();

      // Shaft highlight
      ctx.beginPath();
      ctx.rect(-40, -3, 24, 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      // ── Flights ────────────────────────────────────
      // Top flight
      ctx.beginPath();
      ctx.moveTo(-40, -2);
      ctx.bezierCurveTo(-44, -5, -56, -22, -60, -28);
      ctx.bezierCurveTo(-57, -24, -48, -12, -40, -2);
      ctx.closePath();
      const fG1 = ctx.createLinearGradient(-40, -2, -60, -28);
      fG1.addColorStop(0, "#cc1010");
      fG1.addColorStop(0.5, "#e51d2a");
      fG1.addColorStop(1, "#ff4444");
      ctx.fillStyle = fG1;
      ctx.fill();
      ctx.strokeStyle = "#8a0808";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Bottom flight
      ctx.beginPath();
      ctx.moveTo(-40, 2);
      ctx.bezierCurveTo(-44, 5, -56, 22, -60, 28);
      ctx.bezierCurveTo(-57, 24, -48, 12, -40, 2);
      ctx.closePath();
      ctx.fillStyle = fG1;
      ctx.fill();
      ctx.strokeStyle = "#8a0808";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Flight highlight
      ctx.beginPath();
      ctx.moveTo(-41, -3);
      ctx.bezierCurveTo(-45, -7, -53, -17, -56, -22);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-41, 3);
      ctx.bezierCurveTo(-45, 7, -53, 17, -56, 22);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
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
      flyFrom = { x: cx - r - 160, y: cy + 55 };
      const dx = tx - cx, dy = ty - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = r * 0.92;
      flyTo = dist > maxDist
        ? { x: cx + (dx / dist) * maxDist, y: cy + (dy / dist) * maxDist }
        : { x: tx, y: ty };
    };

    window.__throwDart = throwDart;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Room ambient light effect
      const ambient = ctx.createRadialGradient(cx, cy - r * 0.5, 0, cx, cy, r * 2.2);
      ambient.addColorStop(0, "rgba(40,20,10,0.3)");
      ambient.addColorStop(0.4, "rgba(10,5,2,0.5)");
      ambient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard();

      if (phase === "idle") {
        const wb = Math.sin(Date.now() / 900) * 4;
        drawDart(cx - r - 160 + wb, cy + 55, -0.07);
      }

      if (phase === "flying") {
        flyProgress += 0.034;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * ease;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * ease - Math.sin(t * Math.PI) * 60;
        drawDart(px, py, Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x));
        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x; stuckY = flyTo.y;
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 5.5;
            particles.push({ x: stuckX, y: stuckY, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6", size: 1.5 + Math.random() * 3.5 });
          }
          setTimeout(() => { window.location.replace("/?from=splash"); }, 1100);
        }
      }

      if (phase === "stuck") drawDart(stuckX, stuckY, -0.07);

      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
        p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life -= 0.022;
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
