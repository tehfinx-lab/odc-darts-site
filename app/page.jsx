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
  Star,
  ChevronDown,
  Search,
  Medal,
  Home,
  Table2,
  BarChart3,
  Flame,
  Shield,
  Zap,
} from "lucide-react";
import { fallbackData, getLiveLeagueData } from "../lib/sheetData";

const pages = [
  { id: "home", label: "Home", icon: Home },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "players", label: "Players", icon: Users },
  { id: "leaderboards", label: "Leaders", icon: BarChart3 },
  { id: "events", label: "Events", icon: CalendarDays },
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
          <nav className="hidden items-center gap-2 md:flex">
            {pages.map((p) => (
              <button key={p.id} onClick={() => go(p.id)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${active === p.id ? "bg-odcRed text-white shadow-glow" : "text-odcCream/65 hover:bg-white/10 hover:text-odcCream"}`}>
                {p.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setOpen(true)} className="rounded-2xl border border-odcCream/15 p-3 md:hidden"><Menu size={22} /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur md:hidden">
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} className="ml-auto h-full w-[82%] max-w-sm border-l border-odcCream/10 bg-odcBlack p-5">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/odc-logo.jpg" alt="ODC logo" className="h-12 w-12 rounded-full object-cover" />
                <div><p className="font-black">ODC Menu</p><p className="text-xs text-odcCream/50">Jump around the league hub</p></div>
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
  const go = (id) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-odcCream/10 bg-black/85 px-2 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {pages.map((p) => {
          const Icon = p.icon;
          return <button key={p.id} onClick={() => go(p.id)} className={`rounded-2xl px-1 py-2 text-[10px] font-black ${active === p.id ? "bg-odcRed text-white" : "text-odcCream/60"}`}><Icon className="mx-auto mb-1" size={19} />{p.label}</button>;
        })}
      </div>
    </nav>
  );
}

function HomePage({ setActive, data, status }) {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#123047_0%,#071723_36%,#050505_74%)]" />
        <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-odcRed/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-odcRed/35 bg-odcRed/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-odcCream/85"><Target size={15} /> {status === "live" ? "Live Google Sheets data" : "Loading league data"}</div>
            <h1 className="text-4xl font-black tracking-tight md:text-7xl">Online Darts, <span className="text-odcRed">Done Properly.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-odcCream/70 md:text-lg">Welcome to ODC — fixtures, tables, player stats, rankings and nightly tournament winners in one clean league hub.</p>
            <div className="mt-7 flex flex-wrap gap-3"><button onClick={() => setActive("tables")} className="rounded-2xl bg-odcRed px-5 py-3 font-black text-white shadow-glow">View Tables</button><button onClick={() => setActive("players")} className="rounded-2xl border border-odcCream/20 px-5 py-3 font-black">Player Stats</button></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-sm">
            <Card className="relative overflow-hidden p-6"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,29,42,.22),transparent_58%)]" /><img src="/odc-logo.jpg" alt="ODC logo" className="relative mx-auto aspect-square w-52 rounded-full object-cover shadow-glow ring-4 ring-odcCream/15 md:w-72" /></Card>
          </motion.div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8"><div className="grid gap-3 md:grid-cols-4"><SmallStat label="Players" value={data.players.length} icon={Users} /><SmallStat label="Divisions" value={Object.keys(data.tables).length} icon={Shield} /><SmallStat label="Recent Results" value={data.results.length} icon={CalendarDays} /><SmallStat label="Updates" value={status === "live" ? "Live" : "Demo"} icon={Zap} /></div></section>
      <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker="Latest" title="Recent Results" text="Pulled from the Matches sheet." /><div className="grid gap-4 md:grid-cols-3">{data.results.slice(0, 6).map((r, index) => <Card key={`${r.home}-${r.away}-${index}`}><p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">{r.division || "Match Result"}</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><p className="font-black">{r.home}</p><p className="rounded-xl bg-odcRed px-3 py-1 text-lg font-black text-white">{r.score}</p><p className="text-right font-black">{r.away}</p></div><div className="mt-4 flex justify-between text-sm text-odcCream/60"><span>Avg {r.avg}</span><span>{r.checkout}</span></div></Card>)}</div></section>
    </div>
  );
}

function TablesPage({ data }) {
  const tableNames = Object.keys(data.tables);
  const [selected, setSelected] = useState(tableNames[0] || "Premier Division");
  useEffect(() => { if (!data.tables[selected] && tableNames[0]) setSelected(tableNames[0]); }, [data, selected, tableNames]);
  const rows = data.tables[selected] || [];
  return <section className="mx-auto max-w-7xl px-4 py-10"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><SectionTitle kicker="Tables" title="League Tables" text="Divisions are created automatically from the Matches sheet." /><div className="relative mb-7"><select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full appearance-none rounded-2xl border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-black text-odcCream outline-none md:w-72">{tableNames.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-4" /></div></div><Card className="overflow-x-auto p-0"><table className="w-full min-w-[760px] border-collapse"><thead className="bg-odcNavy"><tr className="text-left text-xs uppercase tracking-[0.22em] text-odcCream/55"><th className="p-4">#</th><th className="p-4">Player</th><th className="p-4">P</th><th className="p-4">W</th><th className="p-4">D</th><th className="p-4">L</th><th className="p-4">Legs</th><th className="p-4">Form</th><th className="p-4">Pts</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-t border-odcCream/10"><td className="p-4 font-black text-odcRed">{row.pos}</td><td className="p-4 font-black">{row.name}</td><td className="p-4">{row.played}</td><td className="p-4">{row.wins}</td><td className="p-4">{row.draws || 0}</td><td className="p-4">{row.losses}</td><td className="p-4">{row.legs}</td><td className="p-4 text-sm text-odcCream/60">{row.form}</td><td className="p-4 text-xl font-black">{row.points}</td></tr>)}</tbody></table></Card></section>;
}

function PlayersPage({ data }) {
  const [query, setQuery] = useState("");
  const filtered = data.players.filter((p) => `${p.name} ${p.team} ${p.division}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="mx-auto max-w-7xl px-4 py-10"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><SectionTitle kicker="Players" title="Player Stats" text="Built automatically from both players in every match row." /><div className="relative mb-7"><Search className="absolute left-4 top-4 text-odcCream/35" size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player..." className="w-full rounded-2xl border border-odcCream/15 bg-odcNavy px-11 py-4 font-bold text-odcCream outline-none placeholder:text-odcCream/35 md:w-80" /></div></div><div className="grid gap-4 md:grid-cols-3">{filtered.map((p) => <Card key={`${p.division}-${p.name}`}><div className="flex items-start justify-between"><div><h3 className="text-xl font-black">{p.name}</h3><p className="text-sm text-odcCream/50">{p.division}</p></div><Target className="text-odcRed" /></div><div className="mt-5 grid grid-cols-2 gap-3"><SmallStat label="Avg" value={p.avg} /><SmallStat label="180s" value={p.tons} /><SmallStat label="High C/O" value={p.highCheckout || p.checkout} /><SmallStat label="Wins" value={p.wins} /></div></Card>)}</div></section>;
}

function LeaderboardsPage({ data }) {
  const boards = useMemo(() => [
    ["Highest Average", [...data.players].sort((a, b) => b.avg - a.avg), "avg", Trophy],
    ["Most 180s", [...data.players].sort((a, b) => b.tons - a.tons), "tons", Flame],
    ["Highest Checkout", [...data.players].sort((a, b) => b.highCheckout - a.highCheckout), "highCheckout", Medal],
    ["Best Leg", [...data.players].sort((a, b) => b.bestLeg - a.bestLeg), "bestLeg", Zap],
  ], [data.players]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle kicker="Rankings" title="Leaderboards" text="Automatically calculated from every match in your Matches sheet." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boards.map(([title, list, key, Icon]) => (
          <Card key={title}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className="text-odcRed" />
              <h3 className="text-xl font-black">{title}</h3>
            </div>
            {list.filter((p) => Number(p[key]) > 0).slice(0, 10).map((p, i) => (
              <div key={`${title}-${p.name}-${p.division}`} className="flex items-center justify-between border-t border-odcCream/10 py-3">
                <span className="font-bold">{i + 1}. {p.name}</span>
                <span className="rounded-lg bg-odcCream/10 px-3 py-1 font-black">{p[key]}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </section>
  );
}


function EventsPage({ data }) {
  return <section className="mx-auto max-w-7xl px-4 py-10"><SectionTitle kicker="Events" title="Nightly Tournament Winners" text="This can be connected to an Events sheet later. For now it uses latest match winner." /><div className="grid gap-4 md:grid-cols-3">{data.events.map((event) => <Card key={event.title}><div className="mb-5 flex items-center justify-between"><CalendarDays className="text-odcGreen" /><span className="rounded-full bg-odcGreen/20 px-3 py-1 text-xs font-black">{event.date}</span></div><h3 className="text-2xl font-black">{event.title}</h3><div className="mt-5 rounded-2xl bg-odcNavy p-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-odcCream/45">Winner</p><p className="mt-2 flex items-center gap-2 text-xl font-black"><Medal className="text-odcRed" /> {event.winner}</p></div><p className="mt-4 text-sm text-odcCream/60">Runner-up: {event.runnerUp}</p></Card>)}</div></section>;
}

export default function App() {
  const [active, setActive] = useState("home");
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("loading");

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

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,#102131_0%,#050505_42%,#000_100%)] pb-24 text-odcCream md:pb-0"><Header active={active} setActive={setActive} />{status === "fallback" && <div className="bg-odcRed px-4 py-2 text-center text-sm font-black text-white">Google Sheets data could not be loaded. Showing demo data.</div>}<motion.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{active === "home" && <HomePage setActive={setActive} data={data} status={status} />}{active === "tables" && <TablesPage data={data} />}{active === "players" && <PlayersPage data={data} />}{active === "leaderboards" && <LeaderboardsPage data={data} />}{active === "events" && <EventsPage data={data} />}</motion.div><footer className="border-t border-odcCream/10 px-4 py-8 text-center text-sm text-odcCream/45">© ODC — Online Darts Circuit. Built for live league stats.</footer><BottomNav active={active} setActive={setActive} /></main>;
}
