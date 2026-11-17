import { NextResponse } from "next/server";
import { SESSION_COOKIE, siteOrigin } from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const res = NextResponse.redirect(`${siteOrigin(request)}/`);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
