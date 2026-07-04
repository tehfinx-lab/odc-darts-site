"use client";

import { useEffect, useState } from "react";

/**
 * SPLASH — MATCHNIGHT
 * The site's signature, distilled: the board rim draws itself around
 * the ODC badge, the numbers sweep in clockwise, the wordmark rises,
 * and a red rule sweeps underneath. Tap to enter. Pure CSS/SVG.
 */

const NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const pt = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [380 + r * Math.cos(a), 380 + r * Math.sin(a)];
};
const sector = (r1, r2, a1, a2) => {
  const [x1, y1] = pt(r1, a1), [x2, y2] = pt(r2, a1), [x3, y3] = pt(r2, a2), [x4, y4] = pt(r1, a2);
  return `M${x1} ${y1} L${x2} ${y2} A${r2} ${r2} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${r1} ${r1} 0 0 0 ${x1} ${y1}`;
};

export default function Splash() {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => window.location.replace("/?from=splash"), 650);
  };

  return (
    <div
      className={`splash relative flex h-screen w-screen cursor-pointer flex-col items-center justify-center overflow-hidden ${leaving ? "leaving" : ""}`}
      onClick={ready ? enter : undefined}
      style={{ background: "#0A1710" }}
    >
      {/* ticker echo along the top */}
      <div className="mono absolute left-0 right-0 top-0 flex items-center gap-2 border-b border-[rgba(233,239,231,.13)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(233,239,231,.45)]">
        <span className="dot h-[7px] w-[7px] rounded-full bg-[#E63329]" /> Season 4 · Matchnight
      </div>

      {/* board rim + numbers around the badge */}
      <div className="boardw relative w-[min(74vw,420px)]">
        <svg viewBox="0 0 760 760" className="block w-full" aria-hidden="true">
          <circle cx="380" cy="380" r="294" fill="#0A1710" />
          <path d={sector(300, 316, -9, 9)} fill="rgba(230,51,41,0.85)" className="d20" />
          <circle cx="380" cy="380" r="300" fill="none" stroke="rgba(233,239,231,.16)" strokeWidth="1.5" className="rim rim1" />
          <circle cx="380" cy="380" r="316" fill="none" stroke="rgba(233,239,231,.16)" strokeWidth="1.5" className="rim rim2" />
          {NUMS.map((n, j) => {
            const [x, y] = pt(342, j * 18);
            return (
              <text
                key={j}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={j === 0 ? "rgba(230,51,41,.95)" : "rgba(233,239,231,.5)"}
                className="numtxt"
                style={{
                  font: '600 26px "Big Shoulders Display", "Arial Narrow", sans-serif',
                  animationDelay: `${1 + j * 0.05}s`,
                }}
              >
                {n}
              </text>
            );
          })}
        </svg>
        <img
          src="/odc-logo.png"
          alt="ODC — Online Darts Circuit"
          className="badge absolute left-1/2 top-1/2 w-[77%] -translate-x-1/2 -translate-y-1/2 rounded-full object-contain"
        />
      </div>

      {/* wordmark rises from a mask */}
      <div className="mt-8 overflow-hidden">
        <p
          className="wordmark text-center text-[clamp(30px,8vw,58px)] font-extrabold uppercase leading-none tracking-[0.02em] text-[#E9EFE7]"
          style={{ fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif' }}
        >
          Online Darts Circuit
        </p>
      </div>

      {/* red rule sweep */}
      <div className="rule mt-4 h-[2px] bg-[#E63329]" />

      {/* enter prompt */}
      <p className={`mono prompt mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(233,239,231,.55)] ${ready ? "on" : ""}`}>
        Tap to enter — Game on
      </p>

      <style>{`
        .mono { font-family: "Spline Sans Mono", ui-monospace, monospace; }

        .dot { animation: pulse 1.6s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }

        .badge {
          opacity: 0;
          animation: badgeIn 1s .35s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes badgeIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(.88); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }

        .rim {
          stroke-dasharray: 1990;
          stroke-dashoffset: 1990;
          animation: draw 1.5s .2s cubic-bezier(.4,0,.2,1) forwards;
        }
        .rim2 { animation-delay: .45s; }
        @keyframes draw { to { stroke-dashoffset: 0; } }

        .d20 { opacity: 0; animation: fade .7s 1.5s forwards; }
        .numtxt { opacity: 0; animation: fade .5s forwards; }
        @keyframes fade { to { opacity: 1; } }

        .wordmark {
          transform: translateY(110%);
          animation: up .9s .9s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes up { to { transform: translateY(0); } }

        .rule { width: 0; animation: sweep .9s 1.6s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sweep { to { width: clamp(150px, 26vw, 260px); } }

        .prompt { opacity: 0; transition: opacity .6s; }
        .prompt.on { opacity: 1; animation: pulse 2.4s 1s ease-in-out infinite; }

        .splash { transition: opacity .65s ease, transform .65s ease; }
        .splash.leaving { opacity: 0; transform: scale(1.04); }

        @media (prefers-reduced-motion: reduce) {
          .badge, .d20, .numtxt { opacity: 1; animation: none; }
          .rim { stroke-dashoffset: 0; animation: none; }
          .wordmark { transform: none; animation: none; }
          .rule { width: clamp(150px, 26vw, 260px); animation: none; }
          .dot, .prompt.on { animation: none; }
        }
      `}</style>
    </div>
  );
}
