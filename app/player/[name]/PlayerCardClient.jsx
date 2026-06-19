"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formStyle(ch) {
  if (ch === "W") return { background: "rgba(22,196,108,.28)", color: "#22d97a" };
  if (ch === "L") return { background: "rgba(229,29,42,.22)", color: "#ff6b6b" };
  return { background: "rgba(232,199,102,.2)", color: "#E8C766" };
}

export default function PlayerCardClient() {
  const params = useParams();
  const slug = decodeURIComponent(params?.name || "");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
    fetch("/api/league-data")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Find the player (case-insensitive, also match by slug form)
  const players = data?.players || [];
  const player = players.find(
    (p) =>
      String(p.name).toLowerCase() === slug.toLowerCase() ||
      String(p.name).toLowerCase().replace(/\s+/g, "-") === slug.toLowerCase()
  );

  // Work out their rank in their division from the table
  let rank = null;
  if (player && data?.tables) {
    const table = data.tables[player.division];
    if (Array.isArray(table)) {
      const idx = table.findIndex(
        (row) => String(row.name).toLowerCase() === String(player.name).toLowerCase()
      );
      if (idx >= 0) rank = idx + 1;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function shareDiscord() {
    // Discord has no direct web-share intent; copy the link and open Discord
    copyLink();
    window.open("https://discord.com/channels/@me", "_blank");
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${player?.name} — ODC`,
          text: `Check out ${player?.name}'s stats on the Online Darts Circuit`,
          url: shareUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(175deg,#0a3320,#04190f_65%,#020d08)] text-odcCream">
        <p className="text-sm text-odcCream/60">Loading player…</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(175deg,#0a3320,#04190f_65%,#020d08)] px-6 text-center text-odcCream">
        <img src="/odc-logo.png" alt="ODC" className="w-24 opacity-80" />
        <h1 className="text-2xl font-black">Player not found</h1>
        <p className="text-sm text-odcCream/60">
          We couldn't find a player called "{slug}".
        </p>
        <a href="/" className="mt-2 rounded-2xl bg-odcGreen px-5 py-3 font-black text-odcBlack">
          Back to ODC
        </a>
      </main>
    );
  }

  const formArr = String(player.form || "").trim().split(/\s+/).filter(Boolean).slice(-5);

  return (
    <main className="min-h-screen bg-[linear-gradient(175deg,#0a3320,#04190f_65%,#020d08)] px-4 py-8 text-odcCream">
      <div className="mx-auto max-w-md">
        {/* back link */}
        <a href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-black text-odcCream/60">
          ← ODC Home
        </a>

        {/* THE CARD */}
        <div
          className="relative overflow-hidden rounded-[28px] border border-odcGold/30 p-0"
          style={{
            background: "linear-gradient(160deg,#0a3a23 0%,#072818 55%,#04190f 100%)",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,.8),0 0 50px -20px rgba(22,196,108,.4)",
          }}
        >
          <div className="pointer-events-none absolute -right-12 -top-10 h-60 w-60 rounded-full bg-odcGreen/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-52 w-52 rounded-full bg-odcGold/15 blur-3xl" />
          <img src="/odc-logo.png" alt="" className="pointer-events-none absolute -right-8 -bottom-8 w-52 opacity-[0.07]" />

          <div className="relative z-10 p-7">
            {/* top brand row */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/odc-logo.png" alt="ODC" className="h-8 w-8" />
                <span className="text-xs font-black tracking-wide">ONLINE DARTS CIRCUIT</span>
              </div>
              <span className="rounded-full border border-odcGold/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-odcGold">
                Season 4
              </span>
            </div>

            {/* player head */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[22px] text-2xl font-black text-odcBlack"
                style={{
                  background: "linear-gradient(135deg,#22d97a,#0c8f4c)",
                  boxShadow: "0 12px 26px -6px rgba(22,196,108,.5),0 1px 0 rgba(255,255,255,.3) inset",
                }}
              >
                {initials(player.name)}
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-odcGold">
                  {player.division}
                </div>
                <div className="mt-0.5 text-3xl font-black leading-tight">{player.name}</div>
                {formArr.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {formArr.map((ch, i) => (
                      <span
                        key={i}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[11px] font-black"
                        style={formStyle(ch)}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* stats */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="col-span-2 flex items-center justify-between rounded-2xl border border-odcGreenBright/30 p-4"
                style={{ background: "linear-gradient(135deg,rgba(22,196,108,.16),rgba(6,61,36,.3))" }}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-odcGold">3-Dart Average</span>
                <span className="text-4xl font-black text-odcGreenBright">{player.avg || "-"}</span>
              </div>

              <Stat label="Played" value={player.played} />
              <Stat label="Won" value={player.wins} green />
              <Stat label="180s" value={player.tons} gold />
              <Stat label="Best C/O" value={player.checkout} gold />
            </div>

            {/* footer */}
            <div className="mt-5 flex items-center justify-between border-t border-odcCream/10 pt-4">
              <span className="text-[11px] font-semibold text-odcCream/50">
                onlinedartscircuit.co.uk/player/{slug}
              </span>
              {rank && (
                <span className="text-[11px] font-black text-odcGold">🎯 #{rank} in {player.division}</span>
              )}
            </div>
          </div>
        </div>

        {/* share buttons */}
        <div className="mt-5 flex gap-2.5">
          <button onClick={copyLink} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-odcGreen px-4 py-3.5 text-sm font-black text-odcBlack">
            {copied ? "✓ Copied!" : "⧉ Copy Link"}
          </button>
          <button
            onClick={shareDiscord}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg,#5865F2,#4752c4)" }}
          >
            ⬢ Discord
          </button>
          <button onClick={nativeShare} className="rounded-2xl border border-odcGold/30 bg-white/[0.03] px-5 py-3.5 text-sm font-black text-odcCream">
            ⋯
          </button>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, green, gold }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-odcGold/18 bg-odcBlack/40 p-4">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(180deg,#22d97a,#0c8f4c)" }} />
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-odcCream/50">{label}</div>
      <div className={`mt-1 text-3xl font-black ${green ? "text-odcGreenBright" : gold ? "text-odcGold" : "text-odcCream"}`}>
        {value ?? "-"}
      </div>
    </div>
  );
}
