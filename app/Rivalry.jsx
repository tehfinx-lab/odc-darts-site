"use client";

// ODC Pub Rivalry page — data from /api/rivalry (the rivalry Google Sheet).
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trophy, Flame, Target, Users, Swords, Crown } from "lucide-react";

const VIEWS = [
  { id: "standings", label: "Standings" },
  { id: "nights", label: "Nights" },
  { id: "players", label: "Player Stats" },
  { id: "teams", label: "Teams" },
];

function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-odcCream/10 bg-odcNavy p-5 ${className}`}>{children}</div>;
}

function Kicker({ children }) {
  return (
    <p className="mono flex items-center gap-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-odcCream/60">
      <span className="text-odcRed">■</span> {children}
      <span className="h-px flex-1 bg-odcCream/[0.13]" aria-hidden="true" />
    </p>
  );
}

function Select({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-odcCream/15 bg-odcNavy px-5 py-4 pr-12 font-semibold text-odcCream outline-none md:w-72"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-4" />
    </div>
  );
}

const fmtPct = (v) => (v === null || v === undefined ? "–" : `${Number(v).toFixed(v % 1 ? 1 : 0)}%`);

function StatusPill({ status }) {
  const tone =
    status === "Complete"
      ? "bg-odcGreen/15 text-odcGreenBright"
      : status === "In progress"
      ? "bg-odcRed/15 text-odcRed"
      : "bg-odcCream/10 text-odcCream/55";
  return (
    <span className={`mono rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------- hero */
