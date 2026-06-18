"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SPLASH — "CINEMATIC STAGE" (Adidas x Foot Locker "Chile 20" style)
 * Dark spotlit stage, glowing emerald light column behind the ODC logo,
 * reflective floor, slow dramatic reveal. Logo is the centrepiece;
 * "Online Darts Circuit" rises in below. Pure CSS/Canvas — fast, robust.
 *
 * Uses /odc-logo.png from your public folder.
 */
export default function Splash() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // floating dust motes + soft atmosphere on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0, W, H;
    const motes = [];

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 70; i++) {
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random(),                      // depth
        vy: -(0.1 + Math.random() * 0.3),
        drift: (Math.random() - 0.5) * 0.2,
      });
    }

    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      motes.forEach((m) => {
        m.y += m.vy;
        m.x += m.drift + Math.sin(t + m.y * 0.01) * 0.15;
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        const size = 0.5 + m.z * 1.8;
        const alpha = 0.15 + m.z * 0.35;
        ctx.beginPath();
        ctx.arc(m.x, m.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(22,196,108,${alpha * (0.6 + Math.sin(t * 1.5 + m.x) * 0.4)})`;
        ctx.fill();
      });
    };
    loop();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2600);
    return () => clearTimeout(t);
  }, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => window.location.replace("/?from=splash"), 800);
  };

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-black ${ready ? "cursor-pointer" : ""}`}
      onClick={ready ? enter : undefined}
    >
      {/* deep radial stage background */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 38%, #06281a 0%, #031309 42%, #010604 78%)" }} />

      {/* glowing emerald light column behind logo */}
      <div className={`column absolute left-1/2 top-0 h-full w-[clamp(140px,18vw,340px)] -translate-x-1/2 transition-opacity duration-1000 ${leaving ? "opacity-0" : ""}`} />
      <div className={`column-core absolute left-1/2 top-0 h-full w-[clamp(40px,5vw,90px)] -translate-x-1/2 transition-opacity duration-1000 ${leaving ? "opacity-0" : ""}`} />

      {/* spotlight cone from top */}
      <div className="spotlight pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" />

      {/* dust canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.9) 100%)" }} />

      {/* ===== CENTREPIECE ===== */}
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all duration-[800ms] ${leaving ? "scale-110 opacity-0" : "scale-100 opacity-100"}`}>

        {/* logo with reveal + glow + slow float, plus reflection */}
        <div className="logo-wrap relative">
          <img
            src="/odc-logo.png"
            alt="ODC — Online Darts Circuit"
            className="logo relative z-10 w-[clamp(220px,34vw,460px)] object-contain"
          />
          {/* reflection on the floor */}
          <img
            src="/odc-logo.png"
            alt=""
            aria-hidden
            className="reflection absolute left-0 top-full w-[clamp(220px,34vw,460px)] object-contain"
          />
        </div>

        {/* ONLINE DARTS CIRCUIT rises in below */}
        <div className="mt-[clamp(20px,4vh,48px)] overflow-hidden">
          <p className="tagline text-center text-[clamp(13px,2.2vw,26px)] font-black uppercase tracking-[0.55em] text-odcCream">
            Online&nbsp;Darts&nbsp;Circuit
          </p>
        </div>

        {/* thin red underline sweep */}
        <div className="underline-sweep mt-5 h-[2px] bg-gradient-to-r from-transparent via-[#16C46C] to-transparent" />

        {/* enter prompt */}
        {ready && !leaving && (
          <button
            onClick={enter}
            className="enter-btn mt-[clamp(28px,5vh,56px)] rounded-full border border-[#16C46C]/60 bg-[#16C46C]/10 px-10 py-4 text-[12px] font-black uppercase tracking-[0.3em] text-odcCream backdrop-blur-sm transition hover:bg-[#16C46C] hover:text-odcBlack"
          >
            Enter the Circuit
          </button>
        )}
      </div>

      <style>{`
        :root { --odcCream: #f3ecd9; }
        .text-odcCream { color: #f3ecd9; }

        /* Red glow column behind logo */
        .column {
          background: linear-gradient(to bottom, transparent 0%, rgba(22,196,108,0.0) 8%, rgba(22,196,108,0.45) 35%, rgba(22,196,108,0.55) 50%, rgba(22,196,108,0.45) 65%, transparent 95%);
          filter: blur(28px);
          opacity: 0;
          animation: columnIn 1.6s 0.2s forwards, columnPulse 4s 1.8s ease-in-out infinite;
        }
        .column-core {
          background: linear-gradient(to bottom, transparent 10%, rgba(232,199,102,0.5) 45%, rgba(245,225,160,0.65) 50%, rgba(232,199,102,0.5) 55%, transparent 90%);
          filter: blur(12px);
          opacity: 0;
          animation: columnIn 1.6s 0.3s forwards, columnPulse 4s 1.8s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes columnIn { from { opacity: 0; transform: translateX(-50%) scaleY(0.4); } to { opacity: 1; transform: translateX(-50%) scaleY(1); } }
        @keyframes columnPulse { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }

        /* Spotlight cone */
        .spotlight {
          width: 70vw; height: 75vh;
          background: radial-gradient(ellipse 50% 60% at 50% 0%, rgba(220,245,225,0.18), transparent 70%);
          opacity: 0;
          animation: spotIn 1.4s 0.1s forwards;
        }
        @keyframes spotIn { to { opacity: 1; } }

        /* Logo reveal: rise + scale + glow */
        .logo {
          opacity: 0;
          filter: drop-shadow(0 0 0px rgba(22,196,108,0));
          animation: logoIn 1.4s 0.5s cubic-bezier(.2,.8,.2,1) forwards, logoFloat 6s 1.9s ease-in-out infinite, logoGlow 4s 1.9s ease-in-out infinite;
        }
        @keyframes logoIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.82); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes logoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes logoGlow {
          0%,100% { filter: drop-shadow(0 0 30px rgba(22,196,108,0.4)); }
          50% { filter: drop-shadow(0 0 55px rgba(22,196,108,0.6)); }
        }

        /* Floor reflection */
        .reflection {
          opacity: 0;
          transform: scaleY(-1);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%);
          filter: blur(2px);
          animation: reflectIn 1.4s 1.2s forwards;
        }
        @keyframes reflectIn { to { opacity: 0.28; } }

        /* Tagline rise */
        .tagline {
          transform: translateY(110%);
          opacity: 0;
          animation: taglineUp 1s 1.5s cubic-bezier(.2,.9,.2,1) forwards, taglineFlicker 5s 2.6s infinite;
        }
        @keyframes taglineUp { to { transform: translateY(0); opacity: 1; } }
        @keyframes taglineFlicker { 0%,93%,95%,100% { opacity: 1; } 94% { opacity: 0.55; } }

        /* underline sweep */
        .underline-sweep { width: 0; animation: sweep 1.1s 2s forwards; }
        @keyframes sweep { to { width: clamp(220px, 30vw, 420px); } }

        /* enter button */
        .enter-btn { opacity: 0; animation: btnIn 0.6s forwards, btnPulse 2.5s 0.6s ease-in-out infinite; }
        @keyframes btnIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes btnPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,196,108,0.4); } 50% { box-shadow: 0 0 34px 2px rgba(22,196,108,0.3); } }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
