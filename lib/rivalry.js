// ODC Pub Rivalry — reads the whole rivalry workbook in ONE request (xlsx export)
// and turns it into standings, nights, player stats and team sheets.
// The sheet must be shared as "Anyone with the link can view".
//
// Everything is worked out from the raw entries (team sheets, night scores,
// 180s grid, ton-plus log) so the site never depends on the sheet's layout of
// its summary tables. Rules match the sheet:
//   - a match winner takes 1 match point; most match points wins the night
//   - night win = 3 league points, draw = 1, loss = 0
//   - table order: league points, then legs won (singles + doubles)
//   - only fully completed nights count

import * as XLSX from "xlsx";

export const RIVALRY_SHEET_ID = "1vwlsyTtQojfASp6AVVLQgu56PZUs_AWRrjEAVnw75ZQ";
const MAX_NIGHTS = 20;
const WIN_PTS = 3;
const DRAW_PTS = 1;

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const low = (v) => clean(v).toLowerCase();
const num = (v) => {
  const s = clean(v);
  if (s === "") return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

function rowsOf(wb, name) {
  const key = wb.SheetNames.find((n) => low(n) === low(name));
  if (!key) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[key], { header: 1, raw: false, defval: "", blankrows: true });
}

// value in the cell to the right of a label, anywhere in the sheet
function labelValue(rows, label, offset = 1) {
  for (const r of rows) {
    const i = r.findIndex((c) => low(c) === low(label));
    if (i >= 0) return clean(r[i + offset]);
  }
  return "";
}

function findRow(rows, test, from = 0) {
  for (let i = from; i < rows.length; i++) if (test(rows[i] || [])) return i;
  return -1;
}

function parseTeam(rows, fallbackName) {
  if (!rows) return null;
  const name = labelValue(rows, "Team name") || fallbackName;
  const captain = labelValue(rows, "Captain");
  const head = findRow(rows, (r) => low(r[0]) === "slot" && low(r[1]) === "player");
  const players = [];
  if (head >= 0) {
    for (let i = head + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      if (num(r[0]) === null) break;
      const p = clean(r[1]);
      if (p) players.push({ slot: num(r[0]), name: p, role: clean(r[2]) || "Player" });
    }
  }
  return { name, captain, players };
}

function parseNight(rows, n) {
  if (!rows) return null;
  const left = labelValue(rows, "Left team");
  const right = labelValue(rows, "Right team");
  const sheetStatus = labelValue(rows, "Night status");
  const head = findRow(rows, (r) => low(r[0]) === "match" && low(r[1]).startsWith("left player"));
  const matches = [];
  if (head >= 0) {
    for (let i = head + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const label = clean(r[0]);
      if (!label) break;
      const ll = num(r[3]);
      const rl = num(r[4]);
      const played = ll !== null && rl !== null;
      const isDoubles = /double/i.test(label) || !!clean(r[2]) || !!clean(r[6]);
      const [title, format] = label.split("·").map(clean);
      matches.push({
        label: title || label,
        format: format || "",
        type: isDoubles ? "doubles" : "singles",
        left: [clean(r[1]), clean(r[2])].filter(Boolean),
        right: [clean(r[5]), clean(r[6])].filter(Boolean),
        leftLegs: ll,
        rightLegs: rl,
        played,
        winner: !played ? null : ll > rl ? "left" : rl > ll ? "right" : "draw",
      });
    }
  }
  const playedCount = matches.filter((m) => m.played).length;
  const complete = matches.length > 0 && playedCount === matches.length;
  const leftPts = matches.filter((m) => m.winner === "left").length;
  const rightPts = matches.filter((m) => m.winner === "right").length;
  const leftLegs = matches.reduce((s, m) => s + (m.leftLegs || 0), 0);
  const rightLegs = matches.reduce((s, m) => s + (m.rightLegs || 0), 0);
  const status = complete ? "Complete" : playedCount > 0 ? "In progress" : sheetStatus || "Not started";
  return {
    night: n,
    left,
    right,
    status,
    complete,
    leftPoints: leftPts,
    rightPoints: rightPts,
    leftLegs,
    rightLegs,
    result: !complete ? null : leftPts > rightPts ? left : rightPts > leftPts ? right : "Draw",
    matches,
  };
}

function parse180s(rows) {
  const out = {}; // player -> { total, byNight: {n: count} }
  if (!rows) return out;
  const head = findRow(rows, (r) => r.some((c) => low(c) === "night 1") && r.some((c) => low(c) === "player"));
  if (head < 0) return out;
  const h = rows[head];
  const pCol = h.findIndex((c) => low(c) === "player");
  const nightCols = h.map((c, i) => [i, /^night\s*(\d+)$/i.exec(clean(c))]).filter(([, m]) => m);
  for (let i = head + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const p = clean(r[pCol]);
    if (!p) continue;
    const byNight = {};
    let total = 0;
    for (const [col, m] of nightCols) {
      const v = num(r[col]);
      if (v) {
        byNight[m[1]] = v;
        total += v;
      }
    }
    out[low(p)] = { name: p, total, byNight };
  }
  return out;
}

function parseTonPlus(rows) {
  const out = [];
  if (!rows) return out;
  // the log on the right: Entry | Player | Team | Finish | Night
  const head = findRow(rows, (r) => r.some((c) => low(c) === "entry"));
  if (head < 0) return out;
  const h = rows[head];
  const e = h.findIndex((c) => low(c) === "entry");
  for (let i = head + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const player = clean(r[e + 1]);
    const finish = num(r[e + 3]);
    if (!player || !finish) continue;
    out.push({ player, team: clean(r[e + 2]), finish, night: num(r[e + 4]) });
  }
  return out.sort((a, b) => b.finish - a.finish);
}

