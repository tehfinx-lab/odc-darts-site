"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Menu,
  X,
  Trophy,
  Target,
  Users,
  CalendarDays,
  ChevronDown,
  Search,
  Medal,
  Home,
  Table2,
  BarChart3,
  Flame,
  Shield,
  Zap,
  MessageCircle,
  Share2,
  ExternalLink,
  CalendarCheck,
  Award,
  ClipboardList,
  Archive,
} from "lucide-react";
import { fallbackData, getLiveLeagueData } from "../lib/sheetData";
import { seasonArchive } from "../lib/seasonArchive";
import { CountUp, AnimatedStatValue, Reveal, StaggerRows, Row } from "./motion";
import { downloadResultCard, shareResultCard } from "./shareCard";
import Predictions from "./Predictions";
import { Crosshair } from "lucide-react";

function playerSlug(name) {
  return String(name).toLowerCase().trim().replace(/\s+/g, "-");
}
import PlayerProfile from "./PlayerProfile";
import NextEventBanner from "./NextEventBanner";

const pages = [
  { id: "home", label: "Home", icon: Home },
  { id: "fixtures", label: "Fixtures", icon: CalendarCheck },
  { id: "results", label: "Results", icon: ClipboardList },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "duo", label: "Duo League", icon: Trophy },
  { id: "players", label: "Players", icon: Users },
  { id: "leaderboards", label: "Leaders", icon: BarChart3 },
  { id: "predictions", label: "Predict", icon: Crosshair },
  { id: "mvps", label: "MVPs", icon: Award },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "archive", label: "Archive", icon: Archive },
];

// ⬇️ PASTE YOUR GOOGLE APPS SCRIPT WEB-APP URL HERE (the one ending in /exec)
const PREDICTIONS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";

const socials = [
  { label: "Discord", href: "https://discord.gg/s4GdKykCe9", icon: MessageCircle },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61581159360834", icon: Share2 },
  { label: "TikTok", href: "https://www.tiktok.com/@odccircuit", icon: ExternalLink },
];

/* ---------- RESULTS TICKER — broadcast strip across the very top ---------- */
function Ticker({ results = [] }) {
  const items = useMemo(() => {
    const list = (results || []).slice(0, 8).map((r) => ({
      home: r.home, away: r.away, score: r.score,
    }));
    const tons = (results || []).slice(0, 12).reduce(
      (sum, r) => sum + (Number(r.p1Stats?.tons) || 0) + (Number(r.p2Stats?.tons) || 0), 0
    );
    return { list, tons };
  }, [results]);

  if (!items.list.length) return null;

  const Strip = () => (
    <span className="mono flex items-center text-[11px] font-medium tracking-[0.08em] text-odcCream/60">
      {items.list.map((r, i) => (
        <span key={i} className="flex items-center">
          <b className="font-semibold text-odcCream">{r.home}</b>
          <i className="not-italic px-1.5 font-semibold text-odcRed">{r.score}</i>
          {r.away}
          <em className="not-italic px-4 text-odcCream/30">///</em>
        </span>
      ))}
      {items.tons > 0 && (
        <span className="flex items-center">
          180 WATCH — {items.tons} MAXIMUMS THIS WEEK
          <em className="not-italic px-4 text-odcCream/30">///</em>
        </span>
      )}
    </span>
  );

  return (
    <div className="flex items-stretch overflow-hidden border-b border-odcCream/10 bg-[#081209]" aria-label="Latest results">
      <div className="mono flex flex-none items-center gap-2 border-r border-odcCream/10 px-3.5 py-2 text-[10.5px] font-semibold tracking-[0.14em]">
        <span className="dot-live h-[7px] w-[7px] rounded-full bg-odcRed" /> LIVE
      </div>
      <div className="tickwrap flex-1">
        <div className="tick"><Strip /><Strip /></div>
      </div>
    </div>
  );
}

/* ---------- SIGNATURE — dartboard wireframe, ODC logo seated at the bull ---------- */
const BOARD_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const bPt = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [380 + r * Math.cos(a), 380 + r * Math.sin(a)];
};
const bSector = (r1, r2, a1, a2) => {
  const [x1, y1] = bPt(r1, a1), [x2, y2] = bPt(r2, a1), [x3, y3] = bPt(r2, a2), [x4, y4] = bPt(r1, a2);
  return `M${x1} ${y1} L${x2} ${y2} A${r2} ${r2} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${r1} ${r1} 0 0 0 ${x1} ${y1}`;
};

