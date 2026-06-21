const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const MATCHES_GID = "257719632";
const FIXTURES_GID = "573028301";
const MASTER_STATS_GID = "1607751142";
const EVENTS_GID = "1053162197";

const DUO_SHEET_ID = "1nN_dbDGg482nZTB1ghwLgxvKJ5My-3PG";
const DUO_GID = "1207445903";
const KNOCKOUT_GID = "831104526";

const CURRENT_WEEK = 13;
const MVP_WEEK = CURRENT_WEEK - 1;

const MATCH_COL = {
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

const FIXTURE_COL = {
  week: 0,
  division: 1,
  home: 2,
  away: 3,
  status: 4,
  notes: 5,
  date: 6,
};

const MASTER_COL = {
  player: 0,
  gamesPlayed: 1,
  gamesWon: 2,
  gamesDrawn: 3,
  gamesLost: 4,
  legsFor: 5,
  legsAgainst: 6,
  legsDiff: 7,
  bestCheckout: 8,
  tons: 9,
  best3DA: 10,
  best9DA: 11,
  totalPoints: 12,
  division: 13,
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

function bestLegRank(value) {
  const match = text(value).match(/(\d+)/);
  return match ? Number(match[1]) : 9999;
}

async function fetchCsvRows(sheetId, gid, label = "Sheet") {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(csvUrl, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`${label} fetch failed: ${res.status}`);
  }

  const csv = await res.text();

  if (csv.toLowerCase().includes("<html") || csv.toLowerCase().includes("sign in")) {
    throw new Error(`${label} is not publicly readable as CSV`);
  }

  return parseCsv(csv);
}

async function fetchSheetRows(gid, label = "Sheet") {
  return fetchCsvRows(SHEET_ID, gid, label);
}

function compareRank(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

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
    p.points += 2;
    p.form.push("W");
  } else if (stats.legsFor < stats.legsAgainst) {
    p.losses += 1;
    p.form.push("L");
  } else {
    p.draws += 1;
    p.points += 1;
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

function hasRealResult(p1Stats, p2Stats) {
  return (
    p1Stats.legsFor > 0 ||
    p1Stats.legsAgainst > 0 ||
    p2Stats.legsFor > 0 ||
    p2Stats.legsAgainst > 0
  );
}

function buildMatchesData(rows) {
  const playerMap = {};
  const latestResults = [];
  const mvpCandidates = {};

  for (const row of rows.slice(1)) {
    const week = num(row[MATCH_COL.week]);
    const division = text(row[MATCH_COL.division]) || "Unassigned";
    const p1 = text(row[MATCH_COL.p1]);
    const p2 = text(row[MATCH_COL.p2]);

    if (!p1 || !p2) continue;

    const p1Stats = {
      legsFor: num(row[MATCH_COL.p1LegsFor]),
      legsAgainst: num(row[MATCH_COL.p1LegsAgainst]),
      avg: num(row[MATCH_COL.p1Avg]),
      nineAvg: num(row[MATCH_COL.p1NineAvg]),
      highCheckout: num(row[MATCH_COL.p1HighCheckout]),
      tons: num(row[MATCH_COL.p1Tons]),
      bestLeg: num(row[MATCH_COL.p1BestLeg]),
      bestLegRaw: text(row[MATCH_COL.p1BestLeg]),
    };

    const p2Stats = {
      legsFor: num(row[MATCH_COL.p2LegsFor]),
      legsAgainst: num(row[MATCH_COL.p2LegsAgainst]),
      avg: num(row[MATCH_COL.p2Avg]),
      nineAvg: num(row[MATCH_COL.p2NineAvg]),
      highCheckout: num(row[MATCH_COL.p2HighCheckout]),
      tons: num(row[MATCH_COL.p2Tons]),
      bestLeg: num(row[MATCH_COL.p2BestLeg]),
      bestLegRaw: text(row[MATCH_COL.p2BestLeg]),
    };

    if (!hasRealResult(p1Stats, p2Stats)) continue;

    addPlayerMatch(playerMap, division, p1, p1Stats);
    addPlayerMatch(playerMap, division, p2, p2Stats);

    latestResults.push({
      id: `${text(row[MATCH_COL.date])}-${division}-${p1}-${p2}-${latestResults.length}`,
      home: p1,
      away: p2,
      score: `${p1Stats.legsFor} - ${p2Stats.legsFor}`,
      avg: `${p1Stats.avg || "-"} / ${p2Stats.avg || "-"}`,
      checkout: `${Math.max(p1Stats.highCheckout, p2Stats.highCheckout) || 0} C/O`,
      division,
      week,
      date: text(row[MATCH_COL.date]),
      p1Stats,
      p2Stats,
    });

    if (week === MVP_WEEK) {
      for (const candidate of [
        { name: p1, stats: p1Stats },
        { name: p2, stats: p2Stats },
      ]) {
        const { name, stats } = candidate;
        if (!name) continue;
        if (stats.legsFor <= stats.legsAgainst) continue;

        const rank = [
          Number(stats.avg.toFixed(4)),
          Number(stats.nineAvg.toFixed(4)),
          stats.highCheckout,
          stats.tons,
          -bestLegRank(stats.bestLegRaw || stats.bestLeg),
        ];

        const mvp = {
          player: name,
          division,
          week,
          avg: Number(stats.avg.toFixed(2)),
          nineAvg: Number(stats.nineAvg.toFixed(2)),
          highCheckout: stats.highCheckout,
          tons: stats.tons,
          bestLeg: stats.bestLegRaw || stats.bestLeg || "-",
          rank,
        };

        if (!mvpCandidates[division] || compareRank(rank, mvpCandidates[division].rank) > 0) {
          mvpCandidates[division] = mvp;
        }
      }
    }
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

  const weeklyMvps = sortDivisionNames(Object.keys(mvpCandidates)).map((division) => {
    const { rank, ...clean } = mvpCandidates[division];
    return clean;
  });

  const allResults = [...latestResults].reverse();

  return {
    tables,
    players: players.sort((a, b) => b.avg - a.avg),
    results: allResults.slice(0, 200),
    allResults,
    weeklyMvps,
  };
}

function buildFixturesData(rows) {
  const fixtures = [];

  for (const row of rows.slice(1)) {
    const week = num(row[FIXTURE_COL.week]);
    const division = text(row[FIXTURE_COL.division]);
    const home = text(row[FIXTURE_COL.home]);
    const away = text(row[FIXTURE_COL.away]);
    const date = text(row[FIXTURE_COL.date]);

    if (week !== CURRENT_WEEK) continue;
    if (!division || !home || !away) continue;

    fixtures.push({
      week,
      division,
      home,
      away,
      date,
    });
  }

  const divisionNames = sortDivisionNames([...new Set(fixtures.map((f) => f.division))]);
  const grouped = {};

  for (const division of divisionNames) {
    grouped[division] = fixtures.filter((f) => f.division === division);
  }

  return grouped;
}

function buildMasterStats(rows) {
  const stats = {};

  for (const row of rows.slice(1)) {
    const player = text(row[MASTER_COL.player]);
    if (!player) continue;

    stats[player.toLowerCase()] = {
      player,
      gamesPlayed: num(row[MASTER_COL.gamesPlayed]),
      gamesWon: num(row[MASTER_COL.gamesWon]),
      gamesDrawn: num(row[MASTER_COL.gamesDrawn]),
      gamesLost: num(row[MASTER_COL.gamesLost]),
      legsFor: num(row[MASTER_COL.legsFor]),
      legsAgainst: num(row[MASTER_COL.legsAgainst]),
      legsDiff:
        text(row[MASTER_COL.legsDiff]) ||
        String(num(row[MASTER_COL.legsFor]) - num(row[MASTER_COL.legsAgainst])),
      bestCheckout: num(row[MASTER_COL.bestCheckout]),
      tons: num(row[MASTER_COL.tons]),
      best3DA: num(row[MASTER_COL.best3DA]),
      best9DA: num(row[MASTER_COL.best9DA]),
      totalPoints: num(row[MASTER_COL.totalPoints]),
      division: text(row[MASTER_COL.division]),
    };
  }

  return stats;
}

function buildDuoLeagueData(rows) {
  const groups = {
    "Group A": [],
    "Group B": [],
    "Group C": [],
  };

  const groupConfig = [
    { group: "Group A", firstMatchId: "A1" },
    { group: "Group B", firstMatchId: "B1" },
    { group: "Group C", firstMatchId: "C1" },
  ];

  const DUO_COL = {
    matchId: 0,
    team: 9,
    teamAvg: 10,
    played: 11,
    wins: 12,
    draws: 13,
    losses: 14,
    legsFor: 15,
    legsAgainst: 16,
    legDiff: 17,
    points: 18,
    sortKey: 19,
    rank: 20,
    status: 21,
  };

  for (const config of groupConfig) {
    const startRow = rows.findIndex((row) => text(row[DUO_COL.matchId]) === config.firstMatchId);

    if (startRow === -1) continue;

    for (let r = startRow; r < startRow + 4; r++) {
      const row = rows[r] || [];
      const team = text(row[DUO_COL.team]);

      if (!team) continue;

      const legsFor = num(row[DUO_COL.legsFor]);
      const legsAgainst = num(row[DUO_COL.legsAgainst]);

      groups[config.group].push({
        group: config.group,
        team,
        teamAvg: num(row[DUO_COL.teamAvg]),
        played: num(row[DUO_COL.played]),
        wins: num(row[DUO_COL.wins]),
        draws: num(row[DUO_COL.draws]),
        losses: num(row[DUO_COL.losses]),
        legsFor,
        legsAgainst,
        legDiff: text(row[DUO_COL.legDiff]) || String(legsFor - legsAgainst),
        points: num(row[DUO_COL.points]),
        rank: num(row[DUO_COL.rank]) || groups[config.group].length + 1,
        status: text(row[DUO_COL.status]),
      });
    }

    groups[config.group].sort((a, b) => {
      return (
        a.rank - b.rank ||
        b.points - a.points ||
        Number(b.legDiff) - Number(a.legDiff) ||
        b.legsFor - a.legsFor ||
        b.teamAvg - a.teamAvg ||
        a.team.localeCompare(b.team)
      );
    });
  }

  return {
    groups,
    thirdPlace: [],
    qualifiers: [],
  };
}

function buildEventsData(rows) {
  const events = [];

  for (const row of rows) {
    const name = text(row[0]);

    // Skip headers and empty rows only
    if (
      !name ||
      name.toLowerCase().includes("event")
    ) {
      continue;
    }

    events.push({
      name,
      date: text(row[1]),
      format: text(row[2]),
      prize: text(row[3]),
      signUp: text(row[4]),
    });
  }

  return events;
}

function buildKnockoutData(rows) {
  // Google Sheets CSV merges the entire title/header section into the first row alongside QF1,
  // so we can't rely on row offsets. Instead find matches by their ID in col A.
  const qfEntries = [];
  const sfEntries = [];
  let finalRow = null;
  let champion = "";
  let matchHeaderCount = 0;

  for (const row of rows) {
    const colA = text(row[0]);

    if (/^QF\d+$/i.test(colA)) {
      // Clean QF row (QF2, QF3, QF4)
      qfEntries.push({ id: colA.toUpperCase(), row, special: false });
    } else if (/QF\d+$/i.test(colA)) {
      // QF1 is merged into the big header blob — col B/C have "Home Team X" / "Away Team X" prefixes
      const m = colA.match(/QF(\d+)$/i);
      qfEntries.push({ id: `QF${m[1]}`, row, special: true });
    } else if (/^SF\d+$/i.test(colA)) {
      sfEntries.push({ id: colA.toUpperCase(), row, special: false });
    } else if (/^Final$/i.test(colA) && matchHeaderCount >= 2) {
      // Only accept "Final" as a match row after the second "Match" column-header row
      finalRow = row;
    } else if (/^Match$/i.test(colA)) {
      matchHeaderCount++;
    } else if (/^Winner$/i.test(colA)) {
      champion = text(row[1] ?? "");
    }
  }

  qfEntries.sort((a, b) => a.id.localeCompare(b.id));

  const stripPrefix = (val, prefix) => {
    const s = text(val);
    return s.startsWith(prefix) ? s.slice(prefix.length).trim() : s;
  };

  const makeMatch = (id, row, special) => {
    if (!row) return { id, home: "", away: "", homeScore: "", awayScore: "", winner: "" };
    return {
      id,
      home:      special ? stripPrefix(row[1], "Home Team")                              : text(row[1] ?? ""),
      away:      special ? stripPrefix(row[2], "Away Team")                              : text(row[2] ?? ""),
      homeScore: special ? text(row[3] ?? "").replace(/^Home Score\s*/i, "").trim()      : text(row[3] ?? ""),
      awayScore: special ? text(row[4] ?? "").replace(/^Away Score\s*/i, "").trim()      : text(row[4] ?? ""),
      winner:    special ? text(row[5] ?? "").replace(/^Winner\s*/i, "").trim()          : text(row[5] ?? ""),
    };
  };

  const quarterFinals = Array.from({ length: 4 }, (_, i) => {
    const e = qfEntries[i];
    return e ? makeMatch(e.id, e.row, e.special) : { id: `QF${i + 1}`, home: "", away: "", homeScore: "", awayScore: "", winner: "" };
  });

  const semiFinals = Array.from({ length: 2 }, (_, i) => {
    const e = sfEntries[i];
    return e ? makeMatch(e.id, e.row, false) : { id: `SF${i + 1}`, home: "", away: "", homeScore: "", awayScore: "", winner: "" };
  });

  return {
    quarterFinals,
    semiFinals,
    final: [makeMatch("Final", finalRow, false)],
    champion,
  };
}

export async function GET() {
  try {
    const [matchRows, fixtureRows, duoRows, knockoutRows, eventRows] = await Promise.all([
      fetchSheetRows(MATCHES_GID, "Matches"),
      fetchSheetRows(FIXTURES_GID, "Fixtures"),
      fetchCsvRows(DUO_SHEET_ID, DUO_GID, "Duo League"),
      fetchCsvRows(DUO_SHEET_ID, KNOCKOUT_GID, "Knockout"),
      fetchSheetRows(EVENTS_GID, "Events"),
    ]);

    let masterRows = [];
    let masterStatsError = "";

    try {
      masterRows = await fetchSheetRows(MASTER_STATS_GID, "Master Stats");
    } catch (error) {
      masterStatsError = error.message || "Master Stats failed";
      console.error("Master Stats failed:", error);
    }

    const matchData  = buildMatchesData(matchRows);
    const fixtures   = buildFixturesData(fixtureRows);
    const masterStats = buildMasterStats(masterRows);
    const duoLeague  = buildDuoLeagueData(duoRows);
    const events     = buildEventsData(eventRows);
    const knockout   = buildKnockoutData(knockoutRows);

    return Response.json(
      {
        ...matchData,
        fixtures,
        duoLeague,
        masterStats,
        masterStatsError,
        currentWeek: CURRENT_WEEK,
        mvpWeek: MVP_WEEK,
        events,
        knockout,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Failed to build league data",
      },
      {
        status: 500,
      }
    );
  }
}
