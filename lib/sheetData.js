// Replace these demo arrays with Google Sheets data later.
// First goal: get the website online and looking right.

export const tables = {
  "Premier Division": [
    { pos: 1, name: "The Ton Machines", played: 8, wins: 7, losses: 1, legs: "+31", points: 21, form: "W W W L W" },
    { pos: 2, name: "Checkout Kings", played: 8, wins: 6, losses: 2, legs: "+18", points: 18, form: "W L W W W" },
    { pos: 3, name: "ODC Arrows", played: 8, wins: 5, losses: 3, legs: "+9", points: 15, form: "L W W L W" },
    { pos: 4, name: "Double Trouble", played: 8, wins: 3, losses: 5, legs: "-6", points: 9, form: "W L L W L" },
    { pos: 5, name: "The Wire Hunters", played: 8, wins: 2, losses: 6, legs: "-21", points: 6, form: "L L W L L" },
    { pos: 6, name: "Mad House FC", played: 8, wins: 1, losses: 7, legs: "-31", points: 3, form: "L L L W L" },
  ],
  "Division 1": [
    { pos: 1, name: "Flight Club", played: 6, wins: 5, losses: 1, legs: "+22", points: 15, form: "W W L W W" },
    { pos: 2, name: "Red Bit Warriors", played: 6, wins: 4, losses: 2, legs: "+11", points: 12, form: "L W W W L" },
    { pos: 3, name: "Treble Makers", played: 6, wins: 3, losses: 3, legs: "+2", points: 9, form: "W L W L W" },
    { pos: 4, name: "The Oche Mob", played: 6, wins: 2, losses: 4, legs: "-13", points: 6, form: "L W L L W" },
  ],
  "Nightly Events": [
    { pos: 1, name: "Sunday Shootout", played: 4, wins: 3, losses: 1, legs: "+12", points: 9, form: "W W L W" },
    { pos: 2, name: "Friday Frenzy", played: 4, wins: 2, losses: 2, legs: "+1", points: 6, form: "W L W L" },
    { pos: 3, name: "Midweek Madness", played: 4, wins: 1, losses: 3, legs: "-13", points: 3, form: "L L W L" },
  ],
};

export const players = [
  { name: "Ace Archer", team: "The Ton Machines", avg: 74.2, checkout: "38%", highCheckout: 132, tons: 18, wins: 7 },
  { name: "Mason Flight", team: "Checkout Kings", avg: 71.5, checkout: "35%", highCheckout: 120, tons: 15, wins: 6 },
  { name: "Ryan Redbit", team: "ODC Arrows", avg: 69.8, checkout: "32%", highCheckout: 116, tons: 12, wins: 5 },
  { name: "Luke Tops", team: "Double Trouble", avg: 66.1, checkout: "30%", highCheckout: 104, tons: 9, wins: 4 },
  { name: "Jay Wire", team: "The Wire Hunters", avg: 63.7, checkout: "27%", highCheckout: 96, tons: 7, wins: 3 },
  { name: "Tom Madhouse", team: "Mad House FC", avg: 59.4, checkout: "24%", highCheckout: 84, tons: 4, wins: 2 },
];

export const results = [
  { home: "Ace Archer", away: "Mason Flight", score: "6 - 4", avg: "74.2", checkout: "132 C/O" },
  { home: "Ryan Redbit", away: "Luke Tops", score: "6 - 2", avg: "69.8", checkout: "116 C/O" },
  { home: "Jay Wire", away: "Tom Madhouse", score: "5 - 6", avg: "63.7", checkout: "96 C/O" },
];

export const events = [
  { title: "Sunday Shootout", winner: "Ace Archer", runnerUp: "Mason Flight", date: "Latest Winner", prize: "Nightly Champion" },
  { title: "Friday Frenzy", winner: "Ryan Redbit", runnerUp: "Luke Tops", date: "Last Friday", prize: "ODC Winner" },
  { title: "Midweek Madness", winner: "Mason Flight", runnerUp: "Ace Archer", date: "Wednesday", prize: "Weekly Finalist" },
];