function Hero({ data }) {
  const [a, b] = data.standings;
  const s = data.summary;
  if (!a || !b) return null;
  return (
    <Card className="relative overflow-hidden p-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-7 md:px-10">
        {[a, null, b].map((t, i) =>
          t === null ? (
            <div key="vs" className="text-center">
              <div className="flex items-center justify-center gap-2 font-display text-4xl font-extrabold tabular-nums md:text-6xl">
                <span>{a.points}</span>
                <span className="text-odcCream/30">–</span>
                <span>{b.points}</span>
              </div>
              <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-odcCream/50">League points</p>
            </div>
          ) : (
            <div key={t.team} className={i === 0 ? "text-left" : "text-right"}>
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-odcCream/50">
                {t.rank === 1 && t.points > 0 ? "Leading" : "Chasing"}
              </p>
              <p className="font-display text-xl font-extrabold uppercase leading-tight md:text-4xl">{t.team}</p>
              <p className="mt-1 text-sm text-odcCream/60">
                {t.won}W · {t.drawn}D · {t.lost}L
              </p>
            </div>
          )
        )}
      </div>
      <div className="grid grid-cols-2 border-t border-odcCream/10 md:grid-cols-4">
        {[
          ["Nights played", `${s.nightsPlayed} / ${s.nightsTotal}`],
          ["Legs played", s.legsPlayed],
          ["180s", s.total180s],
          ["Top finish", s.highFinish ? `${s.highFinish.finish} · ${s.highFinish.player}` : "–"],
        ].map(([k, v]) => (
          <div key={k} className="border-odcCream/10 px-5 py-4 [&:nth-child(even)]:border-l [&:nth-child(n+3)]:border-t md:[&:not(:first-child)]:border-l md:[&:nth-child(n+3)]:border-t-0">
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-odcCream/50">{k}</p>
            <p className="mt-1 truncate text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- standings */
function Standings({ data, openNight }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="bg-odcNavy">
            <tr className="text-left text-xs uppercase tracking-[0.1em] text-odcCream/55">
              {["#", "Team", "P", "W", "D", "L", "Match pts", "Legs won", "Legs lost", "Pts"].map((h) => (
                <th key={h} className="p-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.standings.map((r) => (
              <tr key={r.team} className="border-t border-odcCream/10">
                <td className="p-4 font-semibold text-odcRed">{r.rank}</td>
                <td className="p-4 font-semibold">
                  {r.rank === 1 && r.points > 0 && <Crown size={15} className="mr-2 inline text-odcRed" />}
                  {r.team}
                </td>
                <td className="p-4">{r.played}</td>
                <td className="p-4">{r.won}</td>
                <td className="p-4">{r.drawn}</td>
                <td className="p-4">{r.lost}</td>
                <td className="p-4">{r.matchPoints}</td>
                <td className="p-4">{r.legsWon}</td>
                <td className="p-4">{r.legsLost}</td>
                <td className="p-4 text-xl font-semibold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mono border-t border-odcCream/10 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-odcCream/45">
          Win 3 · Draw 1 · Loss 0 — ordered by points, then legs won · completed nights only
        </p>
      </Card>

      <div>
        <Kicker>Results by night</Kicker>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.nights.map((n) => (
            <button
              key={n.night}
              onClick={() => openNight(n.night)}
              className="rounded-xl border border-odcCream/10 bg-odcNavy p-4 text-left transition hover:border-odcRed/60"
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-odcCream/55">
                  Night {n.night}
                </span>
                <StatusPill status={n.status} />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className={`truncate font-semibold ${n.result === n.left ? "text-odcCream" : "text-odcCream/60"}`}>{n.left}</span>
                <span className="font-display text-2xl font-extrabold tabular-nums">
                  {n.status === "Not started" ? "v" : `${n.leftPoints}–${n.rightPoints}`}
                </span>
                <span className={`truncate text-right font-semibold ${n.result === n.right ? "text-odcCream" : "text-odcCream/60"}`}>{n.right}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- nights */
function Names({ list, align = "left", strong }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      {list.length ? (
        list.map((p) => (
          <p key={p} className={`break-words leading-snug ${strong ? "font-semibold text-odcCream" : "text-odcCream/65"}`}>{p}</p>
        ))
      ) : (
        <p className="text-odcCream/35">TBC</p>
      )}
    </div>
  );
}

function NightView({ data, night, setNight }) {
  const n = data.nights.find((x) => String(x.night) === String(night)) || data.nights[0];
  if (!n) return <Card>No nights found on the sheet.</Card>;
  const tons = data.players
    .filter((p) => p.s180ByNight && p.s180ByNight[n.night])
    .map((p) => ({ name: p.name, count: p.s180ByNight[n.night] }));
  const finishes = data.tonPlus.filter((f) => Number(f.night) === n.night);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Select value={String(n.night)} onChange={setNight}>
          {data.nights.map((x) => (
            <option key={x.night} value={x.night}>
              Night {x.night} — {x.status === "Complete" ? `${x.leftPoints}-${x.rightPoints}` : x.status}
            </option>
          ))}
        </Select>
        <StatusPill status={n.status} />
      </div>

      <Card className="p-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-odcCream/10 px-5 py-6">
          <div>
            <p className="font-display text-lg font-extrabold uppercase md:text-2xl">{n.left}</p>
            <p className="text-sm text-odcCream/55">{n.leftLegs} legs</p>
          </div>
          <div className="text-center font-display text-4xl font-extrabold tabular-nums md:text-5xl">
            {n.leftPoints}<span className="text-odcCream/30">–</span>{n.rightPoints}
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-extrabold uppercase md:text-2xl">{n.right}</p>
            <p className="text-sm text-odcCream/55">{n.rightLegs} legs</p>
          </div>
        </div>
        {n.result && (
          <p className="border-b border-odcCream/10 bg-odcRed/10 px-5 py-2.5 text-center text-sm font-semibold text-odcRed">
            {n.result === "Draw" ? "Night drawn" : `${n.result} win the night`}
          </p>
        )}
        <div className="divide-y divide-odcCream/10">
          {n.matches.map((m) => (
            <div key={m.label} className="px-5 py-4">
              <p className="mono mb-2 text-[10px] uppercase tracking-[0.14em] text-odcCream/45">
                {m.label}{m.format ? ` · ${m.format}` : ""}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Names list={m.left} strong={m.winner === "left"} />
                <div className="min-w-[72px] rounded-lg bg-odcBlack/60 px-3 py-1.5 text-center font-display text-xl font-extrabold tabular-nums">
                  {m.played ? (
                    <>
                      <span className={m.winner === "left" ? "text-odcRed" : ""}>{m.leftLegs}</span>
                      <span className="text-odcCream/30"> – </span>
                      <span className={m.winner === "right" ? "text-odcRed" : ""}>{m.rightLegs}</span>
                    </>
                  ) : (
                    <span className="text-odcCream/35">v</span>
                  )}
                </div>
                <Names list={m.right} align="right" strong={m.winner === "right"} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(tons.length > 0 || finishes.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mono mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-odcCream/55">
              <Flame size={14} className="text-odcRed" /> 180s on the night
            </p>
            {tons.length ? tons.map((t) => (
              <p key={t.name} className="flex justify-between py-1"><span>{t.name}</span><b>{t.count}</b></p>
            )) : <p className="text-odcCream/45">None</p>}
          </Card>
          <Card>
            <p className="mono mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-odcCream/55">
              <Target size={14} className="text-odcRed" /> Ton-plus finishes
            </p>
            {finishes.length ? finishes.map((f, i) => (
              <p key={i} className="flex justify-between py-1"><span>{f.player}</span><b>{f.finish}</b></p>
            )) : <p className="text-odcCream/45">None</p>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- players */
const PLAYER_SORTS = {
  singles: { label: "Singles", key: (p) => [p.singlesPlayed ? 1 : 0, p.singlesWinPct ?? -1, p.singlesLegPct ?? -1] },
  doubles: { label: "Doubles", key: (p) => [p.doublesPlayed ? 1 : 0, p.doublesWinPct ?? -1, p.doublesLegsWon - p.doublesLegsLost] },
  s180: { label: "180s", key: (p) => [p.s180, p.singlesWinPct ?? -1, 0] },
  finishes: { label: "Ton-plus finishes", key: (p) => [p.tonPlus, p.highFinish || 0, 0] },
};

function PlayerStats({ data }) {
  const [sort, setSort] = useState("singles");
  const [team, setTeam] = useState("all");
  const rows = useMemo(() => {
    const k = PLAYER_SORTS[sort].key;
    return data.players
      .filter((p) => team === "all" || p.team === team)
      .sort((a, b) => {
        const x = k(a), y = k(b);
        for (let i = 0; i < x.length; i++) if (y[i] !== x[i]) return y[i] - x[i];
        return a.name.localeCompare(b.name);
      });
  }, [data.players, sort, team]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={sort} onChange={setSort}>
          {Object.entries(PLAYER_SORTS).map(([id, s]) => (
            <option key={id} value={id}>Sort: {s.label}</option>
          ))}
        </Select>
        <Select value={team} onChange={setTeam}>
          <option value="all">Both teams</option>
          {data.teams.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </Select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-odcNavy">
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-odcCream/55">
              <th className="p-3">#</th>
              <th className="p-3">Player</th>
              <th className="p-3">Team</th>
              <th className="p-3 text-center" colSpan={4}>Singles</th>
              <th className="p-3 text-center" colSpan={3}>Doubles</th>
              <th className="p-3 text-center">180s</th>
              <th className="p-3 text-center">100+ CO</th>
              <th className="p-3 text-center">Best CO</th>
            </tr>
            <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-odcCream/40">
              <th /><th /><th />
              <th className="px-3 pb-2 text-center">P</th>
              <th className="px-3 pb-2 text-center">W-L</th>
              <th className="px-3 pb-2 text-center">Legs</th>
              <th className="px-3 pb-2 text-center">Leg %</th>
              <th className="px-3 pb-2 text-center">P</th>
              <th className="px-3 pb-2 text-center">W-L</th>
              <th className="px-3 pb-2 text-center">Legs</th>
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.name} className="border-t border-odcCream/10">
                <td className="p-3 font-semibold text-odcRed">{i + 1}</td>
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3 text-odcCream/60">{p.team}</td>
                <td className="p-3 text-center">{p.singlesPlayed || "–"}</td>
                <td className="p-3 text-center">{p.singlesPlayed ? `${p.singlesWon}-${p.singlesLost}` : "–"}</td>
                <td className="p-3 text-center">{p.singlesPlayed ? `${p.singlesLegsWon}-${p.singlesLegsLost}` : "–"}</td>
                <td className="p-3 text-center font-semibold">{fmtPct(p.singlesLegPct)}</td>
                <td className="p-3 text-center">{p.doublesPlayed || "–"}</td>
                <td className="p-3 text-center">{p.doublesPlayed ? `${p.doublesWon}-${p.doublesLost}` : "–"}</td>
                <td className="p-3 text-center">{p.doublesPlayed ? `${p.doublesLegsWon}-${p.doublesLegsLost}` : "–"}</td>
                <td className="p-3 text-center">{p.s180 || "–"}</td>
                <td className="p-3 text-center">{p.tonPlus || "–"}</td>
                <td className="p-3 text-center font-semibold">{p.highFinish || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mono mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-odcCream/55">
            <Flame size={14} className="text-odcRed" /> 180 leaders
          </p>
          {data.players.filter((p) => p.s180).sort((a, b) => b.s180 - a.s180).slice(0, 8).map((p) => (
            <p key={p.name} className="flex justify-between border-t border-odcCream/5 py-1.5 first:border-0">
              <span>{p.name} <span className="text-odcCream/45">· {p.team}</span></span><b>{p.s180}</b>
            </p>
          ))}
          {!data.players.some((p) => p.s180) && <p className="text-odcCream/45">No 180s yet</p>}
        </Card>
        <Card>
          <p className="mono mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-odcCream/55">
            <Target size={14} className="text-odcRed" /> Ton-plus finishes
          </p>
          {data.tonPlus.slice(0, 10).map((f, i) => (
            <p key={i} className="flex justify-between border-t border-odcCream/5 py-1.5 first:border-0">
              <span>{f.player} <span className="text-odcCream/45">· Night {f.night ?? "?"}</span></span><b>{f.finish}</b>
            </p>
          ))}
          {!data.tonPlus.length && <p className="text-odcCream/45">No ton-plus finishes yet</p>}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- teams */
function Teams({ data }) {
  const byName = Object.fromEntries(data.players.map((p) => [p.name.toLowerCase(), p]));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.teams.map((t) => {
        const st = data.standings.find((s) => s.team === t.name);
        return (
          <Card key={t.name} className="p-0">
            <div className="border-b border-odcCream/10 px-5 py-5">
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-odcCream/50">
                {st ? `${st.rank === 1 ? "1st" : "2nd"} · ${st.points} pts` : "Team"}
              </p>
              <p className="font-display text-2xl font-extrabold uppercase">{t.name}</p>
              {t.captain && <p className="text-sm text-odcCream/60">Captain: <b className="text-odcCream">{t.captain}</b></p>}
            </div>
            <div className="divide-y divide-odcCream/10">
              {t.players.map((p) => {
                const s = byName[p.name.toLowerCase()] || {};
                return (
                  <div key={p.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="mono w-5 text-xs text-odcCream/40">{p.slot}</span>
                      <span className="font-semibold">{p.name}</span>
                      {/captain/i.test(p.role) && (
                        <span className="mono rounded bg-odcRed/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-odcRed">C</span>
                      )}
                    </div>
                    <span className="mono text-[11px] text-odcCream/55">
                      S {s.singlesWon || 0}-{s.singlesLost || 0} · D {s.doublesWon || 0}-{s.doublesLost || 0}
                      {s.s180 ? ` · ${s.s180}×180` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- page */
export default function Rivalry() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("standings");
  const [night, setNight] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/rivalry")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d.ok) throw new Error(d.error || "Could not read the rivalry sheet");
        setData(d);
        setNight(String(d.summary.latestNight || d.nights[0]?.night || 1));
      })
      .catch((e) => alive && setError(String(e.message || e)));
    return () => { alive = false; };
  }, []);

  const openNight = (n) => {
    setNight(String(n));
    setView("nights");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <Kicker>ODC Pub Rivalry</Kicker>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none md:text-6xl">
            <Swords className="mr-3 inline -translate-y-1 text-odcRed" size={40} />
            Pub Rivalry
          </h2>
          <p className="mt-3 max-w-xl text-odcCream/60">
            Seven-a-side, two teams, {data?.summary.nightsTotal || 6} nights. Four singles and two doubles each night.
          </p>
        </div>
        <Select value={view} onChange={setView}>
          {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </Select>
      </div>

      {error && (
        <Card>
          <p className="text-lg font-semibold">Pub Rivalry data couldn't be loaded.</p>
          <p className="mt-2 text-odcCream/60">{error}</p>
        </Card>
      )}
      {!data && !error && <Card className="animate-pulse text-odcCream/50">Loading the rivalry…</Card>}

      {data && (
        <div className="space-y-6">
          <Hero data={data} />
          {view === "standings" && <Standings data={data} openNight={openNight} />}
          {view === "nights" && <NightView data={data} night={night} setNight={setNight} />}
          {view === "players" && <PlayerStats data={data} />}
          {view === "teams" && <Teams data={data} />}
        </div>
      )}
    </section>
  );
}
