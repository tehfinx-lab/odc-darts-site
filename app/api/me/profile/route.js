import { NextResponse } from "next/server";
import { getSession, isAdmin } from "../../../../lib/session";
import { PROFILE_FIELDS, saveProfile, sheetsConfigured, norm, playerNames } from "../../../../lib/sheetsWrite";

export const dynamic = "force-dynamic";

const MAX = { walkOn: 80, favPro: 60, darts: 60, default: 40 };

function clean(k, v) {
  let t = String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  t = t.slice(0, MAX[k] || MAX.default);
  return t;
}

// Saves the signed-in player's own profile (admins can save anyone's).
export async function POST(request) {
  const s = getSession(request);
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!sheetsConfigured()) return NextResponse.json({ error: "Profile saving isn't switched on yet." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  let player = s.player;
  if (isAdmin(s.id) && body.player) {
    const names = await playerNames();
    player = names.find((n) => norm(n) === norm(body.player)) || "";
  }
  if (!player) return NextResponse.json({ error: "Your Discord isn't on the league list yet. Ask an admin." }, { status: 403 });

  const fields = {};
  for (const k of Object.keys(PROFILE_FIELDS)) {
    if (body.fields && k in body.fields) fields[k] = clean(k, body.fields[k]);
  }
  try {
    await saveProfile(player, fields);
    return NextResponse.json({ ok: true, player });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't save to the sheet. Try again in a minute." }, { status: 500 });
  }
}
