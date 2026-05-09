'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Users, CalendarDays, Star, ChevronDown, Search, Medal } from "lucide-react";
import { tables, players, results, events } from "../lib/sheetData";

const nav = ["Home", "Tables", "Players", "Leaderboards", "Events"];

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-odcCream/10 bg-white/5 p-5 shadow-glow backdrop-blur ${className}`}>{children}</div>;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-odcCream/10 bg-odcNavy/70 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-odcCream/60">{label}</p>
      <p className="mt-2 text-2xl font-black text-odcCream">{value}</p>
    </div>
  );
}

export default function Home() {
  const [selectedTable, setSelectedTable] = useState("Premier Division");
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((p) =>
    `${p.name} ${p.team}`.toLowerCase().includes(search.toLowerCase())
  );

  const topAverage = [...players].sort((a, b) => b.avg - a.avg);
  const top180s = [...players].sort((a, b) => b.tons - a.tons);
  const topWins = [...players].sort((a, b) => b.wins - a.wins);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#102131_0%,#050505_48%,#000_100%)] text-odcCream">
      <header className="sticky top-0 z-50 border-b border-odcCream/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="#home" className="flex items-center gap-3">
            <img src="/odc-logo.jpg" alt="ODC logo" className="h-11 w-11 rounded-full object-cover ring-2 ring-odcCream/30" />
            <div>
              <p className="text-sm font-black leading-none">ODC</p>
              <p className="text-xs text-odcCream/60">Online Darts Circuit</p>
            </div>
          </a>
          <nav className="hidden gap-6 md:flex">
            {nav.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-odcCream/70 transition hover:text-odcCream">
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-odcRed/40 bg-odcRed/10 px-4 py-2 text-sm text-odcCream/80">
            <Target size={16} /> Live league hub
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight md:text-7xl">
            The Home of <span className="text-odcRed">Competitive</span> Online Darts
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-odcCream/70">
            Tables, player stats, leaderboards, fixtures, results and nightly tournament winners — all in one clean ODC league hub.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#tables" className="rounded-2xl bg-odcRed px-6 py-3 font-bold text-white shadow-glow transition hover:scale-105">View Tables</a>
            <a href="#players" className="rounded-2xl border border-odcCream/20 px-6 py-3 font-bold text-odcCream transition hover:bg-white/10">Player Stats</a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3">
            <Stat label="Players" value="48+" />
            <Stat label="Events" value="Nightly" />
            <Stat label="Updates" value="Live" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }} className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-odcRed/20 blur-3xl" />
            <img src="/odc-logo.jpg" alt="ODC Online Darts Circuit logo" className="relative w-72 rounded-full object-cover shadow-glow ring-4 ring-odcCream/20 md:w-96" />
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {results.map((r) => (
            <Card key={`${r.home}-${r.away}`}>
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-odcCream/50">Latest Result</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{r.home}</p>
                <p className="rounded-xl bg-odcRed px-3 py-1 font-black text-white">{r.score}</p>
                <p className="font-bold">{r.away}</p>
              </div>
              <div className="mt-4 flex justify-between text-sm text-odcCream/60">
                <span>Avg: {r.avg}</span>
                <span>{r.checkout}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {["Best online darts community around.", "Clean setup, great matches, proper competitive feel.", "The nightly tournaments are quality."].map((review, idx) => (
            <Card key={review}>
              <div className="mb-4 flex gap-1 text-odcRed">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-lg font-bold">“{review}”</p>
              <p className="mt-4 text-sm text-odcCream/50">ODC Player #{idx + 1}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="tables" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-odcRed">Tables</p>
            <h2 className="text-4xl font-black">League Tables</h2>
          </div>
          <div className="relative">
            <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} className="appearance-none rounded-2xl border border-odcCream/20 bg-odcNavy px-5 py-3 pr-12 font-bold text-odcCream outline-none">
              {Object.keys(tables).map((name) => <option key={name}>{name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-3.5" size={20} />
          </div>
        </div>

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-odcNavy">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-odcCream/60">
                <th className="p-4">Pos</th>
                <th className="p-4">Name</th>
                <th className="p-4">P</th>
                <th className="p-4">W</th>
                <th className="p-4">L</th>
                <th className="p-4">Legs</th>
                <th className="p-4">Form</th>
                <th className="p-4">Pts</th>
              </tr>
            </thead>
            <tbody>
              {tables[selectedTable].map((row) => (
                <tr key={row.name} className="border-t border-odcCream/10">
                  <td className="p-4 font-black text-odcRed">{row.pos}</td>
                  <td className="p-4 font-bold">{row.name}</td>
                  <td className="p-4">{row.played}</td>
                  <td className="p-4">{row.wins}</td>
                  <td className="p-4">{row.losses}</td>
                  <td className="p-4">{row.legs}</td>
                  <td className="p-4 text-sm text-odcCream/60">{row.form}</td>
                  <td className="p-4 font-black">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="players" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-odcGreen">Players</p>
            <h2 className="text-4xl font-black">Player Stats</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-odcCream/40" size={19} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players..." className="rounded-2xl border border-odcCream/20 bg-odcNavy px-11 py-3 text-odcCream outline-none placeholder:text-odcCream/40" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {filteredPlayers.map((p) => (
            <Card key={p.name}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black">{p.name}</h3>
                  <p className="text-sm text-odcCream/50">{p.team}</p>
                </div>
                <Users className="text-odcRed" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Avg" value={p.avg} />
                <Stat label="180s" value={p.tons} />
                <Stat label="C/O %" value={p.checkout} />
                <Stat label="High C/O" value={p.highCheckout} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="leaderboards" className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-sm uppercase tracking-[0.3em] text-odcRed">Rankings</p>
        <h2 className="mb-6 text-4xl font-black">Leaderboards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Highest Average", topAverage, "avg"],
            ["Most 180s", top180s, "tons"],
            ["Most Wins", topWins, "wins"],
          ].map(([title, list, key]) => (
            <Card key={title}>
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="text-odcRed" />
                <h3 className="text-xl font-black">{title}</h3>
              </div>
              {list.slice(0, 5).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between border-t border-odcCream/10 py-3">
                  <span className="font-bold">{i + 1}. {p.name}</span>
                  <span className="rounded-lg bg-odcCream/10 px-3 py-1 font-black">{p[key]}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </section>

      <section id="events" className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-sm uppercase tracking-[0.3em] text-odcGreen">Nightly Tournaments</p>
        <h2 className="mb-6 text-4xl font-black">Event Winners</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {events.map((event) => (
            <Card key={event.title}>
              <div className="mb-5 flex items-center justify-between">
                <CalendarDays className="text-odcGreen" />
                <span className="rounded-full bg-odcGreen/20 px-3 py-1 text-xs font-bold text-odcCream">{event.date}</span>
              </div>
              <h3 className="text-2xl font-black">{event.title}</h3>
              <div className="mt-5 rounded-2xl bg-odcNavy p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-odcCream/50">Winner</p>
                <p className="mt-1 flex items-center gap-2 text-xl font-black"><Medal className="text-odcRed" /> {event.winner}</p>
              </div>
              <p className="mt-4 text-sm text-odcCream/60">Runner-up: {event.runnerUp}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-odcCream/10 px-4 py-8 text-center text-sm text-odcCream/50">
        © ODC — Online Darts Circuit. Built for live darts league stats.
      </footer>
    </main>
  );
}
