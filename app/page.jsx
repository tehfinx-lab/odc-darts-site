"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { fallbackData, getLiveLeagueData } from "../lib/sheetData";

const pages = [
  { id: "home", label: "Home", icon: Home },
  { id: "fixtures", label: "Fixtures", icon: CalendarCheck },
  { id: "results", label: "Results", icon: ClipboardList },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "duo", label: "Duo League", icon: Trophy },
  { id: "players", label: "Players", icon: Users },
  { id: "leaderboards", label: "Leaders", icon: BarChart3 },
  { id: "mvps", label: "MVPs", icon: Award },
  { id: "events", label: "Events", icon: CalendarDays },
];

const socials = [
  { label: "Discord", href: "https://discord.gg/s4GdKykCe9", icon: MessageCircle },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61581159360834", icon: Share2 },
  { label: "TikTok", href: "https://www.tiktok.com/@odccircuit", icon: ExternalLink },
];

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-odcCream/10 bg-white/[0.055] p-5 shadow-cream backdrop-blur ${className}`}>{children}</div>;
}

function SectionTitle({ kicker, title, text }) {
  return (
    <div className="mb-7">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-odcRed">{kicker}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      {text && <p className="mt-3 max-w-2xl text-sm leading-7 text-odcCream/65 md:text-base">{text}</p>}
    </div>
  );
}

function SmallStat({ label, value, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-odcCream/45">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
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
            className="inline-flex items-center gap-2 rounded-2xl border border-odcCream/15 bg-white/5 px-4 py-3 text-sm font-black text-odcCream transition hover:bg-white/10"
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
      <header className="sticky top-0 z-50 border-b border-odcCream/10 bg-black/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button onClick={() => go("home")} className="flex items-center gap-3 text-left">
            <img
              src="/odc-logo.png"
              alt="ODC logo"
              className="h-11 w-11 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.25)]"
            />
            <div>
              <p className="text-sm font-black leading-none">ODC</p>
              <p className="text-[11px] text-odcCream/55">Online Darts Circuit</p>
            </div>
          </button>

          <nav className="hidden items-center gap-2 xl:flex">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => go(p.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                  active === p.id
                    ? "bg-odcRed text-white shadow-glow"
                    : "text-odcCream/65 hover:bg-white/10 hover:text-odcCream"
                }`}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <button onClick={() => setOpen(true)} className="rounded-2xl border border-odcCream/15 p-3 xl:hidden">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur xl:hidden">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="ml-auto h-full w-[82%] max-w-sm border-l border-odcCream/10 bg-odcBlack p-5"
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/odc-logo.png" alt="ODC logo" className="h-12 w-12 object-contain" />
                <div>
                  <p className="font-black">ODC Menu</p>
                  <p className="text-xs text-odcCream/50">League hub navigation</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2">
                <X />
              </button>
            </div>

            <div className="space-y-3">
              {pages.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => go(p.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black ${
                      active === p.id ? "bg-odcRed text-white" : "bg-white/5 text-odcCream"
                    }`}
                  >
                    <Icon size={20} />
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
  const mobilePages = pages.filter((p) => ["home", "fixtures", "results", "tables", "players"].includes(p.id));

  const go = (id) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-odcCream/10 bg-black/85 px-2 py-2 backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobilePages.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              className={`rounded-2xl px-1 py-2 text-[10px] font-black ${
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

  const rows = [
    ["Legs For", match.p1Stats?.legsFor, match.p2Stats?.legsFor],
    ["Legs Against", match.p1Stats?.legsAgainst, match.p2Stats?.legsAgainst],
    ["3DA", match.p1Stats?.avg, match.p2Stats?.avg],
    ["9DA", match.p1Stats?.nineAvg, match.p2Stats?.nineAvg],
    ["High C/O", match.p1Stats?.highCheckout, match.p2Stats?.highCheckout],
    ["180s", match.p1Stats?.tons, match.p2Stats?.tons],
    ["Best Leg", match.p1Stats?.bestLeg || "-", match.p2Stats?.bestLeg || "-"],
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl rounded-3xl border border-odcCream/15 bg-odcBlack p-5 shadow-glow"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-odcRed">{match.division}</p>
            <h3 className="mt-2 text-2xl font-black">
              {match.home} vs {match.away}
            </h3>
            <p className="mt-1 text-sm text-odcCream/55">
              {match.date || "No date"} {match.week ? `• Week ${match.week}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 p-3">
            <X />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl bg-odcNavy p-5">
          <p className="text-xl font-black">{match.home}</p>
          <p className="rounded-2xl bg-odcRed px-5 py-2 text-2xl font-black text-white">{match.score}</p>
          <p className="text-right text-xl font-black">{match.away}</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-odcCream/10">
          <table className="w-full min-w-[520px]">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55">
                <th className="p-3">Stat</th>
                <th className="p-3">{match.home}</th>
                <th className="p-3">{match.away}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, p1, p2]) => (
                <tr key={label} className="border-t border-odcCream/10">
                  <td className="p-3 font-black">{label}</td>
                  <td className="p-3">{p1 || 0}</td>
                  <td className="p-3">{p2 || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function ResultCards({ results, onSelectMatch }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {results.map((r, index) => (
        <button key={r.id || `${r.home}-${r.away}-${index}`} onClick={() => onSelectMatch(r)} className="text-left">
          <Card className="h-full transition hover:-translate-y-1 hover:border-odcRed/40">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{r.division || "Match Result"}</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <p className="font-black">{r.home}</p>
              <p className="rounded-xl bg-odcRed px-3 py-1 text-lg font-black text-white">{r.score}</p>
              <p className="text-right font-black">{r.away}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-odcCream/60">
              <span>{r.home}: {r.p1Stats?.avg || "-"} avg</span>
              <span className="text-right">{r.away}: {r.p2Stats?.avg || "-"} avg</span>
              <span>{r.home}: {r.p1Stats?.highCheckout || 0} C/O</span>
              <span className="text-right">{r.away}: {r.p2Stats?.highCheckout || 0} C/O</span>
            </div>
          </Card>
        </button>
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-odcCream/15 bg-odcBlack p-5 shadow-glow"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-odcRed">{master?.division || player.division}</p>
            <h3 className="mt-2 text-3xl font-black">{player.name}</h3>
            <p className="mt-1 text-sm text-odcCream/55">Season profile, key performance records and recent match history.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 p-3">
            <X />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {statRows.map(([label, value]) => (
            <SmallStat key={label} label={label} value={value ?? "-"} />
          ))}
        </div>

        <div className="mt-8">
          <h4 className="mb-4 text-xl font-black">Recent Matches</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {playerMatches.map((m) => (
              <Card key={m.id} className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{m.division}</p>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <p className="font-black">{m.home}</p>
                  <p className="rounded-xl bg-odcRed px-3 py-1 font-black text-white">{m.score}</p>
                  <p className="text-right font-black">{m.away}</p>
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
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#123047_0%,#071723_36%,#050505_74%)]" />
        <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-odcRed/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-odcRed/35 bg-odcRed/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-odcCream/85">
              <Target size={15} /> {status === "live" ? "Live league data" : "Loading league data"}
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-7xl">
              Welcome to the <span className="text-odcRed">ODC.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-odcCream/70 md:text-lg">
              The home of competitive online darts. Follow live standings, weekly fixtures, match results, player statistics and season leaderboards across the Online Darts Circuit.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setActive("fixtures")} className="rounded-2xl bg-odcRed px-5 py-3 font-black text-white shadow-glow">
                Current Fixtures
              </button>
              <button onClick={() => setActive("tables")} className="rounded-2xl border border-odcCream/20 px-5 py-3 font-black">
                View Tables
              </button>
              <button onClick={() => setActive("duo")} className="rounded-2xl border border-odcRed/35 bg-odcRed/10 px-5 py-3 font-black text-odcCream">
                Duo League
              </button>
            </div>

            <div className="mt-5">
              <SocialButtons />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-auto flex w-full max-w-xl items-center justify-center"
          >
            <div className="absolute h-72 w-72 rounded-full bg-odcRed/10 blur-3xl md:h-96 md:w-96" />
            <img
              src="/odc-logo.png"
              alt="ODC logo"
              className="relative z-10 w-full max-w-[460px] object-contain drop-shadow-[0_0_45px_rgba(229,29,42,0.35)]"
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat label="Players" value={data.players.length} icon={Users} />
          <SmallStat label="Divisions" value={Object.keys(data.tables).length} icon={Shield} />
          <SmallStat label={`Week ${data.currentWeek || 7} Fixtures`} value={Object.values(data.fixtures || {}).flat().length} icon={CalendarCheck} />
          <SmallStat label="Updates" value={status === "live" ? "Live" : "Demo"} icon={Zap} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionTitle
          kicker="Latest Results"
          title="Recent Match Results"
          text="Review the latest completed ODC league matches and open any result for a full player-by-player breakdown."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {data.results.slice(0, 6).map((r, index) => (
            <button key={r.id || `${r.home}-${r.away}-${index}`} onClick={() => onSelectMatch(r)} className="text-left">
              <Card className="h-full transition hover:-translate-y-1 hover:border-odcRed/40">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">
                  {r.division || "Match Result"}
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <p className="font-black">{r.home}</p>
                  <p className="rounded-xl bg-odcRed px-3 py-1 text-lg font-black text-white">{r.score}</p>
                  <p className="text-right font-black">{r.away}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-odcCream/60">
                  <span>{r.home}: {r.p1Stats?.avg || "-"} avg</span>
                  <span className="text-right">{r.away}: {r.p2Stats?.avg || "-"} avg</span>
                  <span>{r.home}: {r.p1Stats?.highCheckout || 0} C/O</span>
                  <span className="text-right">{r.away}: {r.p2Stats?.highCheckout || 0} C/O</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </section>
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
              className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72"
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
              className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-56"
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
          <p className="text-lg font-black">No fixtures listed for Week {targetWeek}.</p>
          <p className="mt-2 text-odcCream/60">Fixtures will appear here once they've been added.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((fixture, index) => (
            <Card key={`${fixture.division}-${fixture.home}-${fixture.away}-${index}`}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">
                {fixture.division} • Week {fixture.week}
              </p>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="text-lg font-black">{fixture.home}</p>
                <p className="rounded-xl bg-odcRed px-3 py-1 text-sm font-black text-white">VS</p>
                <p className="text-right text-lg font-black">{fixture.away}</p>
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
            className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72"
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
          <p className="text-lg font-black">No results available for this division yet.</p>
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
            className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72"
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
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55">
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
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-odcCream/10">
                <td className="p-4 font-black text-odcRed">{row.pos}</td>
                <td className="p-4 font-black">{row.name}</td>
                <td className="p-4">{row.played}</td>
                <td className="p-4">{row.wins}</td>
                <td className="p-4">{row.draws || 0}</td>
                <td className="p-4">{row.losses}</td>
                <td className="p-4">{row.legs}</td>
                <td className="p-4 text-sm text-odcCream/60">{row.form}</td>
                <td className="p-4 text-xl font-black">{row.points}</td>
              </tr>
            ))}
          </tbody>
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
    className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72"
  >
    <option value="tables">Group Tables</option>
    <option value="knockout">Knockout Bracket</option>
  </select>

  <ChevronDown className="pointer-events-none absolute right-4 top-4" />
</div>
        
        <div className="relative mb-7">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72"
          >
            {groupNames.map((name) => (
  <option key={name} value={name}>
    {name}
  </option>
))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-4" />
        </div>
      </div>

      {view === "tables" && (
<>
{rows.length === 0 ? (
  
        <Card>
          <p className="text-lg font-black">No Duo League table data found.</p>
          <p className="mt-2 text-odcCream/60">The standings table could not be read from the Duo League sheet.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-odcNavy">
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55">
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
                  <td className="p-4 font-black text-odcRed">{row.rank}</td>
                  <td className="p-4 font-black">{row.team}</td>
                  <td className="p-4">{row.teamAvg || "-"}</td>
                  <td className="p-4">{row.played}</td>
                  <td className="p-4">{row.wins}</td>
                  <td className="p-4">{row.draws}</td>
                  <td className="p-4">{row.losses}</td>
                  <td className="p-4">{row.legsFor}</td>
                  <td className="p-4">{row.legsAgainst}</td>
                  <td className="p-4">{row.legDiff}</td>
                  <td className="p-4 text-xl font-black">{row.points}</td>
                  <td className="p-4">
                    {row.status ? (
                      <span className="rounded-xl bg-odcRed/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-odcRed">
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
            className="w-full rounded-2xl border border-odcCream/15 bg-odcNavy px-11 py-4 font-bold text-odcCream outline-none placeholder:text-odcCream/35 md:w-80"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {filtered.map((p) => (
          <button key={`${p.division}-${p.name}`} type="button" onClick={() => onSelectPlayer(p)} className="block text-left">
            <Card className="h-full cursor-pointer transition hover:-translate-y-1 hover:border-odcRed/40">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black">{p.name}</h3>
                  <p className="text-sm text-odcCream/50">{p.division}</p>
                </div>
                <Target className="text-odcRed" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <SmallStat label="Avg" value={p.avg} />
                <SmallStat label="180s" value={p.tons} />
                <SmallStat label="High C/O" value={p.highCheckout || p.checkout} />
                <SmallStat label="Best Leg" value={p.bestLeg || "-"} />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </section>
  );
}

function LeaderboardsPage({ data }) {
  const boards = useMemo(
    () => [
      ["Highest Average", [...data.players].sort((a, b) => b.avg - a.avg), "avg", Trophy],
      ["Most 180s", [...data.players].sort((a, b) => b.tons - a.tons), "tons", Flame],
      ["Highest Checkout", [...data.players].sort((a, b) => b.highCheckout - a.highCheckout), "highCheckout", Medal],
      ["Best Leg", [...data.players].filter((p) => Number(p.bestLeg) > 0).sort((a, b) => a.bestLeg - b.bestLeg), "bestLeg", Zap],
    ],
    [data.players]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle kicker="Leaderboards" title="Season Leaderboards" text="Track the standout performances across averages, 180s, high checkouts and best legs." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boards.map(([title, list, key, Icon]) => (
          <Card key={title}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className="text-odcRed" />
              <h3 className="text-xl font-black">{title}</h3>
            </div>
            {list
              .filter((p) => Number(p[key]) > 0)
              .slice(0, 10)
              .map((p, i) => (
                <div key={`${title}-${p.name}-${p.division}`} className="flex items-center justify-between border-t border-odcCream/10 py-3">
                  <span className="font-bold">
                    {i + 1}. {p.name}
                  </span>
                  <span className="rounded-lg bg-odcCream/10 px-3 py-1 font-black">{p[key]}</span>
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
          <p className="text-lg font-black">No MVPs available yet.</p>
          <p className="mt-2 text-odcCream/60">Weekly MVPs will appear here once the relevant ODC match results have been recorded.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mvps.map((mvp) => (
            <Card key={`${mvp.division}-${mvp.player}`}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{mvp.division}</p>
              <div className="mt-4 flex items-center gap-3">
                <Award className="text-odcRed" size={30} />
                <h3 className="text-2xl font-black">{mvp.player}</h3>
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
          <span className="font-black">
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
          <span className="font-black">
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

      <h2 className="mb-8 text-center text-3xl font-black">
        🏆 Dynamic Duo Knockout
      </h2>


      <div className="flex min-w-[1000px] items-center gap-12">

        <div className="space-y-6">
          <h3 className="text-center font-black text-odcRed">
            Quarter Finals
          </h3>

          {knockout.quarterFinals.map((match) => (
            <Match key={match.id} match={match}/>
          ))}
        </div>


        <div className="space-y-20">
          <h3 className="text-center font-black text-odcRed">
            Semi Finals
          </h3>

          {knockout.semiFinals.map((match) => (
            <Match key={match.id} match={match}/>
          ))}
        </div>


        <div>
          <h3 className="text-center font-black text-odcRed mb-6">
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

          <h2 className="text-2xl font-black mt-2">
            {knockout.champion || "TBD"}
          </h2>
        </Card>

      </div>

    </section>
  );
}

function EventsPage({ data }) {
  const events = data.events || [];
  const knockout = data.knockout;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle
        kicker="Events"
        title="ODC Events"
        text="Tournaments, special events and community competitions across the Online Darts Circuit."
      />

      {events.length === 0 ? (
        <Card className="max-w-2xl">
          <p className="text-lg font-black">No events listed yet.</p>
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
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-odcRed">{e.date}</p>
                  <h3 className="mt-1 text-xl font-black">{e.name}</h3>
                </div>
                <CalendarDays className="shrink-0 text-odcRed" size={22} />
              </div>

              {e.format && (
                <p className="text-sm text-odcCream/60">
                  <span className="font-black text-odcCream/80">Format: </span>{e.format}
                </p>
              )}

              {e.prize && (
                <p className="text-sm text-odcCream/60">
                  <span className="font-black text-odcCream/80">Prize: </span>{e.prize}
                </p>
              )}

              {e.signUp && e.signUp.startsWith("http") ? (
                <a
                  href={e.signUp}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-2xl bg-odcRed px-4 py-2 text-sm font-black text-white shadow-glow"
                >
                  <ExternalLink size={15} /> Sign Up
                </a>
              ) : e.signUp ? (
                <p className="text-sm text-odcCream/60">
                  <span className="font-black text-odcCream/80">Sign Up: </span>{e.signUp}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <KnockoutBracket knockout={knockout} />
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#102131_0%,#050505_42%,#000_100%)] pb-24 text-odcCream xl:pb-0">
      <Header active={active} setActive={setActive} />

      {status === "fallback" && (
        <div className="bg-odcRed px-4 py-2 text-center text-sm font-black text-white">
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
        {active === "mvps"         && <MvpsPage data={data} />}
        {active === "events"       && <EventsPage data={data} />}
      </motion.div>

      <footer className="border-t border-odcCream/10 px-4 py-8 text-center text-sm text-odcCream/45">
        © ODC — Online Darts Circuit. Competitive online darts, organised properly.
      </footer>

      <BottomNav active={active} setActive={setActive} />
      <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      <PlayerDetailsModal
        player={selectedPlayer}
        masterStats={data.masterStats || {}}
        matches={data.allResults || []}
        onClose={() => setSelectedPlayer(null)}
      />
    </main>
  );
}
