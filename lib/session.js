// Signed sign-in cookie. No database: the cookie holds who you are, and the
// AUTH_SECRET signature stops anyone editing it to pretend to be someone else.
import crypto from "crypto";

export const SESSION_COOKIE = "odc_session";
export const STATE_COOKIE = "odc_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET || "";
  if (s.length < 16) throw new Error("AUTH_SECRET is missing or too short (set it in Vercel)");
  return s;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function sign(payload) {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

export function createSessionToken(data) {
  const body = b64url(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [body, sig] = token.split(".");
    const good = sign(body);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSession(request) {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE,
};

export function isAdmin(discordId) {
  const ids = String(process.env.ADMIN_DISCORD_IDS || "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return ids.includes(String(discordId));
}

export function discordAvatarUrl(id, avatar) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`;
  // default Discord avatar for accounts without one
  const idx = Number((BigInt(id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

// One fixed address in production so the Discord redirect always matches,
// even if someone opened the site on www. or the vercel.app address.
export function siteOrigin(request) {
  const fixed = process.env.SITE_URL || (process.env.VERCEL_ENV === "production" ? "https://onlinedartscircuit.co.uk" : "");
  return (fixed || new URL(request.url).origin).replace(/\/$/, "");
}
