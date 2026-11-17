import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession, isAdmin } from "../../../../lib/session";
import { savePicture, sheetsConfigured, norm, playerNames } from "../../../../lib/sheetsWrite";

export const dynamic = "force-dynamic";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

async function whoFor(request, s, asked) {
  if (isAdmin(s.id) && asked) {
    const names = await playerNames();
    return names.find((n) => norm(n) === norm(asked)) || "";
  }
  return s.player;
}

// Upload a new profile picture. Saved to the Images tab so the bot's
// /profile card uses it too.
export async function POST(request) {
  const s = getSession(request);
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!sheetsConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Picture uploads aren't switched on yet." }, { status: 503 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const player = await whoFor(request, s, form?.get("player"));
  if (!player) return NextResponse.json({ error: "Your Discord isn't on the league list yet." }, { status: 403 });
  if (!file || typeof file === "string") return NextResponse.json({ error: "Choose a picture first." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP picture." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That picture is over 4MB." }, { status: 400 });

  try {
    const slug = norm(player) || "player";
    const blob = await put(`avatars/${slug}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    await savePicture(player, blob.url);
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}

// Remove the uploaded picture and go back to the Discord one.
export async function DELETE(request) {
  const s = getSession(request);
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!sheetsConfigured()) return NextResponse.json({ error: "Not switched on yet." }, { status: 503 });
  const player = await whoFor(request, s, new URL(request.url).searchParams.get("player"));
  if (!player) return NextResponse.json({ error: "Your Discord isn't on the league list yet." }, { status: 403 });
  try {
    await savePicture(player, "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't update the sheet." }, { status: 500 });
  }
}
