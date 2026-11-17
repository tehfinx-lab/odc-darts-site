import { NextResponse } from "next/server";
import {
  SESSION_COOKIE, STATE_COOKIE, createSessionToken, sessionCookieOptions, siteOrigin,
} from "../../../../../lib/session";
import { findPlayerByDiscordId } from "../../../../../lib/sheetsWrite";

export const dynamic = "force-dynamic";

// Discord sends the player back here after they tap "Authorise".
export async function GET(request) {
  const origin = siteOrigin(request);
  const url = new URL(request.url);
  const fail = (why) => {
    const res = NextResponse.redirect(`${origin}/?signin=${why}#hub`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (url.searchParams.get("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !saved || state !== saved) return fail("expired");

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/auth/callback/discord`,
      }),
      cache: "no-store",
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) {
      console.error("Discord token exchange failed", token);
      return fail("discord");
    }

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) return fail("discord");

    let player = null;
    try {
      player = await findPlayerByDiscordId(me.id);
    } catch (e) {
      console.error("Players lookup failed", e);
    }

    const session = createSessionToken({
      id: me.id,
      name: me.global_name || me.username,
      avatar: me.avatar || "",
      player: player?.name || "",
    });
    const res = NextResponse.redirect(`${origin}/#hub`);
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e) {
    console.error("Sign-in failed", e);
    return fail("error");
  }
}
