"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, Flame, Target, Award, Zap, Crown, Share2 } from "lucide-react";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

function parseScore(score, isHome) {
  if (!score || typeof score !== "string") return null;
  const m = score.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return isHome ? { for: a, against: b } : { for: b, against: a };
}

function FormGraph({ data }) {
  const W = 600, H = 170, padX = 30, padY = 20;
  const avgs = data.map((d) => d.avg);
  const min = Math.max(0, Math.min(...avgs) - 3);
  const max = Math.max(...avgs) + 3;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1 || 1)) * (W - padX * 2);
    const y = H - padY - ((d.avg - min) / range) * (H - padY * 2);
    return { x, y, avg: d.avg, label: d.game };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H - padY} L${points[0].x.toFixed(1)},${H - padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="formFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e51d2a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e51d2a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padX} y1={padY + f * (H - padY * 2)} x2={W - padX} y2={padY + f * (H - padY * 2)}
          stroke="rgba(243,236,217,0.08)" strokeWidth="1" />
      ))}

      <path d={areaPath} fill="url(#formFill)" />
      <motion.path
        d={linePath}
        fill="none"
        stroke="#e51d2a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#e51d2a" stroke="#0f2535" strokeWidth="2" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(243,236,217,0.7)" fontSize="11" fontWeight="bold">
            {p.avg}
          </text>
          <text x={p.x} y={H - 4} textAnchor="middle" fill="rgba(243,236,217,0.35)" fontSize="10">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function PlayerProfile({ player, masterStats, matches, onClose, onShare }) {
  if (!player) return null;

  const master = masterStats?.[player.name.toLowerCase()] || {};

  const playerMatches = useMemo(
    () => (matches || []).filter((m) => m.home === player.name || m.away === player.name),
    [matches, player.name]
  );

  const formData = useMemo(() => {
    // helper: pull a week/date sort key from whatever field the data uses
    const weekOf = (m) => {
      const w = m.week ?? m.Week ?? m.round ?? null;
      if (w != null && w !== "") {
        const n = parseFloat(String(w).replace(/[^0-9.]/g, ""));
        if (!isNaN(n)) return n;
      }
      // fallback to date
      const d = m.date ?? m.Date ?? null;
      if (d) { const t = new Date(d).getTime(); if (!isNaN(t)) return t; }
      return 0;
    };

    // sort a COPY chronologically (oldest -> newest) so the line always reads left=earliest
    const ordered = [...playerMatches].sort((a, b) => weekOf(a) - weekOf(b));

    return ordered.map((m, i) => {
      const isHome = m.home === player.name;
      const stats = isHome ? m.p1Stats : m.p2Stats;
      const raw = stats?.avg;
      const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", ".").trim());
      // missing/invalid average shows as 0 (as requested)
      const avg = !isNaN(num) && num > 0 ? Math.round(num * 10) / 10 : 0;
      const wk = m.week ?? m.Week ?? (i + 1);
      return { game: `W${wk}`, avg };
    });
  }, [playerMatches, player.name]);

  const formResults = useMemo(() => {
    const arr = [];
    playerMatches.forEach((m) => {
      const isHome = m.home === player.name;
      const sc = parseScore(m.score, isHome);
      if (sc) arr.push(sc.for > sc.against ? "W" : sc.for < sc.against ? "L" : "D");
    });
    return arr;
  }, [playerMatches, player.name]);

  const recentForm = formResults.slice(-6);
  const streak = useMemo(() => {
    if (formResults.length === 0) return { type: null, count: 0 };
    const last = formResults[formResults.length - 1];
    let count = 0;
    for (let i = formResults.length - 1; i >= 0; i--) {
      if (formResults[i] === last) count++;
      else break;
    }
    return { type: last, count };
  }, [formResults]);

  const trend = useMemo(() => {
    const avgs = formData.map((d) => d.avg);
    if (avgs.length < 4) return 0;
    const recent = avgs.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prev = avgs.slice(-6, -3);
    if (prev.length === 0) return 0;
    const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
    return recent - prevAvg;
  }, [formData]);

  const badges = useMemo(() => {
    const b = [];
    const tons = Number(master.tons ?? player.tons ?? 0);
    const hc = Number(master.bestCheckout ?? player.highCheckout ?? 0);
    const wins = Number(master.gamesWon ?? player.wins ?? 0);
    const avg = Number(master.best3DA ?? player.avg ?? 0);

    if (tons >= 1) b.push({ icon: Flame, label: `${tons}× 180`, color: "text-orange-400" });
    if (hc >= 100) b.push({ icon: Target, label: `${hc} Checkout`, color: "text-odcRed" });
    if (avg >= 60) b.push({ icon: Zap, label: `${avg} Avg`, color: "text-yellow-400" });
    if (wins >= 5) b.push({ icon: Crown, label: `${wins} Wins`, color: "text-amber-300" });
    if (streak.type === "W" && streak.count >= 3) b.push({ icon: TrendingUp, label: `${streak.count} Win Streak`, color: "text-green-400" });
    if (Number(player.bestLeg) > 0 && Number(player.bestLeg) <= 18) b.push({ icon: Award, label: `${player.bestLeg}-Dart Leg`, color: "text-odcCream" });
    return b;
  }, [master, player, streak]);

  const statGrid = [
    ["Games Played", master?.gamesPlayed ?? player.played],
    ["Won", master?.gamesWon ?? player.wins],
    ["Lost", master?.gamesLost ?? player.losses],
    ["Best 3DA", master?.best3DA ?? player.avg],
    ["Best 9DA", master?.best9DA ?? player.nineAvg],
    ["Best C/O", master?.bestCheckout ?? player.highCheckout],
    ["180s", master?.tons ?? player.tons],
    ["Best Leg", player.bestLeg || "-"],
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-odcCream/15 bg-odcBlack shadow-glow"
      >
        <div className="relative overflow-hidden rounded-t-3xl border-b border-odcCream/10 bg-gradient-to-br from-odcNavy to-black p-6">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-odcRed/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
                style={{ background: avatarColor(player.name) }}
              >
                {initials(player.name)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-odcRed">{master?.division || player.division}</p>
                <h3 className="mt-1 text-3xl font-black">{player.name}</h3>
                <div className="mt-2 flex items-center gap-2">
                  {recentForm.map((r, i) => (
                    <span
                      key={i}
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                        r === "W" ? "bg-green-500/20 text-green-400" : r === "L" ? "bg-odcRed/20 text-odcRed" : "bg-white/10 text-odcCream/60"
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                  {streak.count >= 2 && streak.type && (
                    <span className="ml-1 text-xs font-black text-odcCream/60">
                      {streak.count} {streak.type === "W" ? "win" : streak.type === "L" ? "loss" : "draw"} streak
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onShare && (
                <button onClick={() => onShare(player)} className="rounded-2xl bg-odcRed/90 p-3 text-white transition hover:bg-odcRed" title="Share profile">
                  <Share2 size={18} />
                </button>
              )}
              <button onClick={onClose} className="rounded-2xl bg-white/10 p-3">
                <X />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {badges.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {badges.map((b, i) => {
                const Icon = b.icon;
                return (
                  <span key={i} className="inline-flex items-center gap-2 rounded-full border border-odcCream/15 bg-white/5 px-3 py-2 text-xs font-black">
                    <Icon size={15} className={b.color} />
                    {b.label}
                  </span>
                );
              })}
            </div>
          )}

          {formData.length >= 2 && (
            <div className="mb-6 rounded-3xl border border-odcCream/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-odcCream/70">Average Form</h4>
                {trend !== 0 && (
                  <span className={`inline-flex items-center gap-1 text-xs font-black ${trend > 0 ? "text-green-400" : "text-odcRed"}`}>
                    {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {trend > 0 ? "+" : ""}{trend.toFixed(1)} trend
                  </span>
                )}
              </div>
              <FormGraph data={formData} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statGrid.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-odcCream/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-odcCream/45">{label}</p>
                <p className="mt-1 text-2xl font-black">{value ?? "-"}</p>
              </div>
            ))}
          </div>

          {playerMatches.length > 0 && (
            <div className="mt-8">
              <h4 className="mb-4 text-xl font-black">Recent Matches</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {playerMatches.slice(-8).reverse().map((m, i) => {
                  const isHome = m.home === player.name;
                  const sc = parseScore(m.score, isHome);
                  const won = sc && sc.for > sc.against;
                  const opp = isHome ? m.away : m.home;
                  return (
                    <div key={m.id || i} className={`rounded-2xl border p-4 ${won ? "border-green-500/30 bg-green-500/5" : "border-odcRed/30 bg-odcRed/5"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-odcCream/45">{m.division || "League"}</p>
                          <p className="mt-1 font-black">vs {opp}</p>
                        </div>
                        <div className="text-right">
                          <span className={`rounded-lg px-3 py-1 text-lg font-black ${won ? "bg-green-500/20 text-green-400" : "bg-odcRed/20 text-odcRed"}`}>
                            {m.score}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