function DartBoard() {
  const reduce = useReducedMotion();
  const WIRE = "rgba(233,239,231,0.15)";
  const draw = (i) =>
    reduce
      ? { initial: false }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 1, delay: 0.15 + i * 0.035, ease: "easeInOut" },
        };
  const fade = (d) =>
    reduce
      ? { initial: false }
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8, delay: d } };

  return (
    <div className="relative mx-auto w-full max-w-[340px] md:max-w-[520px]">
      <svg viewBox="0 0 760 760" className="w-full" aria-hidden="true">
        <motion.circle cx="380" cy="380" r="294" fill="#0A1710" {...fade(0.4)} />
        <motion.path d={bSector(300, 316, -9, 9)} fill="rgba(230,51,41,0.85)" {...fade(0.85)} />
        {[300, 316].map((r, i) => (
          <motion.circle key={r} cx="380" cy="380" r={r} fill="none" stroke={WIRE} strokeWidth="1" {...draw(i * 3)} />
        ))}
        {BOARD_NUMS.map((n, j) => {
          const [x, y] = bPt(342, j * 18);
          return (
            <motion.text key={`n${j}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fill={j === 0 ? "rgba(230,51,41,0.95)" : "rgba(233,239,231,0.5)"}
              style={{ font: '600 24px "Big Shoulders Display", sans-serif' }} {...fade(0.5 + j * 0.045)}>
              {n}
            </motion.text>
          );
        })}
      </svg>
      {/* the bull is the badge */}
      <motion.img
        src="/odc-logo.png" alt="ODC logo"
        className="absolute left-1/2 top-1/2 w-[77%] -translate-x-1/2 -translate-y-1/2 rounded-full object-contain"
        {...fade(0.55)}
      />
    </div>
  );
}

/* ---------- NINE-DART LOADER — plays beside the board while data loads.
   Always completes at least one full leg, then bows out. ---------- */
const NINE_DART_SEQ = [
  { n: "501", sub: "\u00A0" },
  { n: "321", sub: "visit: 180" },
  { n: "141", sub: "visit: 180" },
  { n: "GAME SHOT", sub: "141 out \u2014 T20 \u00B7 T19 \u00B7 D12", done: true },
];

function NineDartLoader({ loading }) {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const finished = step >= NINE_DART_SEQ.length - 1;

  useEffect(() => {
    if (gone) return;
    if (!finished) {
      const t = setTimeout(() => setStep((v) => v + 1), 620);
      return () => clearTimeout(t);
    }
    if (loading) {
      const t = setTimeout(() => setStep(0), 1500);
      return () => clearTimeout(t);
    }
    const f = setTimeout(() => setFading(true), 1300);
    const g = setTimeout(() => setGone(true), 1950);
    return () => { clearTimeout(f); clearTimeout(g); };
  }, [step, loading, finished, gone]);

  if (gone) return null;
  const cur = NINE_DART_SEQ[step];

  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-full z-10 -mt-1 flex w-max -translate-x-1/2 flex-col items-center transition-opacity duration-500 md:-mt-3 ${
        fading ? "opacity-0" : "opacity-90"
      }`}
      aria-hidden="true"
    >
      <p className="mono text-[8.5px] font-semibold uppercase tracking-[0.24em] text-odcCream/35">Loading league data</p>
      <span className="block h-[38px] overflow-hidden">
        <motion.span
          key={step}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`display num block leading-[38px] ${cur.done ? "text-[26px] text-odcGold/90" : "text-[36px] text-odcCream/70"}`}
        >
          {cur.n}
        </motion.span>
      </span>
      <p className="mono min-h-[13px] text-[9px] tracking-[0.14em] text-odcCream/40">{cur.sub}</p>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-odcCream/10 bg-odcNavy p-5 ${className}`}>{children}</div>;
}

const easeOut = [0.22, 1, 0.36, 1];

function SectionTitle({ kicker, title, text }) {
  return (
    <div className="mb-7">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.5 }}
        className="mono flex items-center gap-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-odcCream/60"
      >
        <span className="text-odcRed">■</span> {kicker}
        <motion.span
          className="h-px flex-1 origin-left bg-odcCream/[0.13]"
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.9, delay: 0.15, ease: easeOut }}
        />
      </motion.p>
      <span className="block overflow-hidden">
        <motion.h2
          className="mt-3.5 text-4xl md:text-5xl"
          initial={{ y: "105%" }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          {title}
        </motion.h2>
      </span>
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: easeOut }}
          className="mt-3 max-w-2xl text-sm leading-7 text-odcCream/60 md:text-base"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

/* Panels unclip as they scroll into view — the video's signature move */
function ClipReveal({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(0% 0% 100% 0%)", y: 40 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

/* Giant scrolling wordmark strip */
function Marquee({ items }) {
  const Strip = () => (
    <span className="flex flex-none items-center">
      {items.map((t, i) => (
        <span key={i} className="display flex items-center whitespace-nowrap text-[clamp(44px,8vw,92px)] leading-none">
          <span className={i % 2 ? "hollow" : ""}>{t}</span>
          <span className="mx-6 text-[0.4em] text-odcRed md:mx-10">///</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className="marq-wrap mt-14 border-y border-odcCream/10 py-6 md:mt-20 md:py-8" aria-hidden="true">
      <div className="marq flex w-max"><Strip /><Strip /></div>
    </div>
  );
}

function SmallStat({ label, value, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-odcCream/45">{label}</p>
          <p className="mt-1 text-2xl font-semibold"><AnimatedStatValue value={value} /></p>
        </div>
        {Icon && <Icon className="text-odcRed" size={24} />}
      </div>
    </Card>
  );
}

function SocialButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      {socials.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-odcCream/15 bg-white/5 px-4 py-3 text-sm font-semibold text-odcCream transition hover:bg-white/10"
          >
            <Icon size={17} />
            {social.label}
          </a>
        );
      })}
    </div>
  );
}

function Header({ active, setActive }) {
  const [open, setOpen] = useState(false);

  const go = (id) => {
    setActive(id);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-odcCream/10 bg-odcBlack/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <button onClick={() => go("home")} className="flex items-center gap-3 text-left">
            <img src="/odc-logo.png" alt="ODC logo" className="h-11 w-11 rounded-full object-contain" />
            <span>
              <span className="display block text-xl leading-none tracking-[0.04em]">ODC</span>
              <span className="mono block pt-0.5 text-[9.5px] uppercase tracking-[0.18em] text-odcCream/40">
                Online Darts Circuit
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-0.5 xl:flex">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => go(p.id)}
                className={`rounded-md px-3.5 py-2 text-[13px] font-semibold transition ${
                  active === p.id
                    ? "text-odcCream shadow-[inset_0_-2px_0_#E63329]"
                    : "text-odcCream/60 hover:bg-white/5 hover:text-odcCream"
                }`}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="https://discord.gg/s4GdKykCe9"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-odcRed px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-white transition hover:bg-odcRedDeep"
            >
              Join
            </a>
            <button onClick={() => setOpen(true)} className="rounded-md border border-odcCream/15 p-2.5 xl:hidden" aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 xl:hidden">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="ml-auto h-full w-[82%] max-w-sm overflow-y-auto border-l border-odcCream/10 bg-odcBlack p-5"
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/odc-logo.png" alt="ODC logo" className="h-11 w-11 rounded-full object-contain" />
                <div>
                  <p className="display text-lg">ODC</p>
                  <p className="mono text-[10px] uppercase tracking-[0.16em] text-odcCream/40">League hub</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md bg-white/10 p-2" aria-label="Close menu">
                <X />
              </button>
            </div>

            <div className="space-y-1.5">
              {pages.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => go(p.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left font-semibold ${
                      active === p.id ? "bg-odcRed text-white" : "bg-white/[0.04] text-odcCream"
                    }`}
                  >
                    <Icon size={19} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function BottomNav({ active, setActive }) {
  const mobilePages = pages.filter((p) => ["home", "tables", "predictions", "results", "players"].includes(p.id));

  const go = (id) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-odcCream/10 bg-odcBlack/95 px-2 py-2 xl:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobilePages.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              className={`mono rounded-lg px-1 py-2 text-[9.5px] font-semibold uppercase tracking-[0.06em] ${
                active === p.id ? "bg-odcRed text-white" : "text-odcCream/60"
              }`}
            >
              <Icon className="mx-auto mb-1" size={19} />
              {p.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MatchDetailsModal({ match, onClose }) {
  if (!match) return null;

  const p1 = match.p1Stats || {};
  const p2 = match.p2Stats || {};
  const blank = (v) => v === undefined || v === null || String(v).trim() === "";
  const show = (v) => (blank(v) ? "\u2013" : v);

  /* full broadcast stat sheet, grouped like TV coverage */
  const groups = [
    {
      name: "Legs",
      rows: [
        ["Legs Won", p1.legsFor, p2.legsFor],
        ["Best Leg", p1.bestLegRaw || p1.bestLeg, p2.bestLegRaw || p2.bestLeg],
        ["Worst Leg", p1.worstLeg, p2.worstLeg],
      ],
    },
    {
      name: "Scoring",
      rows: [
        ["3-Dart Avg", p1.avg, p2.avg],
        ["9-Dart Avg", p1.nineAvg, p2.nineAvg],
        ["180s", p1.tons, p2.tons],
      ],
    },
    {
      name: "Finishing",
      rows: [
        ["High Checkout", p1.highCheckout, p2.highCheckout],
        ["Checkout %", p1.checkoutRate, p2.checkoutRate],
        ["Checkouts", p1.checkouts, p2.checkouts],
      ],
    },
  ]
    // drop rows where BOTH sides are truly empty (zeros are real data and stay)
    .map((g) => ({ ...g, rows: g.rows.filter(([, a, b]) => !blank(a) || !blank(b)) }))
    .filter((g) => g.rows.length);

  const better = (a, b) => {
    const na = parseFloat(String(a).replace("%", ""));
    const nb = parseFloat(String(b).replace("%", ""));
    if (isNaN(na) || isNaN(nb) || na === nb) return 0;
    return na > nb ? 1 : -1;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 md:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-odcCream/15 bg-odcBlack"
      >
        {/* top bar */}
        <div className="mono flex items-center justify-between gap-3 border-b border-odcCream/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-odcCream/55">
          <span className="text-odcRed">■ <span className="text-odcCream/55">{match.division}</span></span>
          <span>
            {match.date || ""} {match.week ? `· Week ${match.week}` : ""} · Final
          </span>
        </div>

        {/* tale of the tape */}
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-7 md:gap-6 md:py-9">
          <p className="display break-words text-[clamp(20px,4.5vw,40px)] font-extrabold leading-[0.95]">{match.home}</p>
          <p className="score rounded-lg bg-odcRed px-4 py-1.5 text-[clamp(24px,4vw,36px)] text-white md:px-5">{match.score}</p>
          <p className="display break-words text-right text-[clamp(20px,4.5vw,40px)] font-extrabold leading-[0.95]">{match.away}</p>
        </div>

        {/* stat sheet */}
        <div className="num px-5 pb-5">
          {groups.map((g) => (
            <div key={g.name} className="mb-4 last:mb-0">
              <p className="mono flex items-center gap-3 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-odcCream/35">
                {g.name}
                <span className="h-px flex-1 bg-odcCream/[0.09]" aria-hidden="true" />
              </p>
              {g.rows.map(([label, a, b]) => {
                const w = better(a, b);
                return (
                  <div key={label} className="grid grid-cols-[1fr_minmax(96px,auto)_1fr] items-center gap-3 border-b border-odcCream/[0.06] py-2.5 last:border-0">
                    <span className={`mono text-right text-[13.5px] ${w === 1 ? "font-bold text-odcCream" : "font-medium text-odcCream/55"}`}>
                      {show(a)}
                    </span>
                    <span className="mono text-center text-[9.5px] uppercase tracking-[0.14em] text-odcCream/40">{label}</span>
                    <span className={`mono text-[13.5px] ${w === -1 ? "font-bold text-odcCream" : "font-medium text-odcCream/55"}`}>
                      {show(b)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between gap-3 border-t border-odcCream/10 px-5 py-3.5">
          <button
            onClick={() => shareResultCard(match)}
            className="mono inline-flex items-center gap-2 rounded-md bg-odcRed px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-odcRedDeep"
          >
            <Share2 size={14} /> Share result card
          </button>
          <button onClick={onClose} className="mono rounded-md border border-odcCream/20 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-odcCream/70 transition hover:border-odcCream/50 hover:text-odcCream">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ResultCards({ results, onSelectMatch }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {results.map((r, index) => (
        <div key={r.id || `${r.home}-${r.away}-${index}`} className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); shareResultCard(r); }}
            className="absolute right-3 top-3 z-10 rounded-xl bg-white/10 p-2 text-odcCream/70 transition hover:bg-odcRed hover:text-white"
            title="Share result card"
          >
            <Share2 size={15} />
          </button>
          <button onClick={() => onSelectMatch(r)} className="block w-full text-left">
            <Card className="h-full transition hover:-translate-y-1 hover:border-odcRed/40">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/45">{r.division || "Match Result"}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="font-semibold">{r.home}</p>
                <p className="score rounded-md bg-odcRed px-3 py-1 text-xl text-white">{r.score}</p>
                <p className="text-right font-semibold">{r.away}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-odcCream/60">
                <span>{r.home}: {r.p1Stats?.avg || "-"} avg</span>
                <span className="text-right">{r.away}: {r.p2Stats?.avg || "-"} avg</span>
                <span>{r.home}: {r.p1Stats?.highCheckout || 0} C/O</span>
                <span className="text-right">{r.away}: {r.p2Stats?.highCheckout || 0} C/O</span>
              </div>
            </Card>
          </button>
        </div>
      ))}
    </div>
  );
}

function PlayerDetailsModal({ player, masterStats, matches, onClose }) {
  if (!player) return null;

  const master = masterStats?.[player.name.toLowerCase()];
  const playerMatches = (matches || []).filter((m) => m.home === player.name || m.away === player.name).slice(0, 12);

  const statRows = [
    ["Games Played", master?.gamesPlayed ?? player.played],
    ["Games Won", master?.gamesWon ?? player.wins],
    ["Games Drawn", master?.gamesDrawn ?? player.draws],
    ["Games Lost", master?.gamesLost ?? player.losses],
    ["Legs For", master?.legsFor ?? player.legsFor],
    ["Legs Against", master?.legsAgainst ?? player.legsAgainst],
    ["Legs +/-", master?.legsDiff ?? player.legsDiff],
    ["Best C/O", master?.bestCheckout ?? player.highCheckout],
    ["180s", master?.tons ?? player.tons],
    ["Best 3DA", master?.best3DA ?? player.avg],
    ["Best 9DA", master?.best9DA ?? player.nineAvg],
    ["Total Points", master?.totalPoints ?? player.points],
    ["Division", master?.division ?? player.division],
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-odcCream/15 bg-odcBlack p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcRed">{master?.division || player.division}</p>
            <h3 className="mt-2 text-3xl font-semibold">{player.name}</h3>
            <p className="mt-1 text-sm text-odcCream/55">Season profile, key performance records and recent match history.</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/10 p-3">
            <X />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {statRows.map(([label, value]) => (
            <SmallStat key={label} label={label} value={value ?? "-"} />
          ))}
        </div>

        <div className="mt-8">
          <h4 className="mb-4 text-xl font-semibold">Recent Matches</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {playerMatches.map((m) => (
              <Card key={m.id} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/45">{m.division}</p>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <p className="font-semibold">{m.home}</p>
                  <p className="rounded-xl bg-odcRed px-3 py-1 font-semibold text-white">{m.score}</p>
                  <p className="text-right font-semibold">{m.away}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function HomePage({ setActive, data, status, onSelectMatch }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const boardY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  const divisions = Object.keys(data.tables || {});
  const firstDivision = divisions[0];
  const tableRows = (data.tables?.[firstDivision] || []).slice(0, 8);

  const currentWeek = data.currentWeek || 1;
  const weekFixtures = Object.entries(data.fixtures || {})
    .flatMap(([division, rows]) => (rows || []).map((f) => ({ ...f, division: f.division || division })))
    .filter((f) => Number(f.week) === Number(currentWeek))
    .slice(0, 6);

  const motw = data.results?.[0];

  const potw = useMemo(() => {
    const rs = data.results || [];
    if (!rs.length) return null;
    const latestWeek = Math.max(...rs.map((r) => Number(r.week) || 0));
    const pool = rs.filter((r) => (Number(r.week) || 0) === latestWeek);
    let best = null;
    for (const r of pool) {
      const sides = [
        { name: r.home, opp: r.away, s: r.p1Stats, won: (r.p1Stats?.legsFor || 0) > (r.p2Stats?.legsFor || 0) },
        { name: r.away, opp: r.home, s: r.p2Stats, won: (r.p2Stats?.legsFor || 0) > (r.p1Stats?.legsFor || 0) },
      ];
      for (const c of sides) {
        const avg = parseFloat(c.s?.avg) || 0;
        if (!avg) continue;
        const rank = avg + (Number(c.s?.tons) || 0) * 1.5 + (c.won ? 3 : 0);
        if (!best || rank > best.rank) best = { ...c, division: r.division, week: latestWeek, score: r.score, rank };
      }
    }
    return best;
  }, [data.results]);
  const h2h = motw
    ? [
        { label: "3-Dart Avg", a: parseFloat(motw.p1Stats?.avg) || 0, b: parseFloat(motw.p2Stats?.avg) || 0 },
        { label: "180s", a: Number(motw.p1Stats?.tons) || 0, b: Number(motw.p2Stats?.tons) || 0 },
        { label: "High Checkout", a: Number(motw.p1Stats?.highCheckout) || 0, b: Number(motw.p2Stats?.highCheckout) || 0 },
      ]
    : [];
  const pct = (v, other) => {
    const max = Math.max(v, other);
    return max > 0 ? `${Math.round((v / max) * 100)}%` : "50%";
  };

  const heroLine = {
    hidden: { y: "112%" },
    show: (i) => ({ y: 0, transition: { duration: 0.85, delay: 0.12 + i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
  };
  const rise = (d) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div>
      <NextEventBanner events={data.events} onViewEvents={() => setActive("events")} />

      {/* ---------- HERO ---------- */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-odcCream/10">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-0 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pt-20">
          <div>
            <motion.p
              {...rise(0.05)}
              className="mono inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-odcCream/60"
            >
              <span className="inline-block h-px w-6 bg-odcRed" aria-hidden="true" />
              Season 4 · Matchweek {currentWeek} · Registration open
            </motion.p>

            <h1 className="mt-5 text-[clamp(64px,15vw,150px)] font-extrabold leading-[0.86]">
              {["Online", "Darts", "Circuit"].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className={`block ${line === "Darts" ? "hollow" : ""}`}
                    variants={heroLine}
                    initial="hidden"
                    animate="show"
                    custom={i}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p {...rise(0.45)} className="mt-6 max-w-md text-base leading-7 text-odcCream/60">
              The UK's most competitive online darts league.{" "}
              <b className="font-semibold text-odcCream">Real fixtures. Live stats. Weekly glory.</b>{" "}
              Played online. Settled at the oche.
            </motion.p>

            <motion.div {...rise(0.55)} className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://discord.gg/s4GdKykCe9"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-odcRed px-6 py-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-odcRedDeep"
              >
                <MessageCircle size={17} /> Join on Discord
              </a>
              <button
                onClick={() => setActive("tables")}
                className="rounded-md border border-odcCream/25 px-6 py-4 text-[13px] font-bold uppercase tracking-[0.05em] text-odcCream transition hover:border-odcCream/60"
              >
                View live tables <span className="mono font-medium">→</span>
              </button>
            </motion.div>

            <motion.div {...rise(0.62)} className="mt-6">
              <SocialButtons />
            </motion.div>
          </div>

          <motion.div {...rise(0.3)} style={{ y: boardY }} className="relative pb-4 md:pb-0">
            <DartBoard />
            <NineDartLoader loading={status === "loading"} />
          </motion.div>
        </div>

        {/* stat strip along the hero's baseline */}
        <motion.div {...rise(0.7)} className="mx-auto max-w-7xl px-4">
          <div className="mt-10 grid grid-cols-2 border-t border-odcCream/10 md:mt-6 md:flex">
            {[
              { v: <CountUp value={data.players?.length || 0} />, l: "Players" },
              { v: <CountUp value={divisions.length} />, l: "Divisions" },
              { v: "£0", l: "Entry" },
              { v: status === "live" ? "LIVE" : "DEMO", l: "Stats feed" },
            ].map((x, i) => (
              <div
                key={x.l}
                className={`num flex items-baseline gap-2.5 py-4 md:gap-3 md:border-b-0 md:pr-9 ${
                  i % 2 === 0 ? "border-r border-odcCream/10 pr-4" : "pl-4 md:pl-0"
                } ${i < 2 ? "border-b border-odcCream/10 md:border-b-0" : ""} ${
                  i > 0 && i < 3 ? "md:mr-9 md:border-r" : ""
                } ${i === 0 ? "md:mr-9" : ""}`}
              >
                <span className="display text-2xl md:text-3xl">{x.v}</span>
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-odcCream/40">{x.l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ---------- GET IN THE GAME ---------- */}
      <section className="mx-auto max-w-7xl px-4 pt-14 md:pt-20">
        <SectionTitle kicker="New players" title="Get in the Game" />
        <div className="grid gap-px overflow-hidden rounded-xl border border-odcCream/[0.13] bg-odcCream/[0.13] md:grid-cols-3">
          {[
            { n: "01", t: "Join the Discord", d: "One tap, say hello — you're in the room where it happens." },
            { n: "02", t: "Get your division", d: "Placed by average, so every leg is a contest." },
            { n: "03", t: "Play your fixtures", d: "Arrange each match for whatever night suits you both. Stats and bragging rights follow." },
          ].map((step, i) => (
            <ClipReveal key={step.n} delay={i * 0.12} className="h-full">
              <div className="group h-full bg-odcNavy p-6 pb-7">
                <span
                  className="display num text-[44px] leading-none text-transparent transition"
                  style={{ WebkitTextStroke: "1.5px rgba(233,239,231,.3)" }}
                >
                  {step.n}
                </span>
                <h3 className="mt-3.5 text-xl tracking-[0.03em]">{step.t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-odcCream/55">{step.d}</p>
              </div>
            </ClipReveal>
          ))}
        </div>
      </section>

      {/* ---------- MATCH OF THE WEEK — tale of the tape ---------- */}
      {motw && (
        <section className="mx-auto max-w-7xl px-4 pt-14 md:pt-20">
          <SectionTitle kicker="Match of the week" title="Head to Head" />
          <ClipReveal>
          <button onClick={() => onSelectMatch(motw)} className="block w-full text-left">
            <div className="overflow-hidden rounded-xl border border-odcCream/10 bg-odcNavy transition hover:border-odcCream/25">
              <div className="mono flex justify-between gap-3 border-b border-odcCream/10 px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-odcCream/55">
                <span><span className="text-odcGold">★</span>&nbsp; {motw.division || "Featured"}</span>
                <span>{motw.week ? `Week ${motw.week} · ` : ""}Final</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-8 md:gap-8 md:py-12">
                <Reveal>
                  <p className="display break-words text-[clamp(21px,5.5vw,60px)] font-extrabold leading-[0.95]">{motw.home}</p>
                </Reveal>
                <Reveal delay={0.15}>
                  <p className="score rounded-lg bg-odcRed px-4 py-2 text-[clamp(26px,4vw,44px)] text-white md:px-6">
                    {motw.score}
                  </p>
                </Reveal>
                <Reveal delay={0.05}>
                  <p className="display break-words text-right text-[clamp(21px,5.5vw,60px)] font-extrabold leading-[0.95]">{motw.away}</p>
                </Reveal>
              </div>

              <div className="num border-t border-odcCream/10 px-5 pb-5 pt-2">
                {h2h.map((row, i) => (
                  <Reveal key={row.label} delay={0.15 + i * 0.12}>
                    <div className="grid grid-cols-[44px_1fr_92px_1fr_44px] items-center gap-2.5 py-2.5 md:grid-cols-[52px_1fr_130px_1fr_52px] md:gap-3">
                      <span className="mono text-right text-[13px] font-semibold">{row.a}</span>
                      <span className="flex h-[5px] justify-end overflow-hidden rounded-sm bg-odcCream/[0.08]">
                        <motion.i
                          className={`block h-full ${row.a >= row.b ? "bg-odcRed" : "bg-odcCream/45"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: pct(row.a, row.b) }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                      <span className="mono text-center text-[10px] uppercase tracking-[0.14em] text-odcCream/40">{row.label}</span>
                      <span className="flex h-[5px] overflow-hidden rounded-sm bg-odcCream/[0.08]">
                        <motion.i
                          className={`block h-full ${row.b > row.a ? "bg-odcRed" : "bg-odcCream/45"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: pct(row.b, row.a) }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                      <span className="mono text-[13px] font-semibold">{row.b}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </button>
          </ClipReveal>
        </section>
      )}

      {/* ---------- PLAYER OF THE WEEK — the gold moment ---------- */}
      {potw && (
        <section className="mx-auto max-w-7xl px-4 pt-14 md:pt-20">
          <ClipReveal>
            <div className="relative overflow-hidden rounded-xl border border-odcGold/30 bg-odcNavy">
              <div className="absolute inset-y-0 left-0 w-1 bg-odcGold" aria-hidden="true" />
              <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                <div>
                  <p className="mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-odcGold">
                    ★ Player of the week · Week {potw.week}
                  </p>
                  <p className="display mt-2.5 text-[clamp(34px,7vw,58px)] font-extrabold leading-[0.95]">{potw.name}</p>
                  <p className="mono mt-2 text-[11px] uppercase tracking-[0.12em] text-odcCream/45">
                    {potw.division} · {potw.won ? "Beat" : "vs"} {potw.opp} {potw.score}
                  </p>
                </div>
                <div className="num flex gap-6 md:gap-10">
                  {[
                    { v: potw.s?.avg || "-", l: "3-Dart Avg" },
                    { v: potw.s?.tons ?? "-", l: "180s" },
                    { v: potw.s?.highCheckout || "-", l: "High C/O" },
                  ].map((x) => (
                    <div key={x.l}>
                      <p className="display text-3xl md:text-4xl">{x.v}</p>
                      <p className="mono mt-1 text-[9.5px] uppercase tracking-[0.14em] text-odcCream/40">{x.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ClipReveal>
        </section>
      )}

      {/* ---------- STANDINGS + FIXTURES ---------- */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-14 md:pt-20 lg:grid-cols-[1.35fr_1fr]">
        {firstDivision && (
          <div>
            <SectionTitle kicker="Standings" title={firstDivision} />
            <div className="num overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse">
                <thead>
                  <tr className="mono border-b border-odcCream/[0.13] text-left text-[10px] uppercase tracking-[0.14em] text-odcCream/40">
                    <th className="px-2.5 py-2.5 font-semibold">Pos</th>
                    <th className="px-2.5 py-2.5 font-semibold">Player</th>
                    <th className="px-2.5 py-2.5 text-right font-semibold">P</th>
                    <th className="px-2.5 py-2.5 text-right font-semibold">W</th>
                    <th className="hidden px-2.5 py-2.5 text-right font-semibold sm:table-cell">L</th>
                    <th className="hidden px-2.5 py-2.5 text-right font-semibold sm:table-cell">+/−</th>
                    <th className="px-2.5 py-2.5 text-right font-semibold">Pts</th>
                    <th className="hidden px-2.5 py-2.5 text-right font-semibold sm:table-cell">Form</th>
                  </tr>
                </thead>
                <StaggerRows>
                  {tableRows.map((row, i) => (
                    <Row
                      key={row.name || i}
                      className="border-b border-odcCream/[0.06] odd:bg-odcNavy hover:bg-odcPanel2"
                    >
                      <td className="mono w-12 px-2.5 py-3 text-xs font-semibold text-odcCream/55">
                        {String(row.pos ?? i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-2.5 py-3 text-[13.5px] font-semibold">{row.name}</td>
                      <td className="mono px-2.5 py-3 text-right text-xs text-odcCream/55">{row.played ?? "-"}</td>
                      <td className="mono px-2.5 py-3 text-right text-xs text-odcCream/55">{row.wins ?? "-"}</td>
                      <td className="mono hidden px-2.5 py-3 text-right text-xs text-odcCream/55 sm:table-cell">{row.losses ?? "-"}</td>
                      <td className="mono hidden px-2.5 py-3 text-right text-xs text-odcCream/55 sm:table-cell">{row.legs ?? "-"}</td>
                      <td className="mono px-2.5 py-3 text-right text-sm font-bold">{row.points ?? "-"}</td>
                      <td className="hidden px-2.5 py-3 sm:table-cell">
                        <span className="flex justify-end gap-1">
                          {String(row.form || "")
                            .replace(/[^WLD]/gi, "")
                            .slice(-5)
                            .split("")
                            .map((f, fi) => (
                              <s
                                key={fi}
                                className={`flex h-[15px] w-[15px] items-center justify-center rounded-[3px] text-[8.5px] font-bold no-underline ${
                                  f.toUpperCase() === "W"
                                    ? "bg-odcGreen text-[#06130c]"
                                    : f.toUpperCase() === "L"
                                    ? "bg-odcRed/90 text-white"
                                    : "bg-odcCream/20 text-odcBlack"
                                }`}
                              >
                                {f.toUpperCase()}
                              </s>
                            ))}
                        </span>
                      </td>
                    </Row>
                  ))}
                </StaggerRows>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="mono text-[10.5px] uppercase tracking-[0.08em] text-odcCream/40">
                <span className="text-odcGreen">■</span> Updated live from the league sheet
              </p>
              <button onClick={() => setActive("tables")} className="mono text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/60 transition hover:text-odcCream">
                All {divisions.length} divisions →
              </button>
            </div>
          </div>
        )}

        <div>
          <SectionTitle kicker={`Matchweek ${currentWeek}`} title="Fixtures" />
          {weekFixtures.length === 0 ? (
            <Card>
              <p className="font-semibold">No fixtures listed for Week {currentWeek}.</p>
              <p className="mt-1.5 text-sm text-odcCream/55">They'll appear here as soon as they're added.</p>
            </Card>
          ) : (
            <ul className="border-t border-odcCream/[0.13]">
              {weekFixtures.map((f, i) => (
                <Reveal key={`${f.home}-${f.away}-${i}`} delay={i * 0.05}>
                  <li className="grid grid-cols-[1fr_auto] items-center gap-3.5 border-b border-odcCream/[0.06] px-1 py-3.5 transition hover:bg-odcNavy">
                    <span>
                      <span className="text-sm font-semibold">
                        {f.home} <span className="px-1.5 font-medium text-odcCream/35">v</span> {f.away}
                      </span>
                      <span className="mono mt-1 block text-[10px] uppercase tracking-[0.12em] text-odcCream/40">
                        {f.division}
                      </span>
                    </span>
                    <span className="mono text-xs font-semibold text-odcCream/70">{f.date || "TBC"}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
          <button onClick={() => setActive("fixtures")} className="mono mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/60 transition hover:text-odcCream">
            Full fixture list →
          </button>
        </div>
      </section>

      {/* ---------- LATEST RESULTS — final scores rundown ---------- */}
      {data.results && data.results.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 md:pt-20">
          <SectionTitle kicker="Latest results" title="Final Scores" />
          <ul className="num border-t border-odcCream/[0.13]">
            {data.results.slice(0, 6).map((r, index) => (
              <Reveal key={r.id || `${r.home}-${r.away}-${index}`} delay={index * 0.06}>
                <li className="group relative">
                  <button
                    onClick={() => onSelectMatch(r)}
                    className="grid w-full grid-cols-[auto_1fr_auto_1fr] items-center gap-3 px-1 py-4 text-left transition hover:bg-odcNavy md:grid-cols-[auto_1fr_auto_1fr_auto] md:gap-4"
                  >
                    <span className="mono rounded border border-odcCream/[0.13] px-1.5 py-1 text-[9.5px] font-semibold tracking-[0.12em] text-odcCream/40">
                      FT
                    </span>
                    <span className="display truncate text-right text-base tracking-[0.02em] md:text-lg">{r.home}</span>
                    <span className="score rounded bg-odcRed px-2.5 py-1 text-[15px] text-white">{r.score}</span>
                    <span className="display truncate text-base tracking-[0.02em] md:text-lg">{r.away}</span>
                    <span className="mono hidden text-right text-[10.5px] text-odcCream/40 md:block">
                      {r.p1Stats?.avg || "-"} / {r.p2Stats?.avg || "-"} AVG
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); shareResultCard(r); }}
                    className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-2 text-odcCream/40 transition hover:bg-odcRed hover:text-white group-hover:block md:right-24"
                    title="Share result card"
                  >
                    <Share2 size={14} />
                  </button>
                  <span className="block border-b border-odcCream/[0.06]" aria-hidden="true" />
                </li>
              </Reveal>
            ))}
          </ul>
          <button onClick={() => setActive("results")} className="mono mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/60 transition hover:text-odcCream">
            All results →
          </button>
        </section>
      )}

      <Marquee items={["Game On", "Season 4", "Every Leg Counts", "Online Darts Circuit"]} />

    </div>
  );
}

function ArchivePage({ data }) {
  const snapshot = () => {
    const name = window.prompt("Name this season (this freezes the CURRENT tables):", "Season 4");
    if (!name) return;
    const tables = data.tables || {};
    const entry = {
      name,
      savedOn: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      champions: Object.fromEntries(Object.entries(tables).map(([d, rows]) => [d, rows?.[0]?.name || ""])),
      tables,
    };
    const file =
      "/**\n * SEASON ARCHIVE — generated by the site.\n * Replace lib/seasonArchive.js on GitHub with this file to freeze the season.\n */\nexport const seasonArchive = " +
      JSON.stringify([entry, ...seasonArchive], null, 2) +
      ";\n";
    const blob = new Blob([file], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seasonArchive.js";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle
        kicker="History"
        title="Season Archive"
        text="Finished seasons, frozen forever — final tables and champions."
      />

      <Card className="mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">End of season? Freeze it here.</p>
            <p className="mt-1.5 text-sm leading-6 text-odcCream/55">
              Only do this when the season is finished. The button downloads a file called{" "}
              <span className="mono text-odcCream/80">seasonArchive.js</span> — the final tables, frozen. Then:{" "}
              <b className="text-odcCream/80">1.</b> go to your GitHub repo and click into the{" "}
              <span className="mono text-odcCream/80">lib</span> folder,{" "}
              <b className="text-odcCream/80">2.</b> Add file &rarr; Upload files,{" "}
              <b className="text-odcCream/80">3.</b> drag the downloaded file in and commit. The season then appears on this
              page forever. Until you do that, the file just sits in your Downloads doing nothing.
            </p>
          </div>
          <button
            onClick={snapshot}
            className="mono shrink-0 rounded-md bg-odcRed px-5 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-odcRedDeep"
          >
            Download season snapshot
          </button>
        </div>
      </Card>

      {seasonArchive.length === 0 ? (
        <Card>
          <p className="font-semibold">No archived seasons yet.</p>
          <p className="mt-1.5 text-sm text-odcCream/55">Season 4 is live — it'll be the first one in the vault.</p>
        </Card>
      ) : (
        seasonArchive.map((season) => (
          <div key={season.name} className="mb-12">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-odcCream/[0.13] pb-4">
              <h3 className="text-3xl md:text-4xl">{season.name}</h3>
              <p className="mono text-[10.5px] uppercase tracking-[0.14em] text-odcCream/40">Frozen {season.savedOn}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {Object.entries(season.tables || {}).map(([division, rows]) => (
                <Card key={division}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="display text-lg tracking-[0.03em]">{division}</p>
                    {season.champions?.[division] && (
                      <p className="mono text-[10px] uppercase tracking-[0.1em] text-odcGold">
                        ★ {season.champions[division]}
                      </p>
                    )}
                  </div>
                  <table className="num w-full">
                    <tbody>
                      {(rows || []).map((row, i) => (
                        <tr key={row.name || i} className="border-b border-odcCream/[0.06] last:border-0">
                          <td className="mono w-9 py-2 text-xs text-odcCream/45">{String(row.pos ?? i + 1).padStart(2, "0")}</td>
                          <td className={`py-2 text-[13.5px] font-semibold ${i === 0 ? "text-odcGold" : ""}`}>{row.name}</td>
                          <td className="mono py-2 text-right text-xs text-odcCream/55">{row.played ?? "-"}P</td>
                          <td className="mono py-2 pl-3 text-right text-sm font-bold">{row.points ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FixturesPage({ data }) {
  const fixtures = data.fixtures || {};
  const divisionNames = Object.keys(fixtures);

  const [selectedDivision, setSelectedDivision] = useState(divisionNames[0] || "");
  const [selectedWeek, setSelectedWeek] = useState("current");

  useEffect(() => {
    if (!fixtures[selectedDivision] && divisionNames[0]) {
      setSelectedDivision(divisionNames[0]);
    }
  }, [fixtures, selectedDivision, divisionNames]);

  const currentWeek = data.currentWeek || 1;
  const targetWeek = selectedWeek === "next" ? currentWeek + 1 : currentWeek;

  const rows = (fixtures[selectedDivision] || []).filter(
    (fixture) => Number(fixture.week) === Number(targetWeek)
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionTitle kicker={`Week ${targetWeek}`} title="Fixtures" text="View fixtures by division and week." />

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
            >
              {divisionNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-4" />
          </div>

          <div className="relative">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-56"
            >
              <option value="current">This Week (Week {currentWeek})</option>
              <option value="next">Next Week (Week {currentWeek + 1})</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-4" />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">No fixtures listed for Week {targetWeek}.</p>
          <p className="mt-2 text-odcCream/60">Fixtures will appear here once they've been added.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((fixture, index) => (
            <Card key={`${fixture.division}-${fixture.home}-${fixture.away}-${index}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/45">
                {fixture.division} • Week {fixture.week}
              </p>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="text-lg font-semibold">{fixture.home}</p>
                <p className="rounded-xl bg-odcRed px-3 py-1 text-sm font-semibold text-white">VS</p>
                <p className="text-right text-lg font-semibold">{fixture.away}</p>
              </div>
              <p className="mt-4 text-sm text-odcCream/60">
                {fixture.date ? `Scheduled: ${fixture.date}` : "Date to be confirmed"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultsPage({ data, onSelectMatch }) {
  const allResults = data.allResults || data.results || [];
  const divisionNames = Object.keys(data.tables || {});
  const [selected, setSelected] = useState(divisionNames[0] || "");

  useEffect(() => {
    if (!divisionNames.includes(selected) && divisionNames[0]) setSelected(divisionNames[0]);
  }, [divisionNames, selected]);

  const rows = allResults.filter((r) => r.division === selected);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle kicker="Results" title="Match Results" text="Browse completed league matches by division, with full player-by-player match statistics available on each result." />

        <div className="relative mb-7">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
          >
            {divisionNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-4" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">No results available for this division yet.</p>
        </Card>
      ) : (
        <ResultCards results={rows} onSelectMatch={onSelectMatch} />
      )}
    </section>
  );
}

function TablesPage({ data }) {
  const tableNames = Object.keys(data.tables);
  const [selected, setSelected] = useState(tableNames[0] || "Premier Division");

  useEffect(() => {
    if (!data.tables[selected] && tableNames[0]) setSelected(tableNames[0]);
  }, [data, selected, tableNames]);

  const rows = data.tables[selected] || [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle kicker="Standings" title="League Tables" text="Official ODC divisional standings, updated automatically from completed league matches." />
        <div className="relative mb-7">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
          >
            {tableNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-4" />
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-odcNavy">
            <tr className="text-left text-xs uppercase tracking-[0.1em] text-odcCream/55">
              <th className="p-4">#</th>
              <th className="p-4">Player</th>
              <th className="p-4">P</th>
              <th className="p-4">W</th>
              <th className="p-4">D</th>
              <th className="p-4">L</th>
              <th className="p-4">Legs</th>
              <th className="p-4">Form</th>
              <th className="p-4">Pts</th>
            </tr>
          </thead>
          <StaggerRows>
            {rows.map((row) => (
              <Row key={row.name} className="border-t border-odcCream/10">
                <td className="p-4 font-semibold text-odcRed">{row.pos}</td>
                <td className="p-4 font-semibold">{row.name}</td>
                <td className="p-4">{row.played}</td>
                <td className="p-4">{row.wins}</td>
                <td className="p-4">{row.draws || 0}</td>
                <td className="p-4">{row.losses}</td>
                <td className="p-4">{row.legs}</td>
                <td className="p-4 text-sm text-odcCream/60">{row.form}</td>
                <td className="p-4 text-xl font-semibold">{row.points}</td>
              </Row>
            ))}
          </StaggerRows>
        </table>
      </Card>
    </section>
  );
}

function DuoLeaguePage({ data }) {
  const [view, setView] = useState("tables");

  const duo = data.duoLeague || {};
  const knockout = data.knockout || {};

  const groups = duo.groups || {};
  const groupNames = Object.keys(groups).filter(
    (name) => (groups[name] || []).length > 0
  );

  const [selected, setSelected] = useState(groupNames[0] || "Group A");

  useEffect(() => {
    if (!groupNames.includes(selected) && groupNames[0]) {
      setSelected(groupNames[0]);
    }
  }, [groupNames, selected]);

  const rows = groups[selected] || [];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle
  kicker="Dynamic Duo League"
  title="Duo Championship"
  text="View group standings and the knockout bracket."
/>
        <div className="relative mb-7">
  <select
    value={view}
    onChange={(e) => setView(e.target.value)}
    className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
  >
    <option value="tables">Group Tables</option>
    <option value="knockout">Knockout Bracket</option>
  </select>

  <ChevronDown className="pointer-events-none absolute right-4 top-4" />
</div>
        
        {view === "tables" && (
          <div className="relative mb-7">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
            >
              {groupNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-4" />
          </div>
        )}
      </div>

      {view === "tables" && (
<>
{rows.length === 0 ? (
  
        <Card>
          <p className="text-lg font-semibold">No Duo League table data found.</p>
          <p className="mt-2 text-odcCream/60">The standings table could not be read from the Duo League sheet.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-odcNavy">
              <tr className="text-left text-xs uppercase tracking-[0.1em] text-odcCream/55">
                <th className="p-4">#</th>
                <th className="p-4">Team</th>
                <th className="p-4">Avg</th>
                <th className="p-4">P</th>
                <th className="p-4">W</th>
                <th className="p-4">D</th>
                <th className="p-4">L</th>
                <th className="p-4">LF</th>
                <th className="p-4">LA</th>
                <th className="p-4">LD</th>
                <th className="p-4">Pts</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${selected}-${row.team}`} className="border-t border-odcCream/10">
                  <td className="p-4 font-semibold text-odcRed">{row.rank}</td>
                  <td className="p-4 font-semibold">{row.team}</td>
                  <td className="p-4">{row.teamAvg || "-"}</td>
                  <td className="p-4">{row.played}</td>
                  <td className="p-4">{row.wins}</td>
                  <td className="p-4">{row.draws}</td>
                  <td className="p-4">{row.losses}</td>
                  <td className="p-4">{row.legsFor}</td>
                  <td className="p-4">{row.legsAgainst}</td>
                  <td className="p-4">{row.legDiff}</td>
                  <td className="p-4 text-xl font-semibold">{row.points}</td>
                  <td className="p-4">
                    {row.status ? (
                      <span className="rounded-xl bg-odcRed/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-odcRed">
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-odcCream/35">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
)}
</>
)}

      {view === "knockout" && <KnockoutBracket knockout={data.knockout} />}
    </section>
  );
}

function PlayersPage({ data, onSelectPlayer }) {
  const [query, setQuery] = useState("");
  const filtered = data.players.filter((p) =>
    `${p.name} ${p.team} ${p.division}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle kicker="Players" title="Player Profiles" text="Explore player performance cards, season records and recent match history across the ODC league." />

        <div className="relative mb-7">
          <Search className="absolute left-4 top-4 text-odcCream/35" size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player..."
            className="w-full rounded-lg border border-odcCream/15 bg-odcNavy px-11 py-4 font-bold text-odcCream outline-none placeholder:text-odcCream/35 md:w-80"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {filtered.map((p) => (
          <div key={`${p.division}-${p.name}`} className="relative">
            <button type="button" onClick={() => onSelectPlayer(p)} className="block w-full text-left">
              <Card className="h-full cursor-pointer transition hover:-translate-y-1 hover:border-odcGreen/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    <p className="text-sm text-odcCream/50">{p.division}</p>
                  </div>
                  <Target className="text-odcGreen" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SmallStat label="Avg" value={p.avg} />
                  <SmallStat label="180s" value={p.tons} />
                  <SmallStat label="High C/O" value={p.highCheckout || p.checkout} />
                  <SmallStat label="Best Leg" value={p.bestLeg || "-"} />
                </div>
              </Card>
            </button>
            <a
              href={`/player/${playerSlug(p.name)}`}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-xl border border-odcGold/30 bg-odcBlack/60 px-3 py-2 text-xs font-semibold text-odcGold transition hover:bg-odcGold hover:text-odcBlack"
            >
              ↗ Share Card
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderboardsPage({ data }) {
  const boards = useMemo(() => {
    /* Master Stats tab = the season-best numbers maintained in the sheet.
       Use it as the source of truth; fall back to match-derived stats if empty. */
    const master = Object.values(data.masterStats || {}).map((p) => ({ ...p, name: p.player }));
    const useMaster = master.some((p) => Number(p.best3DA) > 0 || Number(p.bestCheckout) > 0);

    /* Best Leg lives only in the Matches data (fewest darts, so lowest wins) */
    const bestLeg = ["Best Leg", [...data.players].filter((p) => Number(p.bestLeg) > 0).sort((a, b) => a.bestLeg - b.bestLeg), "bestLeg", Zap];

    if (useMaster) {
      return [
        ["Highest Average", [...master].sort((a, b) => b.best3DA - a.best3DA), "best3DA", Trophy],
        ["Most 180s", [...master].sort((a, b) => b.tons - a.tons), "tons", Flame],
        ["Highest Checkout", [...master].sort((a, b) => b.bestCheckout - a.bestCheckout), "bestCheckout", Medal],
        bestLeg,
      ];
    }
    return [
      ["Highest Average", [...data.players].sort((a, b) => b.avg - a.avg), "avg", Trophy],
      ["Most 180s", [...data.players].sort((a, b) => b.tons - a.tons), "tons", Flame],
      ["Highest Checkout", [...data.players].sort((a, b) => b.highCheckout - a.highCheckout), "highCheckout", Medal],
      bestLeg,
    ];
  }, [data.players, data.masterStats]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle kicker="Leaderboards" title="Season Leaderboards" text="Track the standout performances across averages, 180s, high checkouts and best legs." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boards.map(([title, list, key, Icon]) => (
          <Card key={title}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className="text-odcRed" />
              <h3 className="text-xl font-semibold">{title}</h3>
            </div>
            {list
              .filter((p) => Number(p[key]) > 0)
              .slice(0, 10)
              .map((p, i) => (
                <div key={`${title}-${p.name}-${p.division}`} className="flex items-center justify-between border-t border-odcCream/10 py-3">
                  <span className="font-bold">
                    {i + 1}. {p.name}
                  </span>
                  <span className="rounded-lg bg-odcCream/10 px-3 py-1 font-semibold">{p[key]}</span>
                </div>
              ))}
          </Card>
        ))}
      </div>
    </section>
  );
}

function MvpsPage({ data }) {
  const mvps = data.weeklyMvps || [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle kicker={`Week ${data.mvpWeek || 6}`} title="Weekly MVPs" text="Recognising the top performer from each division based on winning displays and match statistics." />

      {mvps.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">No MVPs available yet.</p>
          <p className="mt-2 text-odcCream/60">Weekly MVPs will appear here once the relevant ODC match results have been recorded.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mvps.map((mvp) => (
            <Card key={`${mvp.division}-${mvp.player}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcCream/45">{mvp.division}</p>
              <div className="mt-4 flex items-center gap-3">
                <Award className="text-odcRed" size={30} />
                <h3 className="text-2xl font-semibold">{mvp.player}</h3>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <SmallStat label="3DA" value={mvp.avg} />
                <SmallStat label="9DA" value={mvp.nineAvg} />
                <SmallStat label="High C/O" value={mvp.highCheckout} />
                <SmallStat label="180s" value={mvp.tons} />
                <SmallStat label="Best Leg" value={mvp.bestLeg} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function KnockoutBracket({ knockout }) {
  if (!knockout) return null;

  const Match = ({ match }) => (
    <Card className="min-w-[240px]">
      <div className="space-y-2">

        <div className={`flex justify-between rounded-xl p-3 ${
          match.winner === match.home
            ? "bg-odcRed/25 border border-odcRed"
            : "bg-white/5"
        }`}>
          <span className="font-semibold">
            {match.home || "TBD"}
          </span>

          <span>
            {match.homeScore}
          </span>
        </div>


        <div className={`flex justify-between rounded-xl p-3 ${
          match.winner === match.away
            ? "bg-odcRed/25 border border-odcRed"
            : "bg-white/5"
        }`}>
          <span className="font-semibold">
            {match.away || "TBD"}
          </span>

          <span>
            {match.awayScore}
          </span>
        </div>

      </div>
    </Card>
  );


  return (
    <section className="mt-10 overflow-x-auto">

      <h2 className="mb-8 text-center text-3xl font-semibold">
        🏆 Dynamic Duo Knockout
      </h2>


      <div className="flex min-w-[1000px] items-center gap-12">

        <div className="space-y-6">
          <h3 className="text-center font-semibold text-odcRed">
            Quarter Finals
          </h3>

          {knockout.quarterFinals.map((match) => (
            <Match key={match.id} match={match}/>
          ))}
        </div>


        <div className="space-y-20">
          <h3 className="text-center font-semibold text-odcRed">
            Semi Finals
          </h3>

          {knockout.semiFinals.map((match) => (
            <Match key={match.id} match={match}/>
          ))}
        </div>


        <div>
          <h3 className="text-center font-semibold text-odcRed mb-6">
            Final
          </h3>

          <Match match={knockout.final[0]} />
        </div>


        <Card className="text-center border-odcRed bg-odcRed/10">
          <Trophy
            size={48}
            className="mx-auto text-odcRed mb-3"
          />

          <p className="text-xs uppercase tracking-widest text-odcRed">
            Champion
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {knockout.champion || "TBD"}
          </h2>
        </Card>

      </div>

    </section>
  );
}

function EventsPage({ data }) {
  const events = data.events || [];
  

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle
        kicker="Events"
        title="ODC Events"
        text="Tournaments, special events and community competitions across the Online Darts Circuit."
      />

      {events.length === 0 ? (
        <Card className="max-w-2xl">
          <p className="text-lg font-semibold">No events listed yet.</p>
          <p className="mt-2 text-odcCream/60">Events will appear here once added to the sheet.</p>
          <div className="mt-5">
            <SocialButtons />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <Card key={e.name} className="flex flex-col gap-3 transition hover:-translate-y-1 hover:border-odcRed/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcRed">{e.date}</p>
                  <h3 className="mt-1 text-xl font-semibold">{e.name}</h3>
                </div>
                <CalendarDays className="shrink-0 text-odcRed" size={22} />
              </div>

              {e.format && (
                <p className="text-sm text-odcCream/60">
                  <span className="font-semibold text-odcCream/80">Format: </span>{e.format}
                </p>
              )}

              {e.prize && (
                <p className="text-sm text-odcCream/60">
                  <span className="font-semibold text-odcCream/80">Prize: </span>{e.prize}
                </p>
              )}

              {e.signUp && e.signUp.startsWith("http") ? (
                <a
                  href={e.signUp}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-odcRed px-4 py-2 text-sm font-semibold text-white"
                >
                  <ExternalLink size={15} /> Sign Up
                </a>
              ) : e.signUp ? (
                <p className="text-sm text-odcCream/60">
                  <span className="font-semibold text-odcCream/80">Sign Up: </span>{e.signUp}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [active, setActive] = useState("home");
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("loading");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    getLiveLeagueData()
      .then((liveData) => {
        setData(liveData);
        setStatus("live");
      })
      .catch((error) => {
        console.error(error);
        setData(fallbackData);
        setStatus("fallback");
      });
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-odcBlack pb-24 text-odcCream xl:pb-0">
      <Ticker results={data.allResults?.length ? data.allResults : data.results} />
      <Header active={active} setActive={setActive} />

      {status === "fallback" && (
        <div className="bg-odcRed px-4 py-2 text-center text-sm font-semibold text-white">
          Google Sheets data could not be loaded. Showing demo data.
        </div>
      )}

      <motion.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {active === "home"         && <HomePage setActive={setActive} data={data} status={status} onSelectMatch={setSelectedMatch} />}
        {active === "fixtures"     && <FixturesPage data={data} />}
        {active === "results"      && <ResultsPage data={data} onSelectMatch={setSelectedMatch} />}
        {active === "tables"       && <TablesPage data={data} />}
        {active === "duo"          && <DuoLeaguePage data={data} />}
        {active === "players"      && <PlayersPage data={data} onSelectPlayer={setSelectedPlayer} />}
        {active === "leaderboards" && <LeaderboardsPage data={data} />}
        {active === "predictions"  && <Predictions data={data} scriptUrl={PREDICTIONS_SCRIPT_URL} />}
        {active === "mvps"         && <MvpsPage data={data} />}
        {active === "events"       && <EventsPage data={data} />}
        {active === "archive"      && <ArchivePage data={data} />}
      </motion.div>

      <footer className="mono border-t border-odcCream/10 px-4 py-8 text-center text-[11px] uppercase tracking-[0.1em] text-odcCream/40">
        © ODC — Online Darts Circuit · Stats update live from the league sheet
      </footer>

      <BottomNav active={active} setActive={setActive} />
      <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      <PlayerProfile
        player={selectedPlayer}
        masterStats={data.masterStats || {}}
        matches={data.allResults || []}
        onClose={() => setSelectedPlayer(null)}
      />
    </main>
  );
}
