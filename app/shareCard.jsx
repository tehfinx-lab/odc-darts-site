"use client";

/**
 * ODC SHARE CARD — generates a branded match-result image on a canvas
 * and downloads it. No server needed. Works offline.
 *
 * Usage:
 *   import { downloadResultCard } from "./shareCard";
 *   downloadResultCard(match);   // match = a result object
 */

// load the logo once, cache the promise
let _logoPromise = null;
function loadLogo() {
  if (_logoPromise) return _logoPromise;
  _logoPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fail gracefully (card still renders)
    img.src = "/odc-logo.png";
  });
  return _logoPromise;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildResultCardCanvas(match) {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const RED = "#e51d2a";
  const CREAM = "#f3ecd9";
  const NAVY = "#0f2535";

  // ---- background ----
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a1622");
  bg.addColorStop(0.5, "#070d14");
  bg.addColorStop(1, "#05080c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // red glow top
  const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 600);
  glow.addColorStop(0, "rgba(229,29,42,0.25)");
  glow.addColorStop(1, "rgba(229,29,42,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);

  // border frame
  ctx.strokeStyle = "rgba(243,236,217,0.12)";
  ctx.lineWidth = 3;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();

  // ---- logo ----
  const logo = await loadLogo();
  if (logo) {
    const ls = 150;
    ctx.drawImage(logo, W / 2 - ls / 2, 80, ls, ls);
  }

  // ---- header text ----
  ctx.textAlign = "center";
  ctx.fillStyle = CREAM;
  ctx.font = "900 34px Arial";
  ctx.fillText("ONLINE DARTS CIRCUIT", W / 2, 285);

  ctx.fillStyle = RED;
  ctx.font = "900 22px Arial";
  const division = (match.division || "MATCH RESULT").toUpperCase();
  ctx.fillText(division, W / 2, 325);

  // ---- player names + score ----
  const midY = 470;
  ctx.fillStyle = CREAM;
  ctx.font = "900 52px Arial";

  // left/right names with truncation
  const fit = (txt, max) => {
    let t = txt || "TBD";
    while (ctx.measureText(t).width > max && t.length > 3) t = t.slice(0, -1);
    return t === (txt || "TBD") ? t : t + "…";
  };

  ctx.textAlign = "left";
  ctx.fillText(fit(match.home, 360), 90, midY);
  ctx.textAlign = "right";
  ctx.fillText(fit(match.away, 360), W - 90, midY);

  // score pill
  ctx.textAlign = "center";
  const score = match.score || "-";
  ctx.font = "900 70px Arial";
  const sw = ctx.measureText(score).width + 90;
  ctx.fillStyle = RED;
  roundRect(ctx, W / 2 - sw / 2, midY - 70, sw, 100, 28);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(score, W / 2, midY + 2);

  // "VS" tag under
  ctx.fillStyle = "rgba(243,236,217,0.5)";
  ctx.font = "900 24px Arial";
  ctx.fillText("FULL TIME", W / 2, midY + 75);

  // ---- stats comparison ----
  const p1 = match.p1Stats || {};
  const p2 = match.p2Stats || {};
  const statRows = [
    ["3-DART AVG", p1.avg, p2.avg],
    ["9-DART AVG", p1.nineAvg, p2.nineAvg],
    ["HIGH C/O", p1.highCheckout, p2.highCheckout],
    ["180s", p1.tons, p2.tons],
    ["BEST LEG", p1.bestLeg, p2.bestLeg],
  ];

  let y = 620;
  const rowH = 78;
  statRows.forEach(([label, a, b]) => {
    // row bg
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, 90, y, W - 180, rowH - 14, 16);
    ctx.fill();

    // values
    ctx.fillStyle = CREAM;
    ctx.font = "900 40px Arial";
    ctx.textAlign = "left";
    ctx.fillText(a != null ? String(a) : "-", 120, y + 44);
    ctx.textAlign = "right";
    ctx.fillText(b != null ? String(b) : "-", W - 120, y + 44);

    // label center
    ctx.fillStyle = "rgba(243,236,217,0.55)";
    ctx.font = "900 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, y + 40);

    // highlight the better value in red
    const an = parseFloat(a), bn = parseFloat(b);
    if (!isNaN(an) && !isNaN(bn) && an !== bn) {
      const better = an > bn;
      // best-leg is "lower is better"
      const lowerBetter = label === "BEST LEG";
      const leftWins = lowerBetter ? an < bn : an > bn;
      ctx.fillStyle = RED;
      ctx.font = "900 40px Arial";
      if (leftWins) {
        ctx.textAlign = "left";
        ctx.fillText(a != null ? String(a) : "-", 120, y + 44);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(b != null ? String(b) : "-", W - 120, y + 44);
      }
    }

    y += rowH;
  });

  // ---- footer ----
  ctx.fillStyle = "rgba(243,236,217,0.4)";
  ctx.font = "900 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("onlinedartscircuit.co.uk", W / 2, H - 70);

  return canvas;
}

export async function downloadResultCard(match) {
  const canvas = await buildResultCardCanvas(match);
  const link = document.createElement("a");
  const safe = `${match.home || "p1"}-vs-${match.away || "p2"}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  link.download = `odc-${safe}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Optional: Web Share API (mobile) with image, falls back to download
export async function shareResultCard(match) {
  const canvas = await buildResultCardCanvas(match);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "odc-result.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "ODC Result",
          text: `${match.home} ${match.score} ${match.away} — Online Darts Circuit`,
        });
        return;
      } catch (e) {
        // user cancelled or share failed -> fall through to download
      }
    }
    // fallback: download
    const link = document.createElement("a");
    link.download = "odc-result.png";
    link.href = URL.createObjectURL(blob);
    link.click();
  }, "image/png");
}
