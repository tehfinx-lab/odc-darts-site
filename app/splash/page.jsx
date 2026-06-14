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
    let animId, particles = [], time = 0;
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

    const SEG = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

    const drawBoard = () => {
      const SA = -Math.PI / 2 - Math.PI / 20;

      // Background glow
      const bgGlow = ctx.createRadialGradient(cx, cy, r*0.4, cx, cy, r*2.2);
      bgGlow.addColorStop(0, "rgba(35,12,4,0.5)");
      bgGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood surround — dark walnut like Winmau
      for (let i = 7; i >= 0; i--) {
        const wg = ctx.createRadialGradient(
          cx - r*0.12, cy - r*0.12, r*0.5,
          cx, cy, r * 1.22
        );
        wg.addColorStop(0, `hsl(22,${52-i*2}%,${22-i*1.5}%)`);
        wg.addColorStop(0.5, `hsl(19,48%,${13-i}%)`);
        wg.addColorStop(1, `hsl(17,42%,${6}%)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.22 - i * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = wg;
        ctx.fill();
      }

      // Wood grain
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 1.01, cy + Math.sin(a) * r * 1.01);
        ctx.lineTo(cx + Math.cos(a) * r * 1.22, cy + Math.sin(a) * r * 1.22);
        ctx.strokeStyle = `rgba(0,0,0,${0.1 + (i%3)*0.05})`;
        ctx.lineWidth = 2 + (i % 4);
        ctx.stroke();
      }
      ctx.restore();

      // Winmau text
      ctx.save();
      ctx.font = `900 ${Math.round(r*0.052)}px Arial Black`;
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.textAlign = "center";
      ctx.fillText("WINMAU", cx, cy - r * 1.09);
      ctx.font = `bold ${Math.round(r*0.036)}px Arial`;
      ctx.fillText("BLADE 6", cx, cy - r * 1.058);
      ctx.restore();

      // Outer metal band
      const mg = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
      mg.addColorStop(0, "#555");
      mg.addColorStop(0.2, "#ccc");
      mg.addColorStop(0.45, "#eee");
      mg.addColorStop(0.6, "#aaa");
      mg.addColorStop(0.8, "#777");
      mg.addColorStop(1, "#444");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.008, 0, Math.PI * 2);
      ctx.strokeStyle = mg;
      ctx.lineWidth = r * 0.02;
      ctx.stroke();

      // Segment fills — Winmau colours: deep red + dark green on cream/black sisal
      const zones = [
        [0.994, 0.916, "#b81018", "#186828"],  // double ring
        [0.916, 0.755, "#1a1916", "#e0ceaa"],  // outer sisal
        [0.755, 0.608, "#b81018", "#186828"],  // treble ring
        [0.608, 0.548, "#1a1916", "#e0ceaa"],  // inner sisal narrow
        [0.548, 0.155, "#1a1916", "#e0ceaa"],  // inner sisal wide
      ];

      zones.forEach(([outer, inner, ec, oc]) => {
        for (let i = 0; i < 20; i++) {
          const a1 = SA + (i / 20) * Math.PI * 2;
          const a2 = SA + ((i + 1) / 20) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r * outer, a1, a2);
          ctx.arc(cx, cy, r * inner, a2, a1, true);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? ec : oc;
          ctx.fill();
        }
      });

      // Sisal fibre texture
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.994, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 600; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * r * 0.994;
        const fx = cx + Math.cos(a) * d;
        const fy = cy + Math.sin(a) * d;
        const fa = Math.random() * Math.PI;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(fa) * 2.5, fy + Math.sin(fa) * 2.5);
        ctx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random()*0.07})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.restore();

      // Spider wires
      const wc = "rgba(185,185,185,0.92)";
      const ww = Math.max(1.2, r * 0.0048);

      // Ring wires
      [0.994, 0.916, 0.755, 0.608, 0.548, 0.155].forEach(rad => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, 0, Math.PI * 2);
        ctx.strokeStyle = wc;
        ctx.lineWidth = ww;
        ctx.stroke();
        // Wire specular highlight
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, Math.PI * 1.05, Math.PI * 1.95);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = ww * 0.35;
        ctx.stroke();
      });

      // Segment divider wires
      for (let i = 0; i < 20; i++) {
        const a = SA + (i / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.155, cy + Math.sin(a) * r * 0.155);
        ctx.lineTo(cx + Math.cos(a) * r * 0.994, cy + Math.sin(a) * r * 0.994);
        ctx.strokeStyle = wc;
        ctx.lineWidth = ww;
        ctx.stroke();
      }

      // Numbers — black ring behind each number like real Winmau
      for (let i = 0; i < 20; i++) {
        const na = SA + ((i + 0.5) / 20) * Math.PI * 2;
        const nx = cx + Math.cos(na) * r * 1.073;
        const ny = cy + Math.sin(na) * r * 1.073;
        const fontSize = Math.round(r * 0.108);
        ctx.save();
        ctx.translate(nx, ny);
        // Number background circle (like the Winmau number ring)
        ctx.beginPath();
        ctx.arc(0, 0, fontSize * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fill();
        ctx.font = `900 ${fontSize}px Arial Black, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(SEG[i], 0, 0);
        ctx.restore();
      }

      // Bull outer green (25)
      const b25g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.155);
      b25g.addColorStop(0, "#20a848");
      b25g.addColorStop(0.65, "#186828");
      b25g.addColorStop(1, "#0c4018");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.155, 0, Math.PI * 2);
      ctx.fillStyle = b25g;
      ctx.fill();
      ctx.strokeStyle = wc;
      ctx.lineWidth = ww;
      ctx.stroke();

      // Bullseye red
      const bullG = ctx.createRadialGradient(cx - r*0.018, cy - r*0.022, 0, cx, cy, r * 0.075);
      bullG.addColorStop(0, "#ff3838");
      bullG.addColorStop(0.45, "#cc1818");
      bullG.addColorStop(1, "#6a0808");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = bullG;
      ctx.fill();
      ctx.strokeStyle = wc;
      ctx.lineWidth = ww;
      ctx.stroke();

      // Bull specular dot
      ctx.beginPath();
      ctx.arc(cx - r*0.02, cy - r*0.025, r * 0.028, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      // Board lighting sheen (light from top-left)
      const sheen = ctx.createRadialGradient(cx - r*0.3, cy - r*0.35, 0, cx + r*0.1, cy + r*0.1, r * 1.1);
      sheen.addColorStop(0, "rgba(255,255,255,0.07)");
      sheen.addColorStop(0.3, "rgba(255,255,255,0.02)");
      sheen.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.994, 0, Math.PI * 2);
      ctx.fillStyle = sheen;
      ctx.fill();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      // ── Steel tip (needle point) ─────────────────
      const tg = ctx.createLinearGradient(10, -1.8, 10, 1.8);
      tg.addColorStop(0, "#b8b8b8");
      tg.addColorStop(0.35, "#ffffff");
      tg.addColorStop(0.7, "#909090");
      tg.addColorStop(1, "#585858");
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(11, -1.8);
      ctx.lineTo(11, 1.8);
      ctx.closePath();
      ctx.fillStyle = tg;
      ctx.fill();

      // Tip point rings
      for (let p = 0; p < 4; p++) {
        const pg = ctx.createLinearGradient(12+p*5, -2, 12+p*5, 2);
        pg.addColorStop(0, "#c0c0c0");
        pg.addColorStop(0.5, "#ffffff");
        pg.addColorStop(1, "#888");
        ctx.beginPath();
        ctx.arc(13 + p * 5.5, 0, 1.9 - p * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // ── Tungsten barrel ──────────────────────────
      // Front taper
      const ftg = ctx.createLinearGradient(-4, -5, -4, 5);
      ftg.addColorStop(0, "#505050");
      ftg.addColorStop(0.4, "#909090");
      ftg.addColorStop(0.6, "#b0b0b0");
      ftg.addColorStop(1, "#404040");
      ctx.beginPath();
      ctx.moveTo(11, -2.5);
      ctx.lineTo(-2, -6.5);
      ctx.lineTo(-2, 6.5);
      ctx.lineTo(11, 2.5);
      ctx.closePath();
      ctx.fillStyle = ftg;
      ctx.fill();

      // Main barrel body — dark tungsten/nickel
      const bg = ctx.createLinearGradient(-20, -8.5, -20, 8.5);
      bg.addColorStop(0, "#2a2a2a");
      bg.addColorStop(0.08, "#707070");
      bg.addColorStop(0.22, "#c0c0c0");
      bg.addColorStop(0.38, "#e8e8e8");
      bg.addColorStop(0.5, "#d0d0d0");
      bg.addColorStop(0.65, "#909090");
      bg.addColorStop(0.82, "#505050");
      bg.addColorStop(1, "#202020");
      ctx.beginPath();
      ctx.roundRect(-20, -8.5, 30, 17, 3);
      ctx.fillStyle = bg;
      ctx.fill();

      // Deep knurling grooves — tungsten texture
      for (let k = -17; k <= 8; k += 2.1) {
        const kg = ctx.createLinearGradient(k, -8.5, k + 1, -8.5);
        kg.addColorStop(0, "rgba(0,0,0,0.45)");
        kg.addColorStop(0.4, "rgba(0,0,0,0.15)");
        kg.addColorStop(0.6, "rgba(255,255,255,0.08)");
        kg.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.beginPath();
        ctx.rect(k, -8.5, 1.1, 17);
        ctx.fillStyle = kg;
        ctx.fill();
      }

      // Barrel highlight strip
      ctx.beginPath();
      ctx.roundRect(-20, -8.5, 30, 5, [3, 3, 0, 0]);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fill();

      // Rear taper
      const rtg = ctx.createLinearGradient(-22, -5, -22, 5);
      rtg.addColorStop(0, "#303030");
      rtg.addColorStop(0.4, "#686868");
      rtg.addColorStop(0.6, "#888");
      rtg.addColorStop(1, "#282828");
      ctx.beginPath();
      ctx.moveTo(-20, -6.5);
      ctx.lineTo(-28, -3.5);
      ctx.lineTo(-28, 3.5);
      ctx.lineTo(-20, 6.5);
      ctx.closePath();
      ctx.fillStyle = rtg;
      ctx.fill();

      // ── Carbon shaft ─────────────────────────────
      const sg = ctx.createLinearGradient(-50, -3.5, -50, 3.5);
      sg.addColorStop(0, "#1a1a1a");
      sg.addColorStop(0.3, "#3a3a3a");
      sg.addColorStop(0.55, "#555");
      sg.addColorStop(0.75, "#3a3a3a");
      sg.addColorStop(1, "#111");
      ctx.beginPath();
      ctx.rect(-46, -3.5, 18, 7);
      ctx.fillStyle = sg;
      ctx.fill();

      // Carbon weave highlight
      ctx.beginPath();
      ctx.rect(-46, -3.5, 18, 2);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fill();

      // Shaft collar ring
      const collarG = ctx.createLinearGradient(-28, -4, -28, 4);
      collarG.addColorStop(0, "#888");
      collarG.addColorStop(0.5, "#ddd");
      collarG.addColorStop(1, "#666");
      ctx.beginPath();
      ctx.rect(-30, -4, 4, 8);
      ctx.fillStyle = collarG;
      ctx.fill();

      // ── Red flights (wing shaped) ─────────────────
      const flightRed = "#c01520";
      const flightDark = "#7a0810";
      const flightShine = "rgba(255,180,180,0.35)";

      // Top flight
      ctx.beginPath();
      ctx.moveTo(-46, -2);
      ctx.bezierCurveTo(-50, -5, -60, -18, -66, -26);
      ctx.bezierCurveTo(-64, -23, -56, -13, -50, -7);
      ctx.bezierCurveTo(-48, -5, -46, -3, -46, -2);
      ctx.closePath();
      ctx.fillStyle = flightRed;
      ctx.fill();
      ctx.strokeStyle = flightDark;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Bottom flight
      ctx.beginPath();
      ctx.moveTo(-46, 2);
      ctx.bezierCurveTo(-50, 5, -60, 18, -66, 26);
      ctx.bezierCurveTo(-64, 23, -56, 13, -50, 7);
      ctx.bezierCurveTo(-48, 5, -46, 3, -46, 2);
      ctx.closePath();
      ctx.fillStyle = flightRed;
      ctx.fill();
      ctx.strokeStyle = flightDark;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Flight spine line
      ctx.beginPath();
      ctx.moveTo(-46, 0);
      ctx.lineTo(-66, 0);
      ctx.strokeStyle = "rgba(80,0,0,0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Flight shine
      ctx.beginPath();
      ctx.moveTo(-47, -3);
      ctx.bezierCurveTo(-51, -7, -58, -15, -61, -20);
      ctx.strokeStyle = flightShine;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-47, 3);
      ctx.bezierCurveTo(-51, 7, -58, 15, -61, 20);
      ctx.strokeStyle = flightShine;
      ctx.lineWidth = 1.4;
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
      flyFrom = { x: cx - r - 190, y: cy + 65 };
      const dx = tx - cx, dy = ty - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const max = r * 0.91;
      flyTo = dist > max
        ? { x: cx + (dx/dist)*max, y: cy + (dy/dist)*max }
        : { x: tx, y: ty };
    };

    window.__throwDart = throwDart;

    const loop = () => {
      animId = requestAnimationFrame(loop);
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep cinematic background
      ctx.fillStyle = "#040201";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard();

      // Vignette
      const vig = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.5);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.8)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (phase === "idle") {
        const wb = Math.sin(time * 0.85) * 5;
        const wby = Math.sin(time * 1.1) * 2.5;
        drawDart(cx - r - 190 + wb, cy + 65 + wby, -0.07);
      }

      if (phase === "flying") {
        flyProgress += 0.033;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * ease;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * ease - Math.sin(t * Math.PI) * 55;
        drawDart(px, py, Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x));
        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x; stuckY = flyTo.y;
          for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1.5 + Math.random() * 5;
            particles.push({
              x: stuckX, y: stuckY,
              vx: Math.cos(a)*s, vy: Math.sin(a)*s,
              life: 1,
              color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6",
              size: 1.5 + Math.random() * 3,
            });
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
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.022;
      });
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
      <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <img src="/odc-logo.png" alt="ODC" className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]" />
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F8EBC6]/50">Online Darts Circuit</p>
      </div>
      <div className={`pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 text-center transition-opacity duration-700 z-10 ${hint && !thrown ? "opacity-100" : "opacity-0"}`}>
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E51D2A]">Click to throw</p>
        <p className="mt-1 text-xs text-[#F8EBC6]/40">Enter the ODC</p>
      </div>
    </div>
  );
}
