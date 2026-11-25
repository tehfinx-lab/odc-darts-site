// Server-side proxy to the Predictions Apps Script (avoids browser CORS).
// Saving needs a Discord sign-in: the name comes from the Players tab
// (Discord ID -> league name), never from the browser, so nobody can
// predict as someone else.
import { getSession, discordAvatarUrl } from "../../../lib/session";
import { findPlayerByDiscordId, allAvatars, saveAvatar } from "../../../lib/sheetsWrite";

export const dynamic = "force-dynamic";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwgYMa3bXTQZIzuCp4fNyVwm46QvXqk72gY5UiK9pNd1ZonxWlB7i9-vUtMBR1rMbH7Ng/exec";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  let data;
  try {
    const res = await fetch(SCRIPT_URL, { redirect: "follow", cache: "no-store" });
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { ok: false, error: "Script did not return JSON", raw: text.slice(0, 300) };
    }
  } catch (err) {
    data = { ok: false, error: String(err), predictions: [] };
  }
  try {
    data.avatars = await allAvatars();
  } catch {
    data.avatars = [];
  }
  return jsonResponse(data);
}

export async function POST(request) {
  let s = null;
  try {
    s = getSession(request);
  } catch {}
  if (!s) return jsonResponse({ ok: false, error: "Sign in with Discord to save predictions." }, 401);

  let player = "";
  try {
    player = (await findPlayerByDiscordId(s.id))?.name || "";
  } catch {}
  if (!player) player = s.player || "";
  if (!player) {
    return jsonResponse({
      ok: false,
      error: "Your Discord isn't linked to a league player yet. Ask an admin to add your Discord ID on the Players tab.",
    }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }
  body = { ...body, player }; // always the signed-in player

  // keep their Discord picture for the leaderboard (never blocks saving)
  try {
    await saveAvatar(player, s.id, discordAvatarUrl(s.id, s.avatar));
  } catch (e) {
    console.error("saveAvatar", e);
  }

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { ok: false, error: "Script did not return JSON", raw: text.slice(0, 300) };
    }
    return jsonResponse({ ...data, player });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
