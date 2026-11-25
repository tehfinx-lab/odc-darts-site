// Read and write the league sheet with the bot's Google service account.
// The JSON from the bot's service_account.json goes in the Vercel setting
// GOOGLE_SERVICE_ACCOUNT. Nothing here is sent to the browser.
import crypto from "crypto";

export const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";
const API = "https://sheets.googleapis.com/v4/spreadsheets";

let cached = { token: "", exp: 0 };

function account() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT || "";
  if (!raw.trim()) return null;
  try {
    const acc = JSON.parse(raw);
    if (!acc.client_email || !acc.private_key) return null;
    acc.private_key = acc.private_key.replace(/\\n/g, "\n");
    return acc;
  } catch {
    return null;
  }
}

export function sheetsConfigured() {
  return !!account();
}

async function accessToken() {
  if (cached.token && cached.exp > Date.now() / 1000 + 60) return cached.token;
  const acc = account();
  if (!acc) throw new Error("GOOGLE_SERVICE_ACCOUNT is not set in Vercel");
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = enc({ alg: "RS256", typ: "JWT" });
  const claim = enc({
    iss: acc.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const sig = crypto.createSign("RSA-SHA256").update(`${head}.${claim}`).sign(acc.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claim}.${sig}`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${json.error_description || json.error || res.status}`);
  cached = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return cached.token;
}

const q = (tab) => `'${String(tab).replace(/'/g, "''")}'`;

export async function getRows(tab) {
  const token = await accessToken();
  const res = await fetch(`${API}/${SHEET_ID}/values/${encodeURIComponent(q(tab))}?majorDimension=ROWS`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Could not read ${tab}: ${json.error?.message || res.status}`);
  return json.values || [];
}

// RAW = stored exactly as typed, so nobody can slip a formula into the sheet
export async function updateRow(tab, rowNumber, values) {
  const token = await accessToken();
  const range = `${q(tab)}!A${rowNumber}`;
  const res = await fetch(`${API}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Could not save to ${tab}: ${json.error?.message || res.status}`);
  return json;
}

export async function appendRow(tab, values) {
  const token = await accessToken();
  const range = `${q(tab)}!A1`;
  const res = await fetch(
    `${API}/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Could not add to ${tab}: ${json.error?.message || res.status}`);
  return json;
}

export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ---------- Players tab: Discord ID -> league name ----------
const PLAYERS_GID = "1263320039";

function parseCsv(t) {
  const rows = [];
  let row = [], v = "", inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1];
    if (c === '"' && inQ && n === '"') { v += '"'; i++; }
    else if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) { row.push(v); v = ""; }
    else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && n === "\n") i++;
      row.push(v); rows.push(row); row = []; v = "";
    } else v += c;
  }
  if (v || row.length) { row.push(v); rows.push(row); }
  return rows;
}

async function playersRows() {
  if (sheetsConfigured()) {
    try { return await getRows("Players"); } catch (e) { console.error(e); }
  }
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PLAYERS_GID}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Players tab returned ${res.status}`);
  return parseCsv(await res.text());
}

export async function findPlayerByDiscordId(discordId) {
  const rows = await playersRows();
  const head = (rows[0] || []).map(norm);
  const nameCol = head.findIndex((h) => ["player", "playername", "name"].includes(h));
  const idCol = head.findIndex((h) => ["discordid", "discord", "userid"].includes(h));
  const divCol = head.findIndex((h) => h === "division");
  if (nameCol < 0 || idCol < 0) return null;
  const want = String(discordId).trim();
  for (const r of rows.slice(1)) {
    if (String(r[idCol] || "").trim() === want && String(r[nameCol] || "").trim()) {
      return { name: String(r[nameCol]).trim(), division: divCol >= 0 ? String(r[divCol] || "").trim() : "" };
    }
  }
  return null;
}

export async function playerNames() {
  const rows = await playersRows();
  const head = (rows[0] || []).map(norm);
  const nameCol = head.findIndex((h) => ["player", "playername", "name"].includes(h));
  if (nameCol < 0) return [];
  return rows.slice(1).map((r) => String(r[nameCol] || "").trim()).filter(Boolean);
}

// ---------- Profiles tab ----------
export const PROFILES_TAB = "Profiles";
// form field -> Profiles column header (same headers /createprofile uses)
export const PROFILE_FIELDS = {
  nickname: "Darts Nickname",
  nationality: "Nationality",
  handedness: "Handedness",
  darts: "Darts",
  weight: "Weight",
  favFinish: "Fav Finish (170 etc)",
  favDouble: "Fav Double",
  favPro: "Fav Pro Player",
  walkOn: "Walk on Song",
};

export async function readProfile(player) {
  const rows = await getRows(PROFILES_TAB);
  const head = rows[0] || [];
  const at = rows.findIndex((r, i) => i > 0 && norm(r[0]) === norm(player));
  const row = at > 0 ? rows[at] : [];
  const out = {};
  for (const [k, h] of Object.entries(PROFILE_FIELDS)) {
    const c = head.findIndex((x) => norm(x) === norm(h));
    out[k] = c >= 0 ? String(row[c] || "") : "";
  }
  return out;
}

export async function saveProfile(player, fields) {
  const rows = await getRows(PROFILES_TAB);
  const head = rows[0] || [];
  if (!head.length) throw new Error("The Profiles tab has no header row");
  const at = rows.findIndex((r, i) => i > 0 && norm(r[0]) === norm(player));
  const row = at > 0 ? [...rows[at]] : [player];
  while (row.length < head.length) row.push("");
  row[0] = at > 0 ? row[0] : player;
  for (const [k, h] of Object.entries(PROFILE_FIELDS)) {
    if (!(k in fields)) continue;
    const c = head.findIndex((x) => norm(x) === norm(h));
    if (c >= 0) row[c] = fields[k];
  }
  if (at > 0) await updateRow(PROFILES_TAB, at + 1, row);
  else await appendRow(PROFILES_TAB, row);
}

// ---------- Images tab (the bot's /profile card reads this too) ----------
export const IMAGES_TAB = "Images";

export async function readPicture(player) {
  try {
    const rows = await getRows(IMAGES_TAB);
    const r = rows.find((x, i) => i > 0 && norm(x[0]) === norm(player));
    const url = r && r[1] ? String(r[1]).trim() : "";
    // old /createprofile pictures were temporary Discord uploads that have expired
    if (!/^https:\/\//.test(url) || /ephemeral-attachments|[?&]ex=[0-9a-f]+/i.test(url)) return "";
    return url;
  } catch {
    return "";
  }
}

export async function savePicture(player, url) {
  const rows = await getRows(IMAGES_TAB);
  const at = rows.findIndex((r, i) => i > 0 && norm(r[0]) === norm(player));
  if (at > 0) await updateRow(IMAGES_TAB, at + 1, [rows[at][0], url]);
  else await appendRow(IMAGES_TAB, [player, url]);
}

// ---------- Site Avatars tab: league name -> Discord picture ----------
// Filled when a player signs in on the site, and by the bot's /syncavatars
// for everyone with a Discord ID on the Players tab.
export const AVATARS_TAB = "Site Avatars";
const AVATAR_HEAD = ["Player", "Discord ID", "Avatar URL", "Updated"];

async function ensureTab(title, header) {
  const token = await accessToken();
  const meta = await fetch(`${API}/${SHEET_ID}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).then((r) => r.json());
  const has = (meta.sheets || []).some((s) => s.properties?.title === title);
  if (has) return;
  const res = await fetch(`${API}/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    // someone else may have just made it
    if (!/already exists/i.test(j.error?.message || "")) throw new Error(`Could not create ${title}: ${j.error?.message || res.status}`);
  }
  await updateRow(title, 1, header);
}

export async function saveAvatar(player, discordId, url) {
  if (!player || !url || !sheetsConfigured()) return;
  await ensureTab(AVATARS_TAB, AVATAR_HEAD);
  const rows = await getRows(AVATARS_TAB);
  const at = rows.findIndex((r, i) => i > 0 && (String(r[1] || "") === String(discordId) || norm(r[0]) === norm(player)));
  const row = [player, String(discordId), url, new Date().toISOString().slice(0, 10)];
  if (at > 0) {
    const old = rows[at];
    if (old[0] === row[0] && old[2] === row[2]) return; // nothing changed
    await updateRow(AVATARS_TAB, at + 1, row);
  } else {
    await appendRow(AVATARS_TAB, row);
  }
}

// [{ name, url }] — an uploaded site picture wins over the Discord one.
export async function allAvatars() {
  const out = new Map();
  if (!sheetsConfigured()) return [];
  try {
    const rows = await getRows(AVATARS_TAB);
    rows.slice(1).forEach((r) => {
      const name = String(r[0] || "").trim(), url = String(r[2] || "").trim();
      if (name && /^https:\/\//.test(url)) out.set(norm(name), { name, url });
    });
  } catch {}
  try {
    const rows = await getRows(IMAGES_TAB);
    rows.slice(1).forEach((r) => {
      const name = String(r[0] || "").trim(), url = String(r[1] || "").trim();
      if (!name || !/^https:\/\//.test(url) || /ephemeral-attachments|[?&]ex=[0-9a-f]+/i.test(url)) return;
      out.set(norm(name), { name, url });
    });
  } catch {}
  return [...out.values()];
}
