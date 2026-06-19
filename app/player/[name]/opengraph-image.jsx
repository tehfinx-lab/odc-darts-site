import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ODC Player Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Fetch the player's data, then render their card as an image
export default async function Image({ params }) {
  const slug = decodeURIComponent(params?.name || "");
  let player = null;

  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL || "https://onlinedartscircuit.co.uk";
    const res = await fetch(`${base}/api/league-data`, { next: { revalidate: 300 } });
    const data = await res.json();
    const players = data?.players || [];
    player = players.find(
      (p) =>
        String(p.name).toLowerCase() === slug.toLowerCase() ||
        String(p.name).toLowerCase().replace(/\s+/g, "-") === slug.toLowerCase()
    );
  } catch (e) {
    // fall through to generic
  }

  if (!player) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(160deg,#0a3a23,#04190f)",
            color: "#F8EBC6",
            fontSize: 48,
            fontWeight: 900,
          }}
        >
          Online Darts Circuit
        </div>
      ),
      { ...size }
    );
  }

  const formArr = String(player.form || "").trim().split(/\s+/).filter(Boolean).slice(-5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg,#0a3a23 0%,#072818 55%,#04190f 100%)",
          padding: 60,
          color: "#F8EBC6",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* top brand */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
            ONLINE DARTS CIRCUIT
          </div>
          <div
            style={{
              border: "2px solid rgba(232,199,102,.5)",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 20,
              fontWeight: 900,
              color: "#E8C766",
              letterSpacing: 3,
            }}
          >
            SEASON 4
          </div>
        </div>

        {/* player head */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 44 }}>
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: 36,
              background: "linear-gradient(135deg,#22d97a,#0c8f4c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 900,
              color: "#04190f",
            }}
          >
            {initials(player.name)}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#E8C766", letterSpacing: 6 }}>
              {String(player.division).toUpperCase()}
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>{player.name}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {formArr.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 900,
                    background:
                      ch === "W" ? "rgba(22,196,108,.3)" : ch === "L" ? "rgba(229,29,42,.25)" : "rgba(232,199,102,.25)",
                    color: ch === "W" ? "#22d97a" : ch === "L" ? "#ff6b6b" : "#E8C766",
                  }}
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* stats row */}
        <div style={{ display: "flex", gap: 20 }}>
          <BigStat label="3-DART AVG" value={player.avg || "-"} highlight />
          <BigStat label="PLAYED" value={player.played} />
          <BigStat label="WON" value={player.wins} />
          <BigStat label="180s" value={player.tons} gold />
          <BigStat label="BEST C/O" value={player.checkout} gold />
        </div>

        {/* footer url */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 60,
            fontSize: 24,
            color: "#E8C766",
            fontWeight: 900,
          }}
        >
          onlinedartscircuit.co.uk/player/{slug}
        </div>
      </div>
    ),
    { ...size }
  );
}

function BigStat({ label, value, highlight, gold }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        padding: "24px 20px",
        border: highlight ? "2px solid rgba(34,217,122,.4)" : "1px solid rgba(232,199,102,.2)",
        background: highlight ? "rgba(22,196,108,.16)" : "rgba(4,16,10,.4)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "rgba(248,235,198,.6)" }}>{label}</div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          marginTop: 6,
          color: highlight ? "#22d97a" : gold ? "#E8C766" : "#F8EBC6",
        }}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}
