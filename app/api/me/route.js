import { NextResponse } from "next/server";
import { getSession, isAdmin, discordAvatarUrl } from "../../../lib/session";
import { findPlayerByDiscordId, readPicture, readProfile, sheetsConfigured, playerNames } from "../../../lib/sheetsWrite";

export const dynamic = "force-dynamic";

// Who is signed in, which league player they are, and their editable profile.
export async function GET(request) {
  let s = null;
  try {
    s = getSession(request);
  } catch {
    return NextResponse.json({ signedIn: false, setup: false });
  }
  if (!s) return NextResponse.json({ signedIn: false, setup: !!process.env.DISCORD_CLIENT_ID });

  // re-check the Players tab so an admin fixing a Discord ID works without signing out
  let player = s.player;
  if (!player) {
    try {
      player = (await findPlayerByDiscordId(s.id))?.name || "";
    } catch {}
  }

  const admin = isAdmin(s.id);
  const canWrite = sheetsConfigured();
  const target = admin ? new URL(request.url).searchParams.get("player") || player : player;

  let profile = null, picture = "", names = [];
  if (target && canWrite) {
    try { profile = await readProfile(target); } catch (e) { console.error(e); }
    picture = await readPicture(target);
  }
  if (admin && canWrite) {
    try { names = await playerNames(); } catch {}
  }

  return NextResponse.json({
    signedIn: true,
    discord: { id: s.id, name: s.name, avatarUrl: discordAvatarUrl(s.id, s.avatar) },
    player,
    target,
    admin,
    adminPlayers: names,
    canEdit: canWrite,
    canUpload: canWrite && !!process.env.BLOB_READ_WRITE_TOKEN,
    profile,
    picture,
  });
}
