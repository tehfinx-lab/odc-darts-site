const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const MATCHES_GID = "257719632";
const FIXTURES_GID = "573028301";
const MASTER_STATS_GID = "1607751142";
const PLAYERS_GID = "1263320039";
const EVENTS_GID = "1053162197";

const DUO_SHEET_ID = "1sEBXQpn2ZaGNJSiExjiKtt4Vc1nJbdFt2qqaPnAOVUQ";
// New duo sheet is fetched by TAB NAME (gviz) so no gids are needed.
const DUO_STANDINGS_TAB = "Standings";
const DUO_KNOCKOUT_TAB = "Knockout";
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

// Strip invisible/odd characters that bots inject. The Discord bot writes values
// with a leading apostrophe (e.g. '5) which forces text format in Sheets.
const cleanCell = (value) =>
  String(value ?? "")
    .replace(/['\u2018\u2019\u0060\u00B4]/g, "")  // ALL apostrophe/backtick variants, anywhere
    .replace(/[\u00A0\u2007\u202F]/g, " ")          // non-breaking / figure / narrow spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, "")          // zero-width spaces / BOM
    .replace(/[\r\n\t]+/g, " ")                     // newlines/tabs
    .trim();

const text = (value) => cleanCell(value);

const num = (value) => {
  // Keep only digits, dot, minus — kills any stray character (apostrophe, space, etc.)
  const cleaned = cleanCell(value)
    .replace("%", "")
    .replace(/,/g, "")
    .replace(/[^0-9.\-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

function bestLegRank(value) {
  const match = text(value).match(/(\d+)/);
  return match ? Number(match[1]) : 9999;
}

async function fetchCsvRows(sheetId, gid, label = "Sheet") {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
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

async function fetchCsvRowsByName(sheetId, sheetName, label = "Sheet") {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
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

const normHeader = (h) => String(h ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Finds extra stat columns BY HEADER NAME so they work no matter where
 * they sit in the sheet (and keep working if more columns get added).
 * Expected headers: "Checkout rate (P1/P2)", "Checkouts (P1/P2)", "Worst leg (P1/P2)".
 */
function findExtraCols(headerRow) {
  const map = {};
  (headerRow || []).forEach((h, i) => {
    const key = normHeader(h);
    if (key && map[key] === undefined) map[key] = i;
  });
  const find = (...keys) => {
    for (const k of keys) if (map[k] !== undefined) return map[k];
    return -1;
  };
  return {
    p1CheckoutRate: find("checkoutratep1", "p1checkoutrate", "checkoutpercentp1"),
    p2CheckoutRate: find("checkoutratep2", "p2checkoutrate", "checkoutpercentp2"),
    p1Checkouts: find("checkoutsp1", "p1checkouts"),
    p2Checkouts: find("checkoutsp2", "p2checkouts"),
    p1WorstLeg: find("worstlegp1", "p1worstleg"),
    p2WorstLeg: find("worstlegp2", "p2worstleg"),
  };
}

function buildMatchesData(rows, rosterRows = []) {
  const playerMap = {};
  const latestResults = [];
  const mvpCandidates = {};
  const EX = findExtraCols(rows[0]);
  const cell = (row, idx) => (idx >= 0 ? text(row[idx]) : "");

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
      checkoutRate: cell(row, EX.p1CheckoutRate),
      checkouts: cell(row, EX.p1Checkouts),
      worstLeg: cell(row, EX.p1WorstLeg),
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
      checkoutRate: cell(row, EX.p2CheckoutRate),
      checkouts: cell(row, EX.p2Checkouts),
      worstLeg: cell(row, EX.p2WorstLeg),
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

  // Merge the Players-tab roster: anyone who hasn't played yet appears
  // with zeroed stats, so the Players page + division tables show the
  // full line-up before a dart is thrown. Real stats take over from the
  // Matches data automatically once they play.
  for (const row of (rosterRows || []).slice(1)) {
    const name = text(row[0]);
    const division = text(row[1]) || "Unassigned";
    if (!name) continue;
    const key = `${division}__${name}`;
    if (playerMap[key]) continue;
    const alreadyPlaying = Object.keys(playerMap).some(
      (k) => (k.split("__")[1] || "").toLowerCase() === name.toLowerCase()
    );
    if (alreadyPlaying) continue; // don't duplicate someone whose matches sit under a different division label
    playerMap[key] = {
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
  // New DDL sheet ("Standings" tab): each group is a block —
  //   [Group X] label in col A, then a "Team" header row, then the
  //   already-sorted display table in columns A-I:
  //   Team | MP | W | D | L | Legs For | Legs Against | Leg Diff | Points
  const groups = {};
  let currentGroup = null;

  for (const row of rows) {
    const a = text(row?.[0]);

    if (/^Group\s+[A-Z]$/i.test(a)) {
      currentGroup = a.replace(/^group/i, "Group");
      groups[currentGroup] = [];
      continue;
    }
    if (!currentGroup) continue;
    if (!a || /^team$/i.test(a)) continue; // blank rows / header row

    const legsFor = num(row[5]);
    const legsAgainst = num(row[6]);
    groups[currentGroup].push({
      group: currentGroup,
      team: a,
      teamAvg: 0, // new sheet doesn't track a team average
      played: num(row[1]),
      wins: num(row[2]),
      draws: num(row[3]),
      losses: num(row[4]),
      legsFor,
      legsAgainst,
      legDiff: text(row[7]) || String(legsFor - legsAgainst),
      points: num(row[8]),
      rank: groups[currentGroup].length + 1, // sheet rows arrive pre-sorted
      status: "",
    });
  }

  // Drop empty groups (e.g. before the draw is done)
  for (const name of Object.keys(groups)) {
    if (!groups[name].length) delete groups[name];
  }

  // Top 2 qualify for the knockout — badge them once the group is complete
  // (double round robin: each team plays 2 * (teams - 1) games)
  for (const teams of Object.values(groups)) {
    const gamesEach = (teams.length - 1) * 2;
    const complete = teams.length > 1 && teams.every((t) => t.played >= gamesEach);
    if (complete) {
      teams.slice(0, 2).forEach((t) => { t.status = "QUALIFIED"; });
    }
  }

  return groups;
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
  // New DDL sheet ("Knockout" tab), clean columns:
  //   A Round | B Match | C Team 1 | D Score 1 | E Score 2 | F Team 2 | G Winner
  const makeMatch = (id, row) => ({
    id,
    home: text(row?.[2] ?? ""),
    away: text(row?.[5] ?? ""),
    homeScore: text(row?.[3] ?? ""),
    awayScore: text(row?.[4] ?? ""),
    winner: text(row?.[6] ?? ""),
  });

  const byId = {};
  let champion = "";

  for (const row of rows) {
    const matchId = text(row?.[1]);
    if (/^QF\d+$/i.test(matchId) || /^SF\d+$/i.test(matchId) || /^FINAL$/i.test(matchId)) {
      byId[matchId.toUpperCase()] = row;
    }
    // champion banner cell, e.g. "Champion: Team X"
    const a = text(row?.[0]);
    if (/^champion/i.test(a)) {
      const m = a.match(/^champion[:\s]*(.+)$/i);
      if (m && m[1] && !/tbd/i.test(m[1])) champion = m[1].trim();
    }
  }

  // Fall back to the FINAL row's winner column
  if (!champion && byId["FINAL"]) {
    const w = text(byId["FINAL"][6] ?? "");
    if (w && !/tbd/i.test(w)) champion = w;
  }

  const quarterFinals = Array.from({ length: 4 }, (_, i) =>
    makeMatch(`QF${i + 1}`, byId[`QF${i + 1}`])
  );
  const semiFinals = Array.from({ length: 2 }, (_, i) =>
    makeMatch(`SF${i + 1}`, byId[`SF${i + 1}`])
  );

  return {
    quarterFinals,
    semiFinals,
    final: [makeMatch("Final", byId["FINAL"])],
    champion,
  };
}

export async function GET() {
  try {
    const [matchRows, fixtureRows, duoRows, knockoutRows, eventRows] = await Promise.all([
      fetchSheetRows(MATCHES_GID, "Matches"),
      fetchSheetRows(FIXTURES_GID, "Fixtures"),
      fetchCsvRowsByName(DUO_SHEET_ID, DUO_STANDINGS_TAB, "Duo League"),
      fetchCsvRowsByName(DUO_SHEET_ID, DUO_KNOCKOUT_TAB, "Knockout"),
      fetchSheetRows(EVENTS_GID, "Events"),
    ]);

    let rosterRows = [];
    try {
      rosterRows = await fetchSheetRows(PLAYERS_GID, "Players");
    } catch (error) {
      console.error("Players roster failed (site falls back to matches-only):", error);
    }

    let masterRows = [];
    let masterStatsError = "";

    try {
      masterRows = await fetchSheetRows(MASTER_STATS_GID, "Master Stats");
    } catch (error) {
      masterStatsError = error.message || "Master Stats failed";
      console.error("Master Stats failed:", error);
    }

    const matchData  = buildMatchesData(matchRows, rosterRows);
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
