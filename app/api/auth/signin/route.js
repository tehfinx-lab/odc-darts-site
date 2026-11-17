import crypto from "crypto";
import { NextResponse } from "next/server";
import { STATE_COOKIE, siteOrigin } from "../../../../lib/session";

export const dynamic = "force-dynamic";

// Sends the player to Discord's "Authorise ODC" screen.
export async function GET(request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${siteOrigin(request)}/?signin=not-set-up#hub`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "identify",
    redirect_uri: `${siteOrigin(request)}/api/auth/callback/discord`,
    state,
    prompt: "none",
  });
  const res = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