export function buildRivalry(wb) {
  const t1 = parseTeam(rowsOf(wb, "Team 1"), "Team 1");
  const t2 = parseTeam(rowsOf(wb, "Team 2"), "Team 2");
  const teams = [t1, t2].filter(Boolean);
  const teamOf = {};
  for (const t of teams) for (const p of t.players) teamOf[low(p.name)] = t.name;

  const nights = [];
  for (let n = 1; n <= MAX_NIGHTS; n++) {
    const night = parseNight(rowsOf(wb, `Night ${n}`), n);
    if (night) nights.push(night);
  }

  // ---- league table
  const table = {};
  const row = (name) =>
    (table[name] ||= { team: name, played: 0, won: 0, drawn: 0, lost: 0, points: 0, matchPoints: 0, legsWon: 0, legsLost: 0 });
  teams.forEach((t) => row(t.name));
  for (const n of nights) {
    if (!n.complete || !n.left || !n.right) continue;
    const L = row(n.left);
    const R = row(n.right);
    L.played++; R.played++;
    L.matchPoints += n.leftPoints; R.matchPoints += n.rightPoints;
    L.legsWon += n.leftLegs; L.legsLost += n.rightLegs;
    R.legsWon += n.rightLegs; R.legsLost += n.leftLegs;
    if (n.leftPoints > n.rightPoints) { L.won++; R.lost++; L.points += WIN_PTS; }
    else if (n.rightPoints > n.leftPoints) { R.won++; L.lost++; R.points += WIN_PTS; }
    else { L.drawn++; R.drawn++; L.points += DRAW_PTS; R.points += DRAW_PTS; }
  }
  const order = teams.map((t) => t.name);
  const standings = Object.values(table)
    .sort((a, b) => b.points - a.points || b.legsWon - a.legsWon || order.indexOf(a.team) - order.indexOf(b.team))
    .map((r, i) => ({ ...r, rank: i + 1, legDiff: r.legsWon - r.legsLost }));

  // ---- player stats (completed AND in-progress matches that have a score)
  const tons = parse180s(rowsOf(wb, "180s"));
  const tonPlus = parseTonPlus(rowsOf(wb, "Ton Plus Finishes"));
  const players = {};
  const P = (name) =>
    (players[low(name)] ||= {
      name, team: teamOf[low(name)] || "",
      singlesPlayed: 0, singlesWon: 0, singlesLost: 0, singlesDrawn: 0, singlesLegsWon: 0, singlesLegsLost: 0,
      doublesPlayed: 0, doublesWon: 0, doublesLost: 0, doublesLegsWon: 0, doublesLegsLost: 0,
      s180: 0, tonPlus: 0, highFinish: null,
    });
  teams.forEach((t) => t.players.forEach((p) => P(p.name)));
  for (const n of nights) {
    for (const m of n.matches) {
      if (!m.played) continue;
      for (const side of ["left", "right"]) {
        const mine = side === "left" ? m.leftLegs : m.rightLegs;
        const theirs = side === "left" ? m.rightLegs : m.leftLegs;
        for (const who of m[side]) {
          const p = P(who);
          if (!p.team) p.team = side === "left" ? n.left : n.right;
          const k = m.type === "doubles" ? "doubles" : "singles";
          p[`${k}Played`]++;
          p[`${k}LegsWon`] += mine;
          p[`${k}LegsLost`] += theirs;
          if (m.winner === side) p[`${k}Won`]++;
          else if (m.winner === "draw") { if (k === "singles") p.singlesDrawn++; }
          else p[`${k}Lost`]++;
        }
      }
    }
  }
  for (const t of Object.values(tons)) {
    const p = P(t.name);
    p.s180 = t.total;
    p.s180ByNight = t.byNight;
  }
  for (const f of tonPlus) {
    const p = P(f.player);
    p.tonPlus++;
    p.highFinish = Math.max(p.highFinish || 0, f.finish);
    if (!f.team) f.team = p.team;
  }
  const playerList = Object.values(players).map((p) => ({
    ...p,
    singlesLegPct: pct(p.singlesLegsWon, p.singlesLegsWon + p.singlesLegsLost),
    singlesWinPct: pct(p.singlesWon, p.singlesPlayed),
    doublesWinPct: pct(p.doublesWon, p.doublesPlayed),
  }));

  // same order as the sheet's Singles tab: win %, then leg %, no singles last
  const singles = [...playerList].sort((a, b) => {
    if (!a.singlesPlayed !== !b.singlesPlayed) return a.singlesPlayed ? -1 : 1;
    return (b.singlesWinPct ?? -1) - (a.singlesWinPct ?? -1) || (b.singlesLegPct ?? -1) - (a.singlesLegPct ?? -1) || a.name.localeCompare(b.name);
  });

  const completeNights = nights.filter((n) => n.complete).map((n) => n.night);
  const nextNight = nights.find((n) => !n.complete) || null;

  return {
    ok: true,
    updated: new Date().toISOString(),
    teams,
    nights,
    standings,
    players: playerList,
    singles,
    tonPlus,
    summary: {
      nightsPlayed: completeNights.length,
      nightsTotal: nights.length,
      latestNight: completeNights.length ? Math.max(...completeNights) : null,
      nextNight: nextNight ? nextNight.night : null,
      total180s: playerList.reduce((s, p) => s + p.s180, 0),
      totalTonPlus: tonPlus.length,
      highFinish: tonPlus[0] || null,
      legsPlayed: nights.reduce((s, n) => s + n.leftLegs + n.rightLegs, 0),
    },
  };
}
