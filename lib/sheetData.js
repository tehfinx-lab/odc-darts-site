const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const MATCHES_TAB = "Matches";

const num = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const cleaned = String(value).replace("%", "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value ?? "").trim();

const pick = (row, names) => {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== "") return row[name];
  }
  return "";
};

const safeDivision = (row) => {
  const value = text(pick(row, ["Division", "-Division", "Divison", "division"]));
  return value || "Unassigned";
};

const sortDivisionNames = (names) => {
  return [...names].sort((a, b) => {
    const an = Number(String(a).match(/\d+/)?.[0] ?? 999);
    const bn = Number(String(b).match(/\d+/)?.[0] ?? 999);
    if (an !== bn) return an - bn;
    return String(a).localeCompare(String(b));
  });
};

const addPlayerMatch = (players, division, name, stats) => {
  if (!name) return;

  const key = `${division}__${name}`;
  if (!players[key]) {
    players[key] = {
      name,
      team: division,
      division,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      legsFor: 0,
      legsAgainst: 0,
      points: 0,
      avgTotal: 0,
      avgCount: 0,
      nineTotal: 0,
      nineCount: 0,
      highCheckout: 0,
      tons: 0,
      form: [],
    };
  }

  const p = players[key];
  p.played += 1;
  p.legsFor += stats.legsFor;
  p.legsAgainst += stats.legsAgainst;
  p.tons += stats.tons;
  p.highCheckout = Math.max(p.highCheckout, stats.highCheckout);

  if (stats.avg > 0) {
    p.avgTotal += stats.avg;
    p.avgCount += 1;
  }

  if (stats.nineAvg > 0) {
    p.nineTotal += stats.nineAvg;
    p.nineCount += 1;
  }

  if (stats.legsFor > stats.legsAgainst) {
    p.wins += 1;
    p.points += 3;
    p.form.push("W");
  } else if (stats.legsFor < stats.legsAgainst) {
    p.losses += 1;
    p.form.push("L");
  } else {
    p.draws += 1;
    p.points += 1;
    p.form.push("D");
  }
};

export async function getMatches() {
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(MATCHES_TAB)}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch Matches sheet");
  }

  return res.json();
}

