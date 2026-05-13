export const fallbackData = {
  tables: {
    "Demo Division": [
      { pos: 1, name: "Demo Player", played: 1, wins: 1, losses: 0, draws: 0, legs: "+4", points: 2, form: "W" },
    ],
  },
  players: [
    {
      name: "Demo Player",
      team: "Demo Division",
      division: "Demo Division",
      avg: 60,
      nineAvg: 70,
      checkout: "100",
      highCheckout: 100,
      tons: 1,
      bestLeg: 24,
      wins: 1,
      played: 1,
    },
  ],
  results: [
    {
      home: "Demo Player",
      away: "Demo Opponent",
      score: "6 - 2",
      avg: "60",
      checkout: "100 C/O",
      division: "Demo Division",
      p1Stats: { legsFor: 6, legsAgainst: 2, avg: 60, nineAvg: 70, highCheckout: 100, tons: 1, bestLeg: 24 },
      p2Stats: { legsFor: 2, legsAgainst: 6, avg: 50, nineAvg: 55, highCheckout: 40, tons: 0, bestLeg: 30 },
    },
  ],
  allResults: [],
  fixtures: {},
  weeklyMvps: [],
  masterStats: {},
  currentWeek: 7,
  mvpWeek: 6,
  events: [],
};

export async function getLiveLeagueData() {
  const res = await fetch("/api/league-data", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch live league data");
  return res.json();
}
