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
  const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "0";
  for (const [label, a, b] of [
    ["CHECKOUT %", p1.checkoutRate, p2.checkoutRate],
    ["WORST LEG", p1.worstLeg, p2.worstLeg],
  ]) {
    if (hasVal(a) || hasVal(b)) statRows.push([label, hasVal(a) ? a : "-", hasVal(b) ? b : "-"]);
  }

  let y = 620;
  const rowH = statRows.length > 5 ? 64 : 78;
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


/* ================= SEASON WRAPPED — 1080x1920 story card ================= */
export async function buildWrappedCanvas(w) {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  try { await document.fonts.ready; } catch (e) {}
  const DISP = '"Big Shoulders Display","Arial Narrow",sans-serif';
  const MONO = '"Spline Sans Mono",monospace';
  const PITCH = "#0A1710", BONE = "#E9EFE7", RED = "#E63329", GOLD = "#D9B45B";
  const LINE = "rgba(233,239,231,0.14)";

  ctx.fillStyle = PITCH; ctx.fillRect(0, 0, W, H);

  /* board rim arcs bleeding off top-right */
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  [520, 560].forEach((r) => { ctx.beginPath(); ctx.arc(W - 60, 120, r, 0, Math.PI * 2); ctx.stroke(); });
  ctx.strokeStyle = "rgba(230,51,41,0.85)"; ctx.lineWidth = 40;
  ctx.beginPath(); ctx.arc(W - 60, 120, 540, Math.PI * 0.62, Math.PI * 0.78); ctx.stroke();

  /* logo + header */
  const logo = await loadLogo();
  if (logo) {
    ctx.save(); ctx.beginPath(); ctx.arc(120, 150, 56, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logo, 64, 94, 112, 112); ctx.restore();
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(233,239,231,0.6)";
  ctx.font = `600 30px ${MONO}`;
  ctx.fillText("O D C  ·  S E A S O N  4", 210, 140);
  ctx.fillStyle = RED;
  ctx.font = `800 56px ${DISP}`;
  ctx.fillText("WRAPPED", 210, 200);

  /* player name */
  ctx.fillStyle = BONE;
  let nameSize = 150;
  ctx.font = `800 ${nameSize}px ${DISP}`;
  while (ctx.measureText(w.name.toUpperCase()).width > W - 160 && nameSize > 60) {
    nameSize -= 10; ctx.font = `800 ${nameSize}px ${DISP}`;
  }
  ctx.fillText(w.name.toUpperCase(), 80, 420);
  ctx.fillStyle = GOLD;
  ctx.font = `700 52px ${DISP}`;
  ctx.fillText(`\u2605 ${w.archetype.toUpperCase()}`, 82, 496);
  ctx.fillStyle = "rgba(233,239,231,0.5)";
  ctx.font = `500 28px ${MONO}`;
  ctx.fillText(`${w.division}  ·  FINISHED #${w.position}`, 84, 550);

  /* stat grid 2 x 3 */
  const stats = [
    ["RECORD", w.record], ["WIN RATE", w.winRate],
    ["SEASON AVG", w.seasonAvg], ["BEST 3DA", w.best3DA],
    ["180s", String(w.tons)], ["HIGH CHECKOUT", String(w.highCheckout)],
  ];
  const gx = 80, gy = 640, cw = (W - 160 - 24) / 2, ch = 210;
  stats.forEach(([label, val], i) => {
    const x = gx + (i % 2) * (cw + 24);
    const y = gy + Math.floor(i / 2) * (ch + 24);
    ctx.fillStyle = "#0F1F16";
    roundRect(ctx, x, y, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; roundRect(ctx, x, y, cw, ch, 18); ctx.stroke();
    ctx.fillStyle = "rgba(233,239,231,0.45)";
    ctx.font = `600 24px ${MONO}`;
    ctx.fillText(label, x + 30, y + 60);
    ctx.fillStyle = BONE;
    ctx.font = `800 84px ${DISP}`;
    ctx.fillText(String(val ?? "\u2013"), x + 28, y + 160);
  });

  /* biggest win band */
  let by = gy + 3 * (ch + 24) + 20;
  ctx.fillStyle = RED; roundRect(ctx, 80, by, W - 160, 130, 18); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 24px ${MONO}`;
  ctx.fillText("BIGGEST WIN", 112, by + 52);
  ctx.fillStyle = "#fff";
  ctx.font = `800 56px ${DISP}`;
  ctx.fillText(w.biggestWin || "\u2013", 110, by + 108);

  /* best performance band */
  by += 154;
  ctx.strokeStyle = LINE; roundRect(ctx, 80, by, W - 160, 130, 18); ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(233,239,231,0.45)";
  ctx.font = `600 24px ${MONO}`;
  ctx.fillText("BEST PERFORMANCE", 112, by + 52);
  ctx.fillStyle = BONE;
  ctx.font = `800 52px ${DISP}`;
  ctx.fillText(w.bestPerf || "\u2013", 110, by + 106);

  /* footer */
  ctx.fillStyle = "rgba(233,239,231,0.4)";
  ctx.font = `600 26px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText("GAME ON  ///  onlinedartscircuit.vercel.app", W / 2, H - 70);

  return canvas;
}

export async function shareWrappedCard(w) {
  const canvas = await buildWrappedCanvas(w);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "odc-wrapped.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My ODC Season Wrapped", text: `My Season 4 Wrapped \u2014 Online Darts Circuit` });
        return;
      } catch (e) {}
    }
    const link = document.createElement("a");
    link.download = "odc-wrapped.png";
    link.href = URL.createObjectURL(blob);
    link.click();
  }, "image/png");
}
