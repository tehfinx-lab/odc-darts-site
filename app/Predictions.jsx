"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * ODC Predictions — Predict tab + Leaderboard tab
 *
 * Props:
 *   data       - your league data object (needs data.fixtures, data.results, data.players)
 *   scriptUrl  - your Google Apps Script web-app URL (the /exec one)
 *
 * Scoring: 5 pts correct winner (or correct draw) + 5 pts exact score.
 */

const WINNER_PTS = 5;
const EXACT_PTS = 5;

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// Decide the outcome of a match: "home" | "away" | "draw"
function outcome(h, a) {
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

// ---------------------------------------------------------------
// NAME MATCHING — results are typed into the sheet with slightly
// different spellings than the fixtures (nicknames, spaces,
// accents, sponsor tags). canon() normalises both sides so a
// prediction still matches its result. Add to NAME_ALIASES when a
// player's result-sheet name is genuinely different from their
// fixture name (left side = canon form of the variant, right side
// = canon form of the fixture name).
// ---------------------------------------------------------------
const NAME_ALIASES = {
  makaveli: "maka",                       // "Makaveli" -> "M a K a"
  maric: "cromaric",                      // "Marić" -> "CroMaric"
  bighitterjohnn: "johnmassey",           // "Bighitterjohnn" -> "John massey"
  rossisouth: "rosssouth",                // "Rossisouth" -> "Ross South"
  matthewlowe: "thomassmith0110",         // "Matthew Lowe" -> "thomassmith0110"
  goobsterbarsportsupplies: "goobster",   // "Goobster - BarSport Supplies" -> "Goobster"
};

function canon(name = "") {
  let s = String(name).toLowerCase();
  // strip accents (Alföldi -> alfoldi, Marić -> maric) and Polish ł
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0142/g, "l");
  // drop everything that isn't a-z or 0-9 (apostrophes, spaces, dashes, dots)
  s = s.replace(/[^a-z0-9]/g, "");
  return NAME_ALIASES[s] || s;
}

// ---------------------------------------------------------------
// MATCH FORMATS per division ("best of N legs", first to majority,
// draw when legs split evenly). Change the numbers here if formats
// change season to season.
// ---------------------------------------------------------------
const DIVISION_BEST_OF = {
  1: 10, 2: 10, 3: 10, 4: 10,
  5: 8, 6: 8, 7: 8, 8: 8, 9: 8, 10: 8, // TODO: confirm best-of for divs 5-10
};
const DEFAULT_BEST_OF = 8;

function bestOfForDivision(divisionName) {
  const m = String(divisionName || "").match(/\d+/);
  const n = m ? Number(m[0]) : 0;
  return DIVISION_BEST_OF[n] || DEFAULT_BEST_OF;
}

// All valid final scorelines for a "best of N legs" match:
// first to floor(N/2)+1 wins; if it splits evenly (N/2 - N/2) it's a draw.
// e.g. best of 10 -> 6-0..6-4 either way, or 5-5 draw.
function validScorelines(bestOf) {
  const winAt = Math.floor(bestOf / 2) + 1;
  const out = [];
  for (let loser = 0; loser < winAt; loser++) {
    if (winAt + loser > bestOf) continue;
    out.push([winAt, loser]);
  }
  const scores = [];
  for (const [w, l] of out) scores.push({ home: w, away: l });
  const drawLegs = bestOf / 2;
  if (Number.isInteger(drawLegs)) scores.push({ home: drawLegs, away: drawLegs });
  for (const [w, l] of out.slice().reverse()) scores.push({ home: l, away: w });
  return scores;
}

// Score one prediction against an actual result
function scorePick(pred, actual) {
  if (!actual) return 0;
  let pts = 0;
  const predOut = outcome(pred.homeScore, pred.awayScore);
  const actOut = outcome(actual.homeScore, actual.awayScore);
  if (predOut === actOut) pts += WINNER_PTS;
  if (
    Number(pred.homeScore) === Number(actual.homeScore) &&
    Number(pred.awayScore) === Number(actual.awayScore)
  )
    pts += EXACT_PTS;
  return pts;
}

