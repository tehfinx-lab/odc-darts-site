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
} from "lucide-react";
import { fallbackData, getLiveLeagueData } from "../lib/sheetData";

const pages = [
  { id: "home", label: "Home", icon: Home },
  { id: "fixtures", label: "Fixtures", icon: CalendarCheck },
  { id: "tables", label: "Tables", icon: Table2 },
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
          <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-odcCream/15 bg-white/5 px-4 py-3 text-sm font-black text-odcCream transition hover:bg-white/10">
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
            <img src="/odc-logo.jpg" alt="ODC logo" className="h-11 w-11 rounded-full object-cover ring-2 ring-odcCream/20" />
            <div>
              <p className="text-sm font-black leading-none">ODC</p>
              <p className="text-[11px] text-odcCream/55">Online Darts Circuit</p>
            </div>
          </button>
          <nav className="hidden items-center gap-2 lg:flex">
            {pages.map((p) => (
              <button key={p.id} onClick={() => go(p.id)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${active === p.id ? "bg-odcRed text-white shadow-glow" : "text-odcCream/65 hover:bg-white/10 hover:text-odcCream"}`}>
                {p.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setOpen(true)} className="rounded-2xl border border-odcCream/15 p-3 lg:hidden"><Menu size={22} /></button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur lg:hidden">
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} className="ml-auto h-full w-[82%] max-w-sm border-l border-odcCream/10 bg-odcBlack p-5">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/odc-logo.jpg" alt="ODC logo" className="h-12 w-12 rounded-full object-cover" />
                <div><p className="font-black">ODC Menu</p><p className="text-xs text-odcCream/50">League hub navigation</p></div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2"><X /></button>
            </div>
            <div className="space-y-3">
              {pages.map((p) => {
                const Icon = p.icon;
                return <button key={p.id} onClick={() => go(p.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black ${active === p.id ? "bg-odcRed text-white" : "bg-white/5 text-odcCream"}`}><Icon size={20} />{p.label}</button>;
              })}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function BottomNav({ active, setActive }) {
  const mobilePages = pages.filter((p) => ["home", "fixtures", "tables", "leaderboards", "mvps"].includes(p.id));
  const go = (id) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-odcCream/10 bg-black/85 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobilePages.map((p) => {
          const Icon = p.icon;
          return <button key={p.id} onClick={() => go(p.id)} className={`rounded-2xl px-1 py-2 text-[10px] font-black ${active === p.id ? "bg-odcRed text-white" : "text-odcCream/60"}`}><Icon className="mx-auto mb-1" size={19} />{p.label}</button>;
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
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-3xl rounded-3xl border border-odcCream/15 bg-odcBlack p-5 shadow-glow">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.3em] text-odcRed">{match.division}</p><h3 className="mt-2 text-2xl font-black">{match.home} vs {match.away}</h3><p className="mt-1 text-sm text-odcCream/55">{match.date || "No date"} {match.week ? `• Week ${match.week}` : ""}</p></div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 p-3"><X /></button>
        </div>
        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl bg-odcNavy p-5"><p className="text-xl font-black">{match.home}</p><p className="rounded-2xl bg-odcRed px-5 py-2 text-2xl font-black text-white">{match.score}</p><p className="text-right text-xl font-black">{match.away}</p></div>
        <div className="overflow-x-auto rounded-2xl border border-odcCream/10"><table className="w-full min-w-[520px]"><thead className="bg-white/5"><tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55"><th className="p-3">Stat</th><th className="p-3">{match.home}</th><th className="p-3">{match.away}</th></tr></thead><tbody>{rows.map(([label, p1, p2]) => <tr key={label} className="border-t border-odcCream/10"><td className="p-3 font-black">{label}</td><td className="p-3">{p1 || 0}</td><td className="p-3">{p2 || 0}</td></tr>)}</tbody></table></div>
      </motion.div>
    </div>
  );
}

function HomePage({ setActive, data, status, onSelectMatch }) {
  return (
    <div>
      <section className="relative overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#123047_0%,#071723_36%,#050505_74%)]" /><div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-odcRed/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-odcRed/35 bg-odcRed/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-odcCream/85"><Target size={15} /> {status === "live" ? "Live league data" : "Loading league data"}</div>
            <h1 className="text-4xl font-black tracking-tight md:text-7xl">Online Darts, <span className="text-odcRed">Done Properly.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-odcCream/70 md:text-lg">Online Darts Circuit brings fixtures, results, tables, leaderboards and weekly awards together in one competitive league hub.</p>
            <div className="mt-7 flex flex-wrap gap-3"><button onClick={() => setActive("fixtures")} className="rounded-2xl bg-odcRed px-5 py-3 font-black text-white shadow-glow">Current Fixtures</button><button onClick={() => setActive("tables")} className="rounded-2xl border border-odcCream/20 px-5 py-3 font-black">View Tables</button></div>
            <div className="mt-5"><SocialButtons /></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-sm">
            <Card className="relative overflow-hidden p-2"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,29,42,.22),transparent_58%)]" /><img src="/odc-logo.jpg" alt="ODC logo" className="relative mx-auto aspect-square w-full rounded-full object-cover shadow-glow ring-4 ring-odcCream/15" /></Card>
          </motion.div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8"><div className="grid gap-3 md:grid-cols-4"><SmallStat label="Players" value={data.players.length} icon={Users} /><SmallStat label="Divisions" value={Object.keys(data.tables).length} icon={Shield} /><SmallStat label={`Week ${data.currentWeek || 7} Fixtures`} value={Object.values(data.fixtures || {}).flat().length} icon={CalendarCheck} /><SmallStat label="Updates" value={status === "live" ? "Live" : "Demo"} icon={Zap} /></div></section>
      <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker="Latest Results" title="Recent Match Results" text="Click any result to view the full match breakdown for both players." /><div className="grid gap-4 md:grid-cols-3">{data.results.slice(0, 6).map((r, index) => <button key={r.id || `${r.home}-${r.away}-${index}`} onClick={() => onSelectMatch(r)} className="text-left"><Card className="h-full transition hover:-translate-y-1 hover:border-odcRed/40"><p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{r.division || "Match Result"}</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><p className="font-black">{r.home}</p><p className="rounded-xl bg-odcRed px-3 py-1 text-lg font-black text-white">{r.score}</p><p className="text-right font-black">{r.away}</p></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm text-odcCream/60"><span>{r.home}: {r.p1Stats?.avg || "-"} avg</span><span className="text-right">{r.away}: {r.p2Stats?.avg || "-"} avg</span><span>{r.home}: {r.p1Stats?.highCheckout || 0} C/O</span><span className="text-right">{r.away}: {r.p2Stats?.highCheckout || 0} C/O</span></div></Card></button>)}</div></section>
    </div>
  );
}

function FixturesPage({ data }) {
  const fixtures = data.fixtures || {};
  const divisionNames = Object.keys(fixtures);
  const [selected, setSelected] = useState(divisionNames[0] || "");
  useEffect(() => { if (!fixtures[selected] && divisionNames[0]) setSelected(divisionNames[0]); }, [fixtures, selected, divisionNames]);
  const rows = fixtures[selected] || [];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><SectionTitle kicker={`Week ${data.currentWeek || 7}`} title="Current Fixtures" text="Fixtures are filtered to the current game week and grouped by division." /><div className="relative mb-7"><select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72">{divisionNames.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-4" /></div></div>
      {rows.length === 0 ? <Card><p className="text-lg font-black">No fixtures found for this week.</p><p className="mt-2 text-odcCream/60">Check the Fixtures tab has Week {data.currentWeek || 7}, Division, Home and Away filled in.</p></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((fixture, index) => <Card key={`${fixture.division}-${fixture.home}-${fixture.away}-${index}`}><p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{fixture.division}</p><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><p className="text-lg font-black">{fixture.home}</p><p className="rounded-xl bg-odcRed px-3 py-1 text-sm font-black text-white">VS</p><p className="text-right text-lg font-black">{fixture.away}</p></div><p className="mt-4 text-sm text-odcCream/60">{fixture.date ? `Scheduled: ${fixture.date}` : "Date to be confirmed"}</p></Card>)}</div>}
    </section>
  );
}

