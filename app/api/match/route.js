// app/api/match/route.js
//
// Looks up a single fixture by the MatchID the Discord bot writes into
// Fixtures column H. Used by odc-play.html?m=ABC123 so the scoreboard
// knows who is playing without anyone typing names in.
//
// Standalone on purpose: it does not import from league-data/route.js,
// so nothing here can affect the league feed.

const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const FIXTURES_GID = "573028301";

// Fixtures columns, matching league-data/route.js, plus the new one.
const COL = {
  week: 0,
  division: 1,
  home: 2,
  away: 3,
  status: 4,
  notes: 5,
  date: 6,
  matchId: 7, // column H
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

// Same cleaning as the league feed: the bot writes some values with a
// leading apostrophe to force text format in Sheets.
const cleanCell = (value) =>
  String(value ?? "")
    .replace(/['\u2018\u2019\u0060\u00B4]/g, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();

const cell = (row, index) =>
  index < row.length ? cleanCell(row[index]) : "";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request) {
  const id = cleanCell(
    new URL(request.url).searchParams.get("m") || ""
  ).toUpperCase();

  if (!id) return json({ error: "No match id given" }, 400);
  if (!/^[A-Z0-9]{4,12}$/.test(id)) return json({ error: "Bad match id" }, 400);

  let rows;
  try {
    const csvUrl =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}` +
      `/export?format=csv&gid=${FIXTURES_GID}`;
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fixtures fetch failed: ${res.status}`);
    const csv = await res.text();
    const lower = csv.toLowerCase();
    if (lower.includes("<html") || lower.includes("sign in")) {
      throw new Error("Fixtures sheet is not publicly readable as CSV");
    }
    rows = parseCsv(csv);
  } catch (e) {
    return json({ error: "Could not read fixtures", detail: String(e.message || e) }, 502);
  }

  for (const row of rows) {
    if (cell(row, COL.matchId).toUpperCase() !== id) continue;

    const home = cell(row, COL.home);
    const away = cell(row, COL.away);
    if (!home || !away) break;

    return json({
      matchId: id,
      home,
      away,
      division: cell(row, COL.division),
      week: cell(row, COL.week),
      date: cell(row, COL.date),
      status: cell(row, COL.status),
      notes: cell(row, COL.notes),
    });
  }

  return json({ error: "Match not found" }, 404);
}
