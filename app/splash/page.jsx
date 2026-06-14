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
      r = Math.min(canvas.width, canvas.height) * 0.3;
    };
    resize();
    window.addEventListener("resize", resize);

    const SEG = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

    const drawBoard = () => {
      const SA = -Math.PI / 2 - Math.PI / 20;

      // Outer glow behind board
      const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.6);
      outerGlow.addColorStop(0, "rgba(229,29,42,0.12)");
      outerGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Wood surround — layered rings for depth
      for (let i = 5; i >= 0; i--) {
        const woodR = r * (1.18 + i * 0.005);
        const wg = ctx.createRadialGradient(cx - woodR*0.2, cy - woodR*0.2, woodR*0.3, cx, cy, woodR);
        wg.addColorStop(0, `hsl(${22 + i*2},${65-i*3}%,${18+i*2}%)`);
        wg.addColorStop(1, `hsl(${18},60%,${8+i}%)`);
        ctx.beginPath();
        ctx.arc(cx, cy, woodR, 0, Math.PI * 2);
        ctx.fillStyle = wg;
        ctx.fill();
      }

      // Wood grain
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.19, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r * 1.2, a, a + 0.06);
        ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random()*0.06})`;
        ctx.lineWidth = 3 + Math.random() * 4;
        ctx.stroke();
      }
      ctx.restore();

      // Metal outer band with gradient
      const mg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      mg.addColorStop(0, "#888");
      mg.addColorStop(0.25, "#ddd");
      mg.addColorStop(0.5, "#aaa");
      mg.addColorStop(0.75, "#666");
      mg.addColorStop(1, "#999");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.015, 0, Math.PI * 2);
      ctx.strokeStyle = mg;
      ctx.lineWidth = r * 0.022;
      ctx.stroke();

      // Segments
      const zones = [
        [0.995, 0.918, "#c41520", "#197030"],
        [0.918, 0.758, "#1a1a17", "#e8d9b4"],
        [0.758, 0.612, "#c41520", "#197030"],
        [0.612, 0.552, "#1a1a17", "#e8d9b4"],
        [0.552, 0.158, "#1a1a17", "#e8d9b4"],
      ];

      zones.forEach(([outer, inner, ec, oc]) => {
        for (let i = 0; i < 20; i++) {
          const a1 = SA + (i / 20) * Math.PI * 2;
          const a2 = SA + ((i + 1) / 20) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r * outer, a1, a2);
          ctx.arc(cx, cy, r * inner, a2, a1, true);
          ctx.closePath();

          // Add subtle gradient to each segment for depth
          const midA = (a1 + a2) / 2;
          const midR = (outer + inner) / 2 * r;
          const sx = cx + Math.cos(midA) * midR * 0.7;
          const sy = cy + Math.sin(midA) * midR * 0.7;
          const seg_g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * (outer - inner) * 1.5);
          const base = i % 2 === 0 ? ec : oc;
          seg_g.addColorStop(0, base + "ff");
          seg_g.addColorStop(1, base + "cc");
          ctx.fillStyle = i % 2 === 0 ? ec : oc;
          ctx.fill();
        }
      });

      // Sisal texture dots
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.995, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 500; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r * 0.995;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a)*d, cy + Math.sin(a)*d, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random()*0.05})`;
        ctx.fill();
      }
      ctx.restore();

      // Wires
      const wc = "rgba(190,190,190,0.9)";
      const ww = Math.max(1, r * 0.005);
      [0.995, 0.918, 0.758, 0.612, 0.552, 0.158].forEach(rad => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, 0, Math.PI * 2);
        ctx.strokeStyle = wc;
        ctx.lineWidth = ww;
        ctx.stroke();
        // Wire highlight top
        ctx.beginPath();
        ctx.arc(cx, cy, r * rad, Math.PI * 1.1, Math.PI * 1.9);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = ww * 0.4;
        ctx.stroke();
      });

      for (let i = 0; i < 20; i++) {
        const a = SA + (i / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.158, cy + Math.sin(a) * r * 0.158);
        ctx.lineTo(cx + Math.cos(a) * r * 0.995, cy + Math.sin(a) * r * 0.995);
        ctx.strokeStyle = wc;
        ctx.lineWidth = ww;
        ctx.stroke();
      }

      // Numbers
      for (let i = 0; i < 20; i++) {
        const na = SA + ((i + 0.5) / 20) * Math.PI * 2;
        const nx = cx + Math.cos(na) * r * 1.072;
        const ny = cy + Math.sin(na) * r * 1.072;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.font = `900 ${Math.round(r * 0.108)}px Arial Black, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(SEG[i], 0, 0);
        ctx.restore();
      }

      // Bull 25
      const b25g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.158);
      b25g.addColorStop(0, "#22a050");
      b25g.addColorStop(0.6, "#197030");
      b25g.addColorStop(1, "#0d4820");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.158, 0, Math.PI * 2);
      ctx.fillStyle = b25g;
      ctx.fill();
      ctx.strokeStyle = wc;
      ctx.lineWidth = ww;
      ctx.stroke();

      // Bullseye
      const bg = ctx.createRadialGradient(cx - r*0.02, cy - r*0.025, 0, cx, cy, r * 0.078);
      bg.addColorStop(0, "#ff3535");
      bg.addColorStop(0.5, "#cc1818");
      bg.addColorStop(1, "#700808");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.078, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = wc;
      ctx.lineWidth = ww;
      ctx.stroke();

      // Bull specular
      ctx.beginPath();
      ctx.arc(cx - r*0.022, cy - r*0.028, r * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      // Board lighting sheen
      const sheen = ctx.createRadialGradient(cx - r*0.28, cy - r*0.32, 0, cx, cy, r);
      sheen.addColorStop(0, "rgba(255,255,255,0.065)");
      sheen.addColorStop(0.4, "rgba(255,255,255,0.015)");
      sheen.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.995, 0, Math.PI * 2);
      ctx.fillStyle = sheen;
      ctx.fill();
    };

    const drawDart = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      // Steel tip
      const tg = ctx.createLinearGradient(12, -2, 12, 2);
      tg.addColorStop(0, "#c8c8c8");
      tg.addColorStop(0.4, "#ffffff");
      tg.addColorStop(1, "#686868");
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.lineTo(12, -2);
      ctx.lineTo(12, 2);
      ctx.closePath();
      ctx.fillStyle = tg;
      ctx.fill();

      // Tip rings
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.arc(13 + p * 5, 0, 2 - p * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,160,160,${0.35 - p*0.05})`;
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Barrel
      const bg2 = ctx.createLinearGradient(-18, -8, -18, 8);
      bg2.addColorStop(0, "#7a5008");
      bg2.addColorStop(0.08, "#e8c030");
      bg2.addColorStop(0.22, "#ffe060");
      bg2.addColorStop(0.38, "#ffd040");
      bg2.addColorStop(0.55, "#c88818");
      bg2.addColorStop(0.75, "#9a6010");
      bg2.addColorStop(0.9, "#7a4808");
      bg2.addColorStop(1, "#4a2c04");
      ctx.beginPath();
      ctx.roundRect(-18, -8, 32, 16, 4);
      ctx.fillStyle = bg2;
      ctx.fill();

      // Knurling
      for (let k = -15; k <= 12; k += 2.4) {
        const kg = ctx.createLinearGradient(k, -8, k + 1.2, -8);
        kg.addColorStop(0, "rgba(0,0,0,0.32)");
        kg.addColorStop(0.5, "rgba(0,0,0,0.1)");
        kg.addColorStop(1, "rgba(0,0,0,0.32)");
        ctx.beginPath();
        ctx.rect(k, -8, 1.2, 16);
        ctx.fillStyle = kg;
        ctx.fill();
      }

      // Barrel highlight
      ctx.beginPath();
      ctx.roundRect(-18, -8, 32, 5.5, [4, 4, 0, 0]);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      // Shaft
      const sg = ctx.createLinearGradient(-46, -3.5, -46, 3.5);
      sg.addColorStop(0, "#484848");
      sg.addColorStop(0.35, "#aaaaaa");
      sg.addColorStop(0.65, "#cccccc");
      sg.addColorStop(1, "#383838");
      ctx.beginPath();
      ctx.rect(-44, -3.5, 26, 7);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-44, -3.5, 26, 2.2);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();

      // Flights — shaped properly
      const fc = "#cc1820";
      const fh = "rgba(255,255,255,0.32)";

      // Top flight
      ctx.beginPath();
      ctx.moveTo(-44, -2);
      ctx.bezierCurveTo(-48, -5, -58, -20, -63, -26);
      ctx.bezierCurveTo(-60, -22, -52, -10, -44, -2);
      ctx.closePath();
      ctx.fillStyle = fc;
      ctx.fill();
      ctx.strokeStyle = "#8a0808";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Bottom flight
      ctx.beginPath();
      ctx.moveTo(-44, 2);
      ctx.bezierCurveTo(-48, 5, -58, 20, -63, 26);
      ctx.bezierCurveTo(-60, 22, -52, 10, -44, 2);
      ctx.closePath();
      ctx.fillStyle = fc;
      ctx.fill();
      ctx.strokeStyle = "#8a0808";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Flight highlights
      ctx.beginPath();
      ctx.moveTo(-45, -3);
      ctx.bezierCurveTo(-49, -7, -55, -16, -58, -20);
      ctx.strokeStyle = fh;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-45, 3);
      ctx.bezierCurveTo(-49, 7, -55, 16, -58, 20);
      ctx.strokeStyle = fh;
      ctx.lineWidth = 1.3;
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
      flyFrom = { x: cx - r - 180, y: cy + 60 };
      const dx = tx - cx, dy = ty - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = r * 0.9;
      flyTo = dist > maxDist
        ? { x: cx + (dx / dist) * maxDist, y: cy + (dy / dist) * maxDist }
        : { x: tx, y: ty };
    };

    window.__throwDart = throwDart;

    let time = 0;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cinematic vignette
      const vig = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = "rgba(5,2,1,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawBoard();

      // Vignette on top
      const vig2 = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.4);
      vig2.addColorStop(0, "rgba(0,0,0,0)");
      vig2.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = vig2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (phase === "idle") {
        const wb = Math.sin(time * 0.9) * 5;
        drawDart(cx - r - 180 + wb, cy + 60, -0.07);
      }

      if (phase === "flying") {
        flyProgress += 0.034;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const px = flyFrom.x + (flyTo.x - flyFrom.x) * ease;
        const py = flyFrom.y + (flyTo.y - flyFrom.y) * ease - Math.sin(t * Math.PI) * 55;
        drawDart(px, py, Math.atan2(flyTo.y - flyFrom.y, flyTo.x - flyFrom.x));
        if (flyProgress >= 1) {
          phase = "stuck";
          stuckX = flyTo.x; stuckY = flyTo.y;
          for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 5;
            particles.push({ x: stuckX, y: stuckY, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color: Math.random() > 0.5 ? "#E51D2A" : "#F8EBC6", size: 1.5 + Math.random() * 3 });
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

      animId = animId;
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