export function buildLeagueData(matches) {
  const playerMap = {};
  const latestResults = [];

  for (const row of matches) {
    const division = safeDivision(row);

    const p1 = text(pick(row, ["Player 1", "Player1", "P1", "Home", "Player"]));
    const p2 = text(pick(row, ["Player 2", "Player2", "P2", "Away", "Opponent"]));

    const p1LegsFor = num(pick(row, ["Legs For (P1)", "P1 Legs For", "Legs For P1", "P1 LF", "Legs For"]));
    const p1LegsAgainst = num(pick(row, ["Legs Against (P1)", "P1 Legs Against", "Legs Against P1", "P1 LA", "Legs Against"]));
    const p2LegsFor = num(pick(row, ["Legs For (P2)", "P2 Legs For", "Legs For P2", "P2 LF"]));
    const p2LegsAgainst = num(pick(row, ["Legs Against (P2)", "P2 Legs Against", "Legs Against P2", "P2 LA"]));

    if (!p1 || !p2) continue;

    const p1Stats = {
      legsFor: p1LegsFor,
      legsAgainst: p1LegsAgainst || p2LegsFor,
      avg: num(pick(row, ["3DA (P1)", "3-Dart Avg (P1)", "3 Dart Avg (P1)", "3DA P1", "3-Dart Avg"])),
      nineAvg: num(pick(row, ["9DA (P1)", "9-Dart Avg (P1)", "9 Dart Avg (P1)", "9DA P1"])),
      highCheckout: num(pick(row, ["High C/O (P1)", "Highest Checkout (P1)", "Highest C/O (P1)", "High Checkout P1"])),
      tons: num(pick(row, ["180s (P1)", "180s P1", "P1 180s"])),
    };

    const p2Stats = {
      legsFor: p2LegsFor,
      legsAgainst: p2LegsAgainst || p1LegsFor,
      avg: num(pick(row, ["3DA (P2)", "3-Dart Avg (P2)", "3 Dart Avg (P2)", "3DA P2"])),
      nineAvg: num(pick(row, ["9DA (P2)", "9-Dart Avg (P2)", "9 Dart Avg (P2)", "9DA P2"])),
      highCheckout: num(pick(row, ["High C/O (P2)", "Highest Checkout (P2)", "Highest C/O (P2)", "High Checkout P2"])),
      tons: num(pick(row, ["180s (P2)", "180s P2", "P2 180s"])),
    };

    addPlayerMatch(playerMap, division, p1, p1Stats);
    addPlayerMatch(playerMap, division, p2, p2Stats);

    latestResults.push({
      home: p1,
      away: p2,
      score: `${p1Stats.legsFor} - ${p2Stats.legsFor}`,
      avg: p1Stats.avg || p2Stats.avg || "-",
      checkout: `${Math.max(p1Stats.highCheckout, p2Stats.highCheckout) || 0} C/O`,
      division,
      week: text(pick(row, ["Week", "week"])),
      date: text(pick(row, ["Date", "date"])),
    });
  }

  const players = Object.values(playerMap).map((p) => ({
    ...p,
    avg: p.avgCount ? Number((p.avgTotal / p.avgCount).toFixed(2)) : 0,
    nineAvg: p.nineCount ? Number((p.nineTotal / p.nineCount).toFixed(2)) : 0,
    checkout: p.highCheckout ? `${p.highCheckout}` : "0",
    legsDiff: p.legsFor - p.legsAgainst,
    form: p.form.slice(-5).join(" "),
  }));

  const divisionNames = sortDivisionNames([...new Set(players.map((p) => p.division))]);

  const tables = {};
  for (const division of divisionNames) {
    tables[division] = players
      .filter((p) => p.division === division)
      .sort((a, b) =>
        b.points - a.points ||
        b.legsDiff - a.legsDiff ||
        b.legsFor - a.legsFor ||
        b.avg - a.avg ||
        a.name.localeCompare(b.name)
      )
      .map((p, index) => ({
        pos: index + 1,
        name: p.name,
        played: p.played,
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        legs: `${p.legsDiff >= 0 ? "+" : ""}${p.legsDiff}`,
        legsFor: p.legsFor,
        legsAgainst: p.legsAgainst,
        points: p.points,
        form: p.form,
      }));
  }

  const latest = latestResults[latestResults.length - 1];
  const [homeLegs, awayLegs] = latest ? latest.score.split(" - ").map(Number) : [0, 0];

  const events = latest
    ? [
        {
          title: "Latest Match Winner",
          winner: homeLegs >= awayLegs ? latest.home : latest.away,
          runnerUp: homeLegs >= awayLegs ? latest.away : latest.home,
          date: latest.date || "Latest",
          prize: "ODC Winner",
        },
      ]
    : [];

  return {
    tables,
    players: players.sort((a, b) => b.avg - a.avg),
    results: latestResults.reverse().slice(0, 6),
    events,
  };
}

export async function getLiveLeagueData() {
  const matches = await getMatches();
  return buildLeagueData(matches);
}

export const fallbackData = {
  tables: {
    "Premier Division": [
      { pos: 1, name: "The Ton Machines", played: 8, wins: 7, losses: 1, draws: 0, legs: "+31", points: 21, form: "W W W L W" },
      { pos: 2, name: "Checkout Kings", played: 8, wins: 6, losses: 2, draws: 0, legs: "+18", points: 18, form: "W L W W W" },
    ],
  },
  players: [
    { name: "Ace Archer", team: "Premier Division", division: "Premier Division", avg: 74.2, checkout: "132", highCheckout: 132, tons: 18, wins: 7, played: 8 },
    { name: "Mason Flight", team: "Premier Division", division: "Premier Division", avg: 71.5, checkout: "120", highCheckout: 120, tons: 15, wins: 6, played: 8 },
  ],
  results: [
    { home: "Ace Archer", away: "Mason Flight", score: "6 - 4", avg: "74.2", checkout: "132 C/O", division: "Premier Division" },
  ],
  events: [
    { title: "Sunday Shootout", winner: "Ace Archer", runnerUp: "Mason Flight", date: "Latest Winner", prize: "Nightly Champion" },
  ],
};