function TablesPage({ data }) {
  const tableNames = Object.keys(data.tables);
  const [selected, setSelected] = useState(tableNames[0] || "Premier Division");
  useEffect(() => { if (!data.tables[selected] && tableNames[0]) setSelected(tableNames[0]); }, [data, selected, tableNames]);
  const rows = data.tables[selected] || [];
  return <section className="mx-auto max-w-7xl px-4 py-10"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><SectionTitle kicker="Standings" title="League Tables" text="Tables update automatically from completed matches, using two points for a win and one point for a draw." /><div className="relative mb-7"><select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72">{tableNames.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-4" /></div></div><Card className="overflow-x-auto p-0"><table className="w-full min-w-[760px] border-collapse"><thead className="bg-odcNavy"><tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55"><th className="p-4">#</th><th className="p-4">Player</th><th className="p-4">P</th><th className="p-4">W</th><th className="p-4">D</th><th className="p-4">L</th><th className="p-4">Legs</th><th className="p-4">Form</th><th className="p-4">Pts</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-t border-odcCream/10"><td className="p-4 font-black text-odcRed">{row.pos}</td><td className="p-4 font-black">{row.name}</td><td className="p-4">{row.played}</td><td className="p-4">{row.wins}</td><td className="p-4">{row.draws || 0}</td><td className="p-4">{row.losses}</td><td className="p-4">{row.legs}</td><td className="p-4 text-sm text-odcCream/60">{row.form}</td><td className="p-4 text-xl font-black">{row.points}</td></tr>)}</tbody></table></Card></section>;
}