export default function Predictions({ data, scriptUrl }) {
  const [tab, setTab] = useState("predict");
  const [playerName, setPlayerName] = useState("");
  const [picks, setPicks] = useState({}); // key -> {homeScore, awayScore}
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [predictions, setPredictions] = useState([]); // all predictions from sheet
  const [loadingLb, setLoadingLb] = useState(false);
  const [lbWeek, setLbWeek] = useState(null);
  const [openDivs, setOpenDivs] = useState({}); // which division sections are expanded

  // ---- Determine current week + upcoming fixtures ----
  // Your fixtures come grouped by division: { "Div 1": [...], ... } — flatten to a list
  const fixtures = useMemo(() => {
    const f = data?.fixtures;
    if (!f) return [];
    if (Array.isArray(f)) return f;
    return Object.values(f).flat();
  }, [data]);
  const results = data?.results || [];
  const players = data?.players || [];

  // Build a lookup of posted results by home|away|week for locking + scoring
  const resultMap = useMemo(() => {
    const m = {};
    results.forEach((r) => {
      const key = `${canon(r.home)}|${canon(r.away)}|${r.week}`;
      const parts = String(r.score).split("-").map((x) => Number(x.trim()));
      m[key] = { homeScore: parts[0], awayScore: parts[1] };
    });
    return m;
  }, [results]);

  // The week to predict = the lowest week that still has unplayed fixtures
  const currentWeek = useMemo(() => {
    const weeks = [...new Set(fixtures.map((f) => Number(f.week)))].sort((a, b) => a - b);
    for (const w of weeks) {
      const wkFix = fixtures.filter((f) => Number(f.week) === w);
      const anyOpen = wkFix.some(
        (f) => !resultMap[`${canon(f.home)}|${canon(f.away)}|${w}`]
      );
      if (anyOpen) return w;
    }
    return weeks[weeks.length - 1] || 1;
  }, [fixtures, resultMap]);

  const weekFixtures = useMemo(
    () => fixtures.filter((f) => Number(f.week) === Number(currentWeek)),
    [fixtures, currentWeek]
  );

  // Group this week's fixtures by division for collapsible sections
  const fixturesByDivision = useMemo(() => {
    const groups = {};
    weekFixtures.forEach((f) => {
      const d = f.division || "Other";
      if (!groups[d]) groups[d] = [];
      groups[d].push(f);
    });
    return groups;
  }, [weekFixtures]);

  const divisionOrder = useMemo(() => {
    return Object.keys(fixturesByDivision).sort((a, b) => {
      const na = Number(String(a).replace(/\D/g, "")) || 999;
      const nb = Number(String(b).replace(/\D/g, "")) || 999;
      if (na !== nb) return na - nb;
      return String(a).localeCompare(String(b));
    });
  }, [fixturesByDivision]);

  function toggleDiv(d) {
    setOpenDivs((o) => ({ ...o, [d]: !o[d] }));
  }

  function fixKey(f) {
    return `${canon(f.home)}|${canon(f.away)}|${currentWeek}`;
  }
  function isLocked(f) {
    return !!resultMap[fixKey(f)];
  }

  function setScore(key, side, val) {
    const v = val === "" ? "" : Math.max(0, Math.min(20, Number(val)));
    setPicks((p) => ({ ...p, [key]: { ...p[key], [side]: v } }));
    setSubmitted(false);
  }

  function setScoreline(key, value) {
    if (value === "") {
      setPicks((p) => ({ ...p, [key]: { ...p[key], homeScore: "", awayScore: "" } }));
    } else {
      const [h, a] = value.split("-").map(Number);
      setPicks((p) => ({ ...p, [key]: { ...p[key], homeScore: h, awayScore: a } }));
    }
    setSubmitted(false);
  }

  const openFixtures = weekFixtures.filter((f) => !isLocked(f));
  const filledCount = openFixtures.filter((f) => {
    const p = picks[fixKey(f)];
    return p && p.homeScore !== "" && p.homeScore != null && p.awayScore !== "" && p.awayScore != null;
  }).length;

  async function submit() {
    if (!playerName) {
      alert("Pick your name first");
      return;
    }
    const toSend = openFixtures
      .map((f) => {
        const p = picks[fixKey(f)];
        if (!p || p.homeScore === "" || p.homeScore == null || p.awayScore === "" || p.awayScore == null)
          return null;
        return {
          home: f.home,
          away: f.away,
          division: f.division,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
        };
      })
      .filter(Boolean);

    if (!toSend.length) {
      alert("Make at least one prediction first");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: playerName,
          week: `Week ${currentWeek}`,
          picks: toSend,
        }),
      });
      const out = await res.json();
      if (out.ok) {
        setSubmitted(true);
      } else {
        alert("Could not save: " + (out.error || "unknown error"));
      }
    } catch (e) {
      alert("Could not submit — check your connection and try again.");
    }
    setSubmitting(false);
  }

  // ---- Leaderboard: fetch predictions, score them ----
  const [lbError, setLbError] = useState("");

  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLoadingLb(true);
    setLbError("");
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPredictions(d.predictions || []);
        } else {
          setLbError(d.error || "Could not load predictions");
        }
      })
      .catch((e) => setLbError(String(e)))
      .finally(() => setLoadingLb(false));
  }, [tab]);

  // weeks that exist in predictions
  const predWeeks = useMemo(() => {
    const ws = [...new Set(predictions.map((p) => p.week))];
    ws.sort((a, b) => Number(String(b).replace(/\D/g, "")) - Number(String(a).replace(/\D/g, "")));
    return ws;
  }, [predictions]);

  const activeLbWeek = lbWeek || predWeeks[0] || null;

  // Build leaderboard for the selected week (or "Season")
  const leaderboard = useMemo(() => {
    const wkOf = (s) => Number(String(s).replace(/\D/g, ""));
    const scope =
      activeLbWeek === "Season"
        ? predictions
        : predictions.filter((p) => wkOf(p.week) === wkOf(activeLbWeek));

    const totals = {};
    scope.forEach((p) => {
      const wkNum = wkOf(p.week);
      const actual = resultMap[`${canon(p.home)}|${canon(p.away)}|${wkNum}`];
      const pts = scorePick(p, actual);
      // Ensure every predictor appears, even on 0 points
      totals[p.player] = (totals[p.player] || 0) + pts;
    });

    return Object.entries(totals)
      .map(([player, pts]) => ({ player, pts }))
      .sort((a, b) => b.pts - a.pts);
  }, [predictions, activeLbWeek, resultMap]);

  // =================== RENDER ===================
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-odcGreen">Predictions Game</p>
      <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
        {tab === "predict" ? `Predict Week ${currentWeek}` : "Leaderboard"}
      </h2>
      <p className="mt-2 text-sm text-odcCream/60">
        {WINNER_PTS} pts correct winner · +{EXACT_PTS} pts exact score. Locks when results post.
      </p>

      {/* Tabs */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setTab("predict")}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
            tab === "predict"
              ? "bg-odcGreen text-odcBlack"
              : "border border-odcGold/20 bg-white/[0.03] text-odcCream/60"
          }`}
        >
          Predict
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
            tab === "leaderboard"
              ? "bg-odcGreen text-odcBlack"
              : "border border-odcGold/20 bg-white/[0.03] text-odcCream/60"
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* ---------- PREDICT TAB ---------- */}
      {tab === "predict" && (
        <div className="mt-5">
          {/* Name dropdown */}
          <div className="rounded-xl border border-odcGold/25 bg-odcNavy p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-odcGold">Playing as</p>
            <select
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-xl border border-odcGold/30 bg-odcBlack/60 px-4 py-3 text-base font-semibold text-odcCream outline-none"
            >
              <option value="">Select your name…</option>
              {players
                .map((p) => (typeof p === "string" ? p : p.name))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mb-3 mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold">Week {currentWeek} Fixtures</span>
            <span className="text-xs text-odcCream/55">{filledCount}/{openFixtures.length} predicted</span>
          </div>

          {weekFixtures.length === 0 && (
            <p className="rounded-lg border border-odcGold/15 bg-white/[0.03] p-6 text-center text-sm text-odcCream/60">
              No fixtures found for this week yet. Check back soon.
            </p>
          )}

          {divisionOrder.map((division) => {
            const divFixtures = fixturesByDivision[division];
            const isOpen = openDivs[division] ?? false;
            const openCount = divFixtures.filter((f) => !isLocked(f)).length;
            const predictedInDiv = divFixtures.filter((f) => {
              const p = picks[fixKey(f)];
              return p && p.homeScore !== "" && p.homeScore != null && p.awayScore !== "" && p.awayScore != null;
            }).length;
            return (
              <div key={division} className="mb-3 overflow-hidden rounded-xl border border-odcGold/15 bg-odcNavy">
                {/* Division header — tap to expand/collapse */}
                <button
                  onClick={() => toggleDiv(division)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base font-semibold text-odcCream">{division}</span>
                    <span className="rounded-full bg-odcGold/15 px-2.5 py-1 text-[10px] font-semibold text-odcGold">
                      {divFixtures.length} {divFixtures.length === 1 ? "game" : "games"}
                    </span>
                    <span className="rounded-full border border-odcGold/25 px-2.5 py-1 text-[10px] font-semibold text-odcCream/70">
                      Best of {bestOfForDivision(division)} legs · first to {Math.floor(bestOfForDivision(division) / 2) + 1}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {openCount > 0 && (
                      <span className="text-[11px] font-semibold text-odcCream/55">{predictedInDiv}/{openCount}</span>
                    )}
                    <span className={`text-odcGold transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </span>
                </button>

                {/* Fixtures inside this division */}
                {isOpen && (
                  <div className="space-y-2 px-3 pb-3">
                    {divFixtures.map((f, i) => {
                      const key = fixKey(f);
                      const locked = isLocked(f);
                      const p = picks[key] || {};
                      const actual = resultMap[key];
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border border-odcGold/12 bg-odcBlack/20 p-4 ${locked ? "opacity-60" : ""}`}
                        >
                          {locked && (
                            <span className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-odcGold/12 px-2.5 py-1 text-[9px] font-semibold text-odcGold">
                              🔒 Locked · result posted
                            </span>
                          )}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <span className="text-sm font-semibold">{f.home}</span>
                            <div className="flex items-center justify-center gap-2">
                              {locked ? (
                                <span className="rounded-xl bg-odcGreen px-4 py-2 text-lg font-semibold text-odcBlack">
                                  {actual?.homeScore ?? "–"} – {actual?.awayScore ?? "–"}
                                </span>
                              ) : (
                                <select
                                  value={
                                    p.homeScore !== "" && p.homeScore != null && p.awayScore !== "" && p.awayScore != null
                                      ? `${p.homeScore}-${p.awayScore}`
                                      : ""
                                  }
                                  onChange={(e) => setScoreline(key, e.target.value)}
                                  className={`h-11 rounded-xl border px-3 text-center text-base font-semibold outline-none ${
                                    p.homeScore !== "" && p.homeScore != null
                                      ? "border-transparent bg-odcGreen text-odcBlack"
                                      : "border-odcGold/30 bg-odcBlack/60 text-odcCream"
                                  }`}
                                >
                                  <option value="">– pick score –</option>
                                  {validScorelines(bestOfForDivision(division)).map(({ home, away }) => (
                                    <option key={`${home}-${away}`} value={`${home}-${away}`}>
                                      {home} – {away}{home === away ? " (draw)" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <span className="text-right text-sm font-semibold">{f.away}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {openFixtures.length > 0 && (
            <button
              onClick={submit}
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-odcGreen px-6 py-4 text-base font-semibold text-odcBlack transition disabled:opacity-60"
            >
              {submitting ? "Submitting…" : submitted ? "✓ Predictions Saved!" : "Submit My Predictions"}
            </button>
          )}
          {submitted && (
            <p className="mt-3 text-center text-sm font-semibold text-odcGreen">
              Saved! Come back after results post to see your points.
            </p>
          )}
        </div>
      )}

      {/* ---------- LEADERBOARD TAB ---------- */}
      {tab === "leaderboard" && (
        <div className="mt-5">
          {/* Week pills */}
          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
            {[...predWeeks, "Season"].map((w) => (
              <button
                key={w}
                onClick={() => setLbWeek(w)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeLbWeek === w
                    ? "border border-odcGold/40 bg-odcGold/15 text-odcGold"
                    : "border border-odcGold/20 bg-white/[0.03] text-odcCream/60"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {loadingLb && <p className="py-8 text-center text-sm text-odcCream/60">Loading leaderboard…</p>}

          {!loadingLb && lbError && (
            <p className="rounded-lg border border-odcRed/30 bg-odcRed/10 p-4 text-center text-sm text-odcCream/80">
              Couldn't load predictions. Try again shortly.
            </p>
          )}

          {!loadingLb && leaderboard.length === 0 && (
            <p className="rounded-lg border border-odcGold/15 bg-white/[0.03] p-6 text-center text-sm text-odcCream/60">
              No scored predictions yet. Once results are posted, points appear here.
            </p>
          )}

          {/* Podium */}
          {!loadingLb && leaderboard.length >= 3 && (
            <div className="mb-4 flex items-end justify-center gap-3">
              {[1, 0, 2].map((idx, pos) => {
                const entry = leaderboard[idx];
                const isFirst = idx === 0;
                return (
                  <div key={idx} className="flex-1 text-center">
                    <p className="mb-1 text-[10px] font-semibold text-odcCream/40">
                      {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}
                    </p>
                    <div
                      className={`mx-auto mb-2 flex items-center justify-center rounded-lg font-semibold text-odcBlack ${
                        isFirst ? "h-16 w-16" : "h-14 w-14"
                      }`}
                      style={{
                        background: isFirst
                          ? "linear-gradient(135deg,#E8C766,#a8852f)"
                          : "linear-gradient(135deg,#22d97a,#0c8f4c)",
                      }}
                    >
                      {initials(entry.player)}
                    </div>
                    <p className="text-sm font-semibold">{entry.player}</p>
                    <p className="text-xs font-semibold text-odcGold">{entry.pts} pts</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rows 4+ */}
          {!loadingLb &&
            leaderboard.slice(leaderboard.length >= 3 ? 3 : 0).map((entry, i) => {
              const rank = (leaderboard.length >= 3 ? 3 : 0) + i + 1;
              return (
                <div
                  key={entry.player}
                  className="mb-2 flex items-center gap-4 rounded-lg border border-odcGold/14 bg-odcNavy px-4 py-3"
                >
                  <span className="w-6 text-base font-semibold text-odcGreen">{rank}</span>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-odcBlack"
                    style={{ background: "linear-gradient(135deg,#22d97a,#0c8f4c)" }}
                  >
                    {initials(entry.player)}
                  </div>
                  <span className="flex-1 text-base font-semibold">{entry.player}</span>
                  <span className="text-lg font-semibold text-odcGold">
                    {entry.pts}
                    <span className="text-[10px] text-odcCream/40"> pts</span>
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
