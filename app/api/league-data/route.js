const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const MATCHES_GID = "257719632"; // Matches tab

const COL = {
  date: 0,
  division: 1,
  p1: 2,
  p1LegsFor: 3,
  p1LegsAgainst: 4,
  p1Avg: 5,
  p1NineAvg: 6,
  p1HighCheckout: 7,
  p1Tons: 8,
  p2: 9,
  p2LegsFor: 10,
  p2LegsAgainst: 11,
  p2Avg: 12,
  p2NineAvg: 13,
  p2HighCheckout: 14,
  p2Tons: 15,
  p1BestLeg: 16,
  p2BestLeg: 17,
  week: 19,
};

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (value !== "" || row.length) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      value += char;
    }
  }

  if (value !== "" || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

const text = (value) => String(value ?? "").trim();

const num = (value) => {
  const cleaned = text(value).replace("%", "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

function addPlayerMatch(players, division, name, stats) {
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
      bestLeg: 0,
      form: [],
    };
  }

  const p = players[key];

  p.played += 1;
  p.legsFor += stats.legsFor;
  p.legsAgainst += stats.legsAgainst;
  p.tons += stats.tons;
  p.highCheckout = Math.max(p.highCheckout, stats.highCheckout);

  // Best leg = lowest positive number of darts.
  // P1 pulls from column Q, P2 pulls from column R.
  if (stats.bestLeg > 0) {
    p.bestLeg = p.bestLeg === 0 ? stats.bestLeg : Math.min(p.bestLeg, stats.bestLeg);
  }

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
    p.points += 2; // 2 points per win
    p.form.push("W");
  } else if (stats.legsFor < stats.legsAgainst) {
    p.losses += 1;
    p.form.push("L");
  } else {
    p.draws += 1;
    p.points += 1; // 1 point per draw
    p.form.push("D");
  }
}

function sortDivisionNames(names) {
  return [...names].sort((a, b) => {
    const an = Number(String(a).match(/\d+/)?.[0] ?? 999);
    const bn = Number(String(b).match(/\d+/)?.[0] ?? 999);
    if (an !== bn) return an - bn;
    return String(a).localeCompare(String(b));
  });
}

function buildLeagueData(rows) {
  const playerMap = {};
  const latestResults = [];

  for (const row of rows.slice(1)) {
    const division = text(row[COL.division]) || "Unassigned";
    const p1 = text(row[COL.p1]);
    const p2 = text(row[COL.p2]);

    if (!p1 || !p2) continue;

    const p1Stats = {
      legsFor: num(row[COL.p1LegsFor]),
      legsAgainst: num(row[COL.p1LegsAgainst]),
      avg: num(row[COL.p1Avg]),
      nineAvg: num(row[COL.p1NineAvg]),
      highCheckout: num(row[COL.p1HighCheckout]),
      tons: num(row[COL.p1Tons]),
      bestLeg: num(row[COL.p1BestLeg]), // Q = Best Leg P1, player in C
    };

    const p2Stats = {
      legsFor: num(row[COL.p2LegsFor]),
      legsAgainst: num(row[COL.p2LegsAgainst]),
      avg: num(row[COL.p2Avg]),
      nineAvg: num(row[COL.p2NineAvg]),
      highCheckout: num(row[COL.p2HighCheckout]),
      tons: num(row[COL.p2Tons]),
      bestLeg: num(row[COL.p2BestLeg]), // R = Best Leg P2, player in J
    };

    addPlayerMatch(playerMap, division, p1, p1Stats);
    addPlayerMatch(playerMap, division, p2, p2Stats);

    latestResults.push({
      home: p1,
      away: p2,
      score: `${p1Stats.legsFor} - ${p2Stats.legsFor}`,
      avg: `${p1Stats.avg || "-"} / ${p2Stats.avg || "-"}`,
      checkout: `${Math.max(p1Stats.highCheckout, p2Stats.highCheckout) || 0} C/O`,
      division,
      week: text(row[COL.week]),
      date: text(row[COL.date]),
      p1Stats,
      p2Stats,
    });
  }

  const players = Object.values(playerMap).map((p) => ({
    ...p,
    avg: p.avgCount ? Number((p.avgTotal / p.avgCount).toFixed(2)) : 0,
    nineAvg: p.nineCount ? Number((p.nineTotal / p.nineCount).toFixed(2)) : 0,
    checkout: String(p.highCheckout || 0),
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

  const latest = latestResults.reverse().slice(0, 12);

  return {
    tables,
    players: players.sort((a, b) => b.avg - a.avg),
    results: latest,
    events: [],
  };
}

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${MATCHES_GID}`;
    const res = await fetch(csvUrl, { cache: "no-store" });

    if (!res.ok) {
      return Response.json(
        { error: `Google Sheets fetch failed: ${res.status}` },
        { status: 500 }
      );
    }

    const csv = await res.text();
    const rows = parseCsv(csv);
    const data = buildLeagueData(rows);

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to build league data" },
      { status: 500 }
    );
  }
}