function PlayersPage({ data }) {
  const [query, setQuery] = useState("");
  const filtered = data.players.filter((p) => `${p.name} ${p.team} ${p.division}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="mx-auto max-w-7xl px-4 py-10"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><SectionTitle kicker="Players" title="Player Stats" text="Player cards are calculated from every completed match in the Results sheet." /><div className="relative mb-7"><Search className="absolute left-4 top-4 text-odcCream/35" size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player..." className="w-full rounded-2xl border border-odcCream/15 bg-odcNavy px-11 py-4 font-bold text-odcCream outline-none placeholder:text-odcCream/35 md:w-80" /></div></div><div className="grid gap-4 md:grid-cols-3">{filtered.map((p) => <Card key={`${p.division}-${p.name}`}><div className="flex items-start justify-between"><div><h3 className="text-xl font-black">{p.name}</h3><p className="text-sm text-odcCream/50">{p.division}</p></div><Target className="text-odcRed" /></div><div className="mt-5 grid grid-cols-2 gap-3"><SmallStat label="Avg" value={p.avg} /><SmallStat label="180s" value={p.tons} /><SmallStat label="High C/O" value={p.highCheckout || p.checkout} /><SmallStat label="Best Leg" value={p.bestLeg || "-"} /></div></Card>)}</div></section>;
}

function LeaderboardsPage({ data }) {
  const boards = useMemo(() => [["Highest Average", [...data.players].sort((a, b) => b.avg - a.avg), "avg", Trophy], ["Most 180s", [...data.players].sort((a, b) => b.tons - a.tons), "tons", Flame], ["Highest Checkout", [...data.players].sort((a, b) => b.highCheckout - a.highCheckout), "highCheckout", Medal], ["Best Leg", [...data.players].filter((p) => Number(p.bestLeg) > 0).sort((a, b) => a.bestLeg - b.bestLeg), "bestLeg", Zap]], [data.players]);
  return <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker="Leaderboards" title="Performance Rankings" text="The top performers across averages, 180s, high checkouts and best legs." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{boards.map(([title, list, key, Icon]) => <Card key={title}><div className="mb-4 flex items-center gap-2"><Icon className="text-odcRed" /><h3 className="text-xl font-black">{title}</h3></div>{list.filter((p) => Number(p[key]) > 0).slice(0, 10).map((p, i) => <div key={`${title}-${p.name}-${p.division}`} className="flex items-center justify-between border-t border-odcCream/10 py-3"><span className="font-bold">{i + 1}. {p.name}</span><span className="rounded-lg bg-odcCream/10 px-3 py-1 font-black">{p[key]}</span></div>)}</Card>)}</div></section>;
}

function MvpsPage({ data }) {
  const mvps = data.weeklyMvps || [];
  return <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker={`Week ${data.currentWeek || 7}`} title="Weekly MVPs" text="One MVP is selected per division using the same ranking logic as the Discord bot: winners only, ranked by 3DA, 9DA, high checkout, 180s and best leg." />{mvps.length === 0 ? <Card><p className="text-lg font-black">No MVPs found for this week yet.</p><p className="mt-2 text-odcCream/60">MVPs appear once completed Week {data.currentWeek || 7} results are added to the Matches sheet.</p></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mvps.map((mvp) => <Card key={`${mvp.division}-${mvp.player}`}><p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{mvp.division}</p><div className="mt-4 flex items-center gap-3"><Award className="text-odcRed" size={30} /><h3 className="text-2xl font-black">{mvp.player}</h3></div><div className="mt-5 grid grid-cols-2 gap-3"><SmallStat label="3DA" value={mvp.avg} /><SmallStat label="9DA" value={mvp.nineAvg} /><SmallStat label="High C/O" value={mvp.highCheckout} /><SmallStat label="180s" value={mvp.tons} /><SmallStat label="Best Leg" value={mvp.bestLeg} /></div></Card>)}</div>}</section>;
}

function EventsPage() {
  return <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker="Events" title="Tournament Winners" text="This section is reserved for nightly tournaments and special ODC events." /><Card className="max-w-2xl"><h3 className="text-2xl font-black">Events data not connected yet</h3><p className="mt-3 text-odcCream/65">Once an Events sheet is added, this page can show winners, runners-up and event history automatically.</p><div className="mt-5"><SocialButtons /></div></Card></section>;
}

export default function App() {
  const [active, setActive] = useState("home");
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("loading");
  const [selectedMatch, setSelectedMatch] = useState(null);

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

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,#102131_0%,#050505_42%,#000_100%)] pb-24 text-odcCream lg:pb-0"><Header active={active} setActive={setActive} />{status === "fallback" && <div className="bg-odcRed px-4 py-2 text-center text-sm font-black text-white">Google Sheets data could not be loaded. Showing demo data.</div>}<motion.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{active === "home" && <HomePage setActive={setActive} data={data} status={status} onSelectMatch={setSelectedMatch} />}{active === "fixtures" && <FixturesPage data={data} />}{active === "tables" && <TablesPage data={data} />}{active === "players" && <PlayersPage data={data} />}{active === "leaderboards" && <LeaderboardsPage data={data} />}{active === "mvps" && <MvpsPage data={data} />}{active === "events" && <EventsPage />}</motion.div><footer className="border-t border-odcCream/10 px-4 py-8 text-center text-sm text-odcCream/45">© ODC — Online Darts Circuit. Built for competitive online darts.</footer><BottomNav active={active} setActive={setActive} /><MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} /></main>;
}
