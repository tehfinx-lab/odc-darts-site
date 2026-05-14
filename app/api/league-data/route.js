const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const MATCHES_GID = "257719632";
const FIXTURES_GID = "573028301";
const MASTER_STATS_GID = "1607751142";

const DUO_SHEET_ID = "1nN_dbDGg482nZTB1ghwLgxvKJ5My-3PG";
const DUO_GID = "1207445903";

const CURRENT_WEEK = 7;
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
    results: allResults.slice(0, 12),
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
  const clean = (value) => text(value).toLowerCase();

  const groups = {
    "Group A": [],
    "Group B": [],
    "Group C": [],
  };

  const findCell = (row, names) => {
    for (let i = 0; i < row.length; i++) {
      const cell = clean(row[i]);
      if (names.some((name) => cell === name || cell.includes(name))) {
        return i;
      }
    }
    return -1;
  };

  const findHeaderNearGroup = (groupName) => {
    const groupIndex = rows.findIndex((row) =>
      row.some((cell) => clean(cell).includes(groupName.toLowerCase()))
    );

    if (groupIndex === -1) return null;

    for (let r = groupIndex; r < Math.min(rows.length, groupIndex + 18); r++) {
      const row = rows[r] || [];
      const teamCol = findCell(row, ["team"]);
      const ptsCol = findCell(row, ["pts", "points"]);

      if (teamCol !== -1 && ptsCol !== -1) {
        return {
          headerRow: r,
          teamCol,
          avgCol: findCell(row, ["avg", "team avg"]),
          playedCol: findCell(row, ["p", "played"]),
          winsCol: findCell(row, ["w", "wins"]),
          drawsCol: findCell(row, ["d", "draws"]),
          lossesCol: findCell(row, ["l", "losses"]),
          legsForCol: findCell(row, ["lf", "legs for"]),
          legsAgainstCol: findCell(row, ["la", "legs against"]),
          legDiffCol: findCell(row, ["ld", "+/-", "diff"]),
          pointsCol: ptsCol,
          rankCol: findCell(row, ["rank", "#", "pos"]),
          statusCol: findCell(row, ["status", "qualifies", "qualification"]),
        };
      }
    }

    return null;
  };

  const getValue = (row, col) => (col >= 0 ? row[col] : "");

  for (const groupName of Object.keys(groups)) {
    const header = findHeaderNearGroup(groupName);
    if (!header) continue;

    for (let r = header.headerRow + 1; r < Math.min(rows.length, header.headerRow + 10); r++) {
      const row = rows[r] || [];
      const team = text(getValue(row, header.teamCol));

      if (!team) continue;
      if (team.toLowerCase().includes("team")) continue;
      if (team.toLowerCase().includes("fixture")) continue;
      if (team.toLowerCase().includes("standing")) continue;
      if (team.toLowerCase().includes("group")) continue;

      const item = {
        group: groupName,
        team,
        teamAvg: num(getValue(row, header.avgCol)),
        played: num(getValue(row, header.playedCol)),
        wins: num(getValue(row, header.winsCol)),
        draws: num(getValue(row, header.drawsCol)),
        losses: num(getValue(row, header.lossesCol)),
        legsFor: num(getValue(row, header.legsForCol)),
        legsAgainst: num(getValue(row, header.legsAgainstCol)),
        legDiff: text(getValue(row, header.legDiffCol)),
        points: num(getValue(row, header.pointsCol)),
        rank: num(getValue(row, header.rankCol)),
        status: text(getValue(row, header.statusCol)),
      };

      if (!item.rank) item.rank = groups[groupName].length + 1;
      if (!item.legDiff) item.legDiff = String(item.legsFor - item.legsAgainst);

      groups[groupName].push(item);
    }

    groups[groupName].sort((a, b) => {
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

  const qualifiers = [];

  const qualifierTitleRow = rows.findIndex((row) =>
    row.some((cell) => clean(cell).includes("seeded") && clean(cell).includes("qualifier"))
  );

  if (qualifierTitleRow !== -1) {
    let header = null;

    for (let r = qualifierTitleRow; r < Math.min(rows.length, qualifierTitleRow + 8); r++) {
      const row = rows[r] || [];
      const seedCol = findCell(row, ["seed"]);
      const teamCol = findCell(row, ["team"]);

      if (seedCol !== -1 && teamCol !== -1) {
        header = {
          headerRow: r,
          seedCol,
          teamCol,
          groupCol: findCell(row, ["group"]),
          finishCol: findCell(row, ["finish"]),
          avgCol: findCell(row, ["avg", "team avg"]),
          pointsCol: findCell(row, ["pts", "points"]),
          legDiffCol: findCell(row, ["ld", "+/-", "diff"]),
          legsForCol: findCell(row, ["lf", "legs for"]),
        };
        break;
      }
    }

    if (header) {
      for (let r = header.headerRow + 1; r < Math.min(rows.length, header.headerRow + 12); r++) {
        const row = rows[r] || [];
        const seed = num(getValue(row, header.seedCol));
        const team = text(getValue(row, header.teamCol));

        if (!seed || !team) continue;

        qualifiers.push({
          seed,
          team,
          group: text(getValue(row, header.groupCol)),
          finish: text(getValue(row, header.finishCol)),
          teamAvg: num(getValue(row, header.avgCol)),
          points: num(getValue(row, header.pointsCol)),
          legDiff: text(getValue(row, header.legDiffCol)),
          legsFor: num(getValue(row, header.legsForCol)),
        });
      }
    }
  }

  const thirdPlace = [];

  const thirdPlaceTitleRow = rows.findIndex((row) =>
    row.some((cell) => {
      const value = clean(cell);
      return value.includes("third") || value.includes("3rd");
    })
  );

  if (thirdPlaceTitleRow !== -1) {
    let header = null;

    for (let r = thirdPlaceTitleRow; r < Math.min(rows.length, thirdPlaceTitleRow + 8); r++) {
      const row = rows[r] || [];
      const teamCol = findCell(row, ["team"]);
      const groupCol = findCell(row, ["group"]);

      if (teamCol !== -1 && groupCol !== -1) {
        header = {
          headerRow: r,
          groupCol,
          teamCol,
          avgCol: findCell(row, ["avg", "team avg"]),
          pointsCol: findCell(row, ["pts", "points"]),
          legDiffCol: findCell(row, ["ld", "+/-", "diff"]),
          legsForCol: findCell(row, ["lf", "legs for"]),
          rankCol: findCell(row, ["rank", "#", "pos"]),
          qualifiesCol: findCell(row, ["qualifies", "qualified", "status"]),
        };
        break;
      }
    }

    if (header) {
      for (let r = header.headerRow + 1; r < Math.min(rows.length, header.headerRow + 8); r++) {
        const row = rows[r] || [];
        const team = text(getValue(row, header.teamCol));

        if (!team) continue;

        thirdPlace.push({
          group: text(getValue(row, header.groupCol)),
          team,
          teamAvg: num(getValue(row, header.avgCol)),
          points: num(getValue(row, header.pointsCol)),
          legDiff: text(getValue(row, header.legDiffCol)),
          legsFor: num(getValue(row, header.legsForCol)),
          rank: num(getValue(row, header.rankCol)) || thirdPlace.length + 1,
          qualifies: text(getValue(row, header.qualifiesCol)),
        });
      }
    }
  }

  qualifiers.sort((a, b) => a.seed - b.seed);
  thirdPlace.sort((a, b) => a.rank - b.rank);

  return {
    groups,
    thirdPlace,
    qualifiers,
  };
}

export async function GET() {
  try {
    const [matchRows, fixtureRows, duoRows] = await Promise.all([
      fetchSheetRows(MATCHES_GID, "Matches"),
      fetchSheetRows(FIXTURES_GID, "Fixtures"),
      fetchCsvRows(DUO_SHEET_ID, DUO_GID, "Duo League"),
    ]);

    let masterRows = [];
    let masterStatsError = "";

    try {
      masterRows = await fetchSheetRows(MASTER_STATS_GID, "Master Stats");
    } catch (error) {
      masterStatsError = error.message || "Master Stats failed";
      console.error("Master Stats failed:", error);
    }

    const matchData = buildMatchesData(matchRows);
    const fixtures = buildFixturesData(fixtureRows);
    const masterStats = buildMasterStats(masterRows);
    const duoLeague = buildDuoLeagueData(duoRows);

    return Response.json(
      {
        ...matchData,
        fixtures,
        duoLeague,
        masterStats,
        masterStatsError,
        currentWeek: CURRENT_WEEK,
        mvpWeek: MVP_WEEK,
        events: [],
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
