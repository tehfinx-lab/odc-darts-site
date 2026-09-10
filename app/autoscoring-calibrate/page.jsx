// app/autoscoring-calibrate/page.jsx
//
// ODC AUTOSCORING — STAGE 3: board calibration.
//
// The job of this page is to work out, from the camera picture, exactly where
// the dartboard is: its centre, its rings, and which way up it is. Once it
// knows that, turning a point on the picture into "T20" is just arithmetic.
//
// The technical term for the straightening step is a HOMOGRAPHY. In plain
// English: because the camera sees the board slightly from an angle, the board
// looks like a squashed circle. A homography is the sum that un-squashes it, so
// we can do the scoring maths on a perfect circle instead of a squashed one.
//
// What this page does NOT do: detect darts. That is Stage 4. This page only
// proves we know where the board is, and it proves it by drawing the rings it
// thinks it has found back on top of the real picture. If the drawn rings sit
// on the real rings, the calibration is right. If they do not, it is wrong, and
// you can see that instantly without any guesswork.
//
// Self-contained, one file. Touches nothing else on the site.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ==================================================================
   1. THE BOARD, IN MILLIMETRES
   Standard steel-tip dimensions. Everything downstream uses these.
   ================================================================== */
const RING_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const B = {
  bull: 6.35,      // inner bull, 50
  outerBull: 15.9, // outer bull, 25
  trebleIn: 99,
  trebleOut: 107,
  doubleIn: 162,
  doubleOut: 170,  // outer edge of scoring area
};

/** Turn a point in board millimetres into a dart score. Pure geometry. */
function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= B.bull) return { value: 50, label: "BULL", ring: "bull" };
  if (r <= B.outerBull) return { value: 25, label: "25", ring: "outer bull" };
  if (r > B.doubleOut) return { value: 0, label: "MISS", ring: "off board" };
  let a = (Math.atan2(x, -y) * 180) / Math.PI;
  if (a < 0) a += 360;
  const num = RING_ORDER[Math.floor(((a + 9) % 360) / 18)];
  if (r >= B.trebleIn && r <= B.trebleOut)
    return { value: num * 3, label: "T" + num, ring: "treble" };
  if (r >= B.doubleIn) return { value: num * 2, label: "D" + num, ring: "double" };
  return { value: num, label: "S" + num, ring: "single" };
}

/* ==================================================================
   2. MATHS HELPERS
   ================================================================== */
function solveLin(M, b) {
  const n = b.length;
  const m = M.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    if (Math.abs(d) < 1e-12) continue;
    for (let k = c; k <= n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row) => row[n]);
}

/** Build the straightening transform from 4 picture points to 4 known points. */
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solveLin(A, b);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

function applyH(H, x, y) {
  const d = H[2][0] * x + H[2][1] * y + H[2][2];
  return [
    (H[0][0] * x + H[0][1] * y + H[0][2]) / d,
    (H[1][0] * x + H[1][1] * y + H[1][2]) / d,
  ];
}

function invert3(M) {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
  const A = e * i - f * h, Bv = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * Bv + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [
    [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [Bv / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [C / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
}

function lineCross(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-9) return null;
  const a = p1[0] * p2[1] - p1[1] * p2[0];
  const b = p3[0] * p4[1] - p3[1] * p4[0];
  return [
    (a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d,
    (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d,
  ];
}

/* ==================================================================
   3. FINDING THE BOARD
   The doubles and trebles are the only strongly red/green things in
   view, so we look for red and green pixels, then fit a squashed
   circle round the outside of them.
   ================================================================== */
function redGreenMask(data, w, h) {
  const m = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 55) continue;
    if ((mx - mn) / mx < 0.34) continue;
    const isRed = r === mx && r - g > 70 && r - b > 55;
    const isGreen = g === mx && g - r > 38 && g - b > 18;
    if (isRed || isGreen) m[p] = 1;
  }
  return m;
}

function fitEllipseTo(pts) {
  if (pts.length < 40) return null;
  let mx = 0, my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= pts.length; my /= pts.length;
  let s = 0;
  for (const [x, y] of pts) s += Math.hypot(x - mx, y - my);
  s = s / pts.length || 1;

  const N = 5;
  const M = Array.from({ length: N }, () => new Array(N).fill(0));
  const rhs = new Array(N).fill(0);
  for (const [X, Y] of pts) {
    const x = (X - mx) / s, y = (Y - my) / s;
    const row = [x * x, x * y, y * y, x, y];
    for (let i = 0; i < N; i++) {
      rhs[i] += row[i];
      for (let j = 0; j < N; j++) M[i][j] += row[i] * row[j];
    }
  }
  const v = solveLin(M, rhs);
  if (!v || v.some((n) => !isFinite(n))) return null;
  const [A_, B_, C_, D_, E_] = v, F_ = -1;
  const disc = B_ * B_ - 4 * A_ * C_;
  if (disc >= 0) return null;
  const ecx = (2 * C_ * D_ - B_ * E_) / disc;
  const ecy = (2 * A_ * E_ - B_ * D_) / disc;
  const up = 2 * (A_ * ecx * ecx + B_ * ecx * ecy + C_ * ecy * ecy - F_);
  const term = Math.sqrt((A_ - C_) * (A_ - C_) + B_ * B_);
  const d1 = A_ + C_ + term, d2 = A_ + C_ - term;
  if (d1 <= 0 || d2 <= 0) return null;
  const a1 = Math.sqrt(Math.abs(up / d1)), a2 = Math.sqrt(Math.abs(up / d2));
  const phi = 0.5 * Math.atan2(B_, A_ - C_);
  const E = {
    cx: ecx * s + mx,
    cy: ecy * s + my,
    rx: Math.max(a1, a2) * s,
    ry: Math.min(a1, a2) * s,
    phi: a1 >= a2 ? phi : phi + Math.PI / 2,
  };
  if (!isFinite(E.rx) || !isFinite(E.ry) || E.ry / E.rx < 0.3) return null;
  return E;
}

/** Full board find on one frame of pixels. Returns ellipse + bull, in px. */
function findBoard(data, w, h) {
  const m = redGreenMask(data, w, h);
  let sx = 0, sy = 0, n = 0;
  for (let p = 0; p < m.length; p++) if (m[p]) { sx += p % w; sy += (p / w) | 0; n++; }
  if (n < 300) return { ok: false, why: "Not enough red and green found. Is the board in view and lit?" };
  const cx0 = sx / n, cy0 = sy / n;

  // Walk inwards along many directions until we hit colour: that traces the
  // outside edge of the double ring.
  const pts = [];
  const maxR = Math.hypot(w, h) / 2;
  for (let k = 0; k < 360; k++) {
    const a = (k / 360) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    for (let r = maxR; r > 8; r -= 1) {
      const x = Math.round(cx0 + dx * r), y = Math.round(cy0 + dy * r);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (m[y * w + x]) { pts.push([x, y]); break; }
    }
  }
  const E = fitEllipseTo(pts);
  if (!E) return { ok: false, why: "Found colour, but could not fit a board shape to it." };

  // Bull: the red or green blob nearest the middle.
  const rr = Math.min(E.rx, E.ry) * 0.34;
  let rx = 0, ry = 0, rn = 0, gx = 0, gy = 0, gn = 0;
  for (let y = Math.max(0, (E.cy - rr) | 0); y < Math.min(h, E.cy + rr); y++) {
    for (let x = Math.max(0, (E.cx - rr) | 0); x < Math.min(w, E.cx + rr); x++) {
      if (Math.hypot(x - E.cx, y - E.cy) > rr) continue;
      const i = (y * w + x) * 4, R = data[i], G = data[i + 1], Bb = data[i + 2];
      const mx = Math.max(R, G, Bb), mn = Math.min(R, G, Bb);
      if (mx < 50 || (mx - mn) / mx < 0.3) continue;
      if (R === mx && R - G > 65 && R - Bb > 50) { rx += x; ry += y; rn++; }
      else if (G === mx && G - R > 35 && G - Bb > 15) { gx += x; gy += y; gn++; }
    }
  }
  const bull = rn >= 6 ? [rx / rn, ry / rn] : gn >= 10 ? [gx / gn, gy / gn] : [E.cx, E.cy];
  return { ok: true, ellipse: E, bull, edgePoints: pts.length, colourPixels: n };
}

function ellipsePt(E, t) {
  const ct = Math.cos(t), st = Math.sin(t), cp = Math.cos(E.phi), sp = Math.sin(E.phi);
  return [E.cx + E.rx * ct * cp - E.ry * st * sp, E.cy + E.rx * ct * sp + E.ry * st * cp];
}

function rayHitsEllipse(E, P, dx, dy) {
  const cp = Math.cos(-E.phi), sp = Math.sin(-E.phi);
  const ox = P[0] - E.cx, oy = P[1] - E.cy;
  const px = ox * cp - oy * sp, py = ox * sp + oy * cp;
  const vx = dx * cp - dy * sp, vy = dx * sp + dy * cp;
  const a = (vx * vx) / (E.rx * E.rx) + (vy * vy) / (E.ry * E.ry);
  const b = 2 * ((px * vx) / (E.rx * E.rx) + (py * vy) / (E.ry * E.ry));
  const c = (px * px) / (E.rx * E.rx) + (py * py) / (E.ry * E.ry) - 1;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  const hx = px + vx * t, hy = py + vy * t;
  const cp2 = Math.cos(E.phi), sp2 = Math.sin(E.phi);
  return [E.cx + hx * cp2 - hy * sp2, E.cy + hx * sp2 + hy * cp2];
}

/** The four reference points: outer double edge at 20, 6, 3 and 11. */
function autoPoints(E, bull, rotDeg) {
  const out = [];
  for (const base of [0, 90, 180, 270]) {
    const a = ((base + rotDeg) * Math.PI) / 180;
    const p = rayHitsEllipse(E, bull, Math.sin(a), -Math.cos(a));
    if (!p) return null;
    out.push(p);
  }
  return out;
}

/* ==================================================================
   4. DRIFT: has the camera been nudged since we calibrated?
   Cheap trick: squash the picture into one row of numbers and one
   column of numbers, then see how far those slide. Runs in a
   millisecond; accurate to about a third of a pixel in testing.
   ================================================================== */
function profiles(gray, w, h, x0, y0, sw, sh) {
  const rows = new Float64Array(sh), cols = new Float64Array(sw);
  let total = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = gray[(y0 + y) * w + (x0 + x)];
      rows[y] += v; cols[x] += v; total += v;
    }
  }
  const mr = total / sh, mc = total / sw;
  for (let i = 0; i < sh; i++) rows[i] -= mr;
  for (let i = 0; i < sw; i++) cols[i] -= mc;
  return { rows, cols };
}

function sad(a, b, s) {
  let sum = 0, n = 0;
  if (s < 0) { for (let i = 0; i < a.length + s; i++) { sum += Math.abs(a[i - s] - b[i]); n++; } }
  else { for (let i = 0; i < a.length - s; i++) { sum += Math.abs(a[i] - b[i + s]); n++; } }
  return n ? sum / n : Infinity;
}

function shift1d(a, b, rng = 14) {
  let best = 0, bs = Infinity;
  for (let s = -rng; s <= rng; s++) {
    const d = sad(a, b, s);
    if (d < bs) { bs = d; best = s; }
  }
  const y1 = sad(a, b, best - 1), y2 = sad(a, b, best), y3 = sad(a, b, best + 1);
  const den = y1 - 2 * y2 + y3;
  return best + (Math.abs(den) > 1e-9 ? (0.5 * (y1 - y3)) / den : 0);
}

/* ==================================================================
   5. SELF-TESTS for the scoring geometry
   The brief asked for these. They run in the page, every load.
   ================================================================== */
function polar(rmm, deg) {
  const a = (deg * Math.PI) / 180;
  return [rmm * Math.sin(a), -rmm * Math.cos(a)];
}
const SEG_ANGLE = (n) => RING_ORDER.indexOf(n) * 18;

const GEOMETRY_TESTS = [
  ["dead centre is the bull", [0, 0], "BULL"],
  ["just outside the bull is 25", polar(11, 0), "25"],
  ["treble twenty", polar(103, SEG_ANGLE(20)), "T20"],
  ["treble nineteen", polar(103, SEG_ANGLE(19)), "T19"],
  ["treble eighteen", polar(103, SEG_ANGLE(18)), "T18"],
  ["double twenty", polar(166, SEG_ANGLE(20)), "D20"],
  ["double sixteen", polar(166, SEG_ANGLE(16)), "D16"],
  ["double twelve", polar(166, SEG_ANGLE(12)), "D12"],
  ["single one", polar(50, SEG_ANGLE(1)), "S1"],
  ["single twenty", polar(50, SEG_ANGLE(20)), "S20"],
  ["single three, below the bull", polar(140, SEG_ANGLE(3)), "S3"],
  ["double six, on the right", polar(166, SEG_ANGLE(6)), "D6"],
  ["double eleven, on the left", polar(166, SEG_ANGLE(11)), "D11"],
  ["outside the wire is a miss", polar(180, 0), "MISS"],
  ["inside the treble is not a treble", polar(95, SEG_ANGLE(20)), "S20"],
  ["outside the treble is not a treble", polar(112, SEG_ANGLE(20)), "S20"],
];

function runGeometryTests() {
  return GEOMETRY_TESTS.map(([name, [x, y], want]) => {
    const got = scoreAt(x, y).label;
    return { name, want, got, pass: got === want };
  });
}

const CAL_KEY = "odc:autoscore:calibration:v1";

/* ==================================================================
   6. THE PAGE
   ================================================================== */
export default function CalibratePage() {
  const videoRef = useRef(null);
  const dispRef = useRef(null);
  const ovlRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const workRef = useRef(null);
  const stillRef = useRef(null);      // a loaded photo, if used instead of live camera
  const baseRef = useRef(null);       // profiles captured at lock time
  const rafRef = useRef(null);

  const [source, setSource] = useState("none"); // none | camera | photo
  const [msg, setMsg] = useState("Start the camera, or load one of your captured photos.");
  const [board, setBoard] = useState(null);     // { ellipse, bull }
  const [rot, setRot] = useState(0);
  const [pts, setPts] = useState(null);         // 4 reference points, in work-canvas px
  const [manual, setManual] = useState([]);
  const [mode, setMode] = useState("idle");     // idle | manual | ready | locked
  const [H, setH] = useState(null);
  const [check, setCheck] = useState(null);
  const [probe, setProbe] = useState(null);     // tap-to-score result
  const [drift, setDrift] = useState(null);
  const [tests] = useState(runGeometryTests);
  const [showTests, setShowTests] = useState(false);
  const [zoom, setZoom] = useState(null);

  const WORK = 480; // the square we do all the maths in

  /* ---------- get one square frame of pixels to work on ---------- */
  const grabWork = useCallback(() => {
    if (!workRef.current) workRef.current = document.createElement("canvas");
    const c = workRef.current;
    if (c.width !== WORK) { c.width = WORK; c.height = WORK; }
    const ctx = c.getContext("2d", { willReadFrequently: true });

    if (source === "photo" && stillRef.current) {
      const im = stillRef.current;
      const side = Math.min(im.naturalWidth, im.naturalHeight);
      ctx.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2,
                    side, side, 0, 0, WORK, WORK);
    } else {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return null;
      const side = Math.min(v.videoWidth, v.videoHeight);
      ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2,
                    side, side, 0, 0, WORK, WORK);
    }
    return ctx.getImageData(0, 0, WORK, WORK);
  }, [source]);

  /* ---------- paint the picture, then the overlay on top ---------- */
  const paint = useCallback(() => {
    const disp = dispRef.current;
    if (disp) {
      if (disp.width !== WORK) { disp.width = WORK; disp.height = WORK; }
      const ctx = disp.getContext("2d");
      if (source === "photo" && stillRef.current) {
        const im = stillRef.current;
        const side = Math.min(im.naturalWidth, im.naturalHeight);
        ctx.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2,
                      side, side, 0, 0, WORK, WORK);
      } else {
        const v = videoRef.current;
        if (v && v.videoWidth) {
          const side = Math.min(v.videoWidth, v.videoHeight);
          ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2,
                        side, side, 0, 0, WORK, WORK);
        }
      }
    }
    // via a ref, so the animation loop always uses the CURRENT overlay code
    // rather than the version captured when the loop started
    drawOverlayRef.current?.();
    if (source === "camera") rafRef.current = requestAnimationFrame(paint);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- the overlay: this is the proof ---------- */
  const drawOverlay = useCallback(() => {
    const c = ovlRef.current;
    if (!c) return;
    if (c.width !== WORK) { c.width = WORK; c.height = WORK; }
    const g = c.getContext("2d");
    g.clearRect(0, 0, WORK, WORK);

    if (board && !pts) {
      g.strokeStyle = "rgba(217,180,91,.75)";
      g.lineWidth = 2;
      g.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.05) {
        const p = ellipsePt(board.ellipse, t);
        t === 0 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]);
      }
      g.stroke();
    }

    // Draw the whole board back on, from the maths. If this lines up with the
    // real board, calibration is correct.
    if (H) {
      const Hinv = invert3(H);
      if (Hinv) {
        const ringPath = (rmm, style, width) => {
          g.strokeStyle = style; g.lineWidth = width;
          g.beginPath();
          for (let k = 0; k <= 120; k++) {
            const a = (k / 120) * Math.PI * 2;
            const [px, py] = applyH(Hinv, rmm * Math.sin(a), -rmm * Math.cos(a));
            k === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
          }
          g.stroke();
        };
        ringPath(B.doubleOut, "rgba(217,180,91,.95)", 2);
        ringPath(B.doubleIn, "rgba(230,51,41,.9)", 1.5);
        ringPath(B.trebleOut, "rgba(35,165,102,.9)", 1.5);
        ringPath(B.trebleIn, "rgba(35,165,102,.9)", 1.5);
        ringPath(B.outerBull, "rgba(233,239,231,.85)", 1.5);
        ringPath(B.bull, "rgba(233,239,231,.85)", 1.5);
        g.strokeStyle = "rgba(233,239,231,.35)";
        g.lineWidth = 1;
        for (let k = 0; k < 20; k++) {
          const a = ((k * 18 + 9) * Math.PI) / 180;
          const p1 = applyH(Hinv, B.outerBull * Math.sin(a), -B.outerBull * Math.cos(a));
          const p2 = applyH(Hinv, B.doubleOut * Math.sin(a), -B.doubleOut * Math.cos(a));
          g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke();
        }
        // number labels, so you can see the orientation is right
        g.fillStyle = "#D9B45B";
        g.font = "bold 13px sans-serif";
        g.textAlign = "center";
        for (let k = 0; k < 20; k++) {
          const a = (k * 18 * Math.PI) / 180;
          const p = applyH(Hinv, 183 * Math.sin(a), -183 * Math.cos(a));
          g.fillText(String(RING_ORDER[k]), p[0], p[1] + 4);
        }
      }
    }

    const names = ["20", "6", "3", "11"];
    (pts || manual).forEach((p, i) => {
      g.strokeStyle = "#E63329"; g.lineWidth = 3;
      g.beginPath(); g.arc(p[0], p[1], 11, 0, 7); g.stroke();
      g.fillStyle = "#E63329"; g.font = "bold 17px sans-serif"; g.textAlign = "left";
      g.fillText(names[i] || "", p[0] + 14, p[1] + 6);
    });

    if (board?.bull) {
      g.strokeStyle = "#2BBF77"; g.lineWidth = 2;
      g.beginPath(); g.arc(board.bull[0], board.bull[1], 6, 0, 7); g.stroke();
    }

    if (probe) {
      g.strokeStyle = "#E9EFE7"; g.lineWidth = 2;
      g.beginPath(); g.arc(probe.x, probe.y, 9, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(probe.x - 14, probe.y); g.lineTo(probe.x + 14, probe.y);
      g.moveTo(probe.x, probe.y - 14); g.lineTo(probe.x, probe.y + 14); g.stroke();
    }
  }, [board, pts, manual, H, probe]);

  const drawOverlayRef = useRef(drawOverlay);
  useEffect(() => { drawOverlayRef.current = drawOverlay; drawOverlay(); }, [drawOverlay]);

  // A still photo is painted once, when it loads; the camera repaints itself.
  useEffect(() => { if (source === "photo") paint(); }, [source, paint]);

  /* ---------- camera ---------- */
  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = s;
      trackRef.current = s.getVideoTracks()[0];
      const v = videoRef.current;
      v.srcObject = s;
      await v.play();
      try {
        const caps = trackRef.current.getCapabilities?.() || {};
        if (caps.zoom) setZoom({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1, value: caps.zoom.min });
      } catch (e) { /* no zoom control */ }
      setSource("camera");
      setMsg("Camera running. Point it at the board, then tap Find the board.");
    } catch (e) {
      setMsg("Could not open the camera: " + (e?.name || e) + ". You can still load a photo instead.");
    }
  }, []);

  useEffect(() => {
    if (source !== "camera") return;
    rafRef.current = requestAnimationFrame(paint);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [source, paint]);

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  const loadPhoto = useCallback((file) => {
    if (!file) return;
    const im = new Image();
    im.onload = () => {
      stillRef.current = im;
      setSource("photo");
      setBoard(null); setPts(null); setH(null); setManual([]); setProbe(null);
      setMode("idle");
      setMsg("Photo loaded. Tap Find the board.");
    };
    im.src = URL.createObjectURL(file);
  }, []);

  /* ---------- calibrate ---------- */
  const find = useCallback(() => {
    const img = grabWork();
    if (!img) { setMsg("No picture to work with yet."); return; }
    const r = findBoard(img.data, WORK, WORK);
    if (!r.ok) {
      setBoard(null); setPts(null); setH(null);
      setMode("manual"); setManual([]);
      setMsg(r.why + " Tap the four points yourself instead: 20 at the top, then 6, 3, 11.");
      return;
    }
    setBoard({ ellipse: r.ellipse, bull: r.bull });
    setManual([]);
    setMode("ready");
    setMsg(`Board found from ${r.colourPixels.toLocaleString()} coloured pixels. ` +
           `Now turn the rotation dial until the numbers line up with the real board.`);
  }, [grabWork]);

  // Rebuild the transform whenever the board or the rotation changes.
  useEffect(() => {
    let use = null;
    if (manual.length === 4) use = manual;
    else if (board) use = autoPoints(board.ellipse, board.bull, rot);
    if (!use) { setPts(null); setH(null); setCheck(null); return; }

    const dst = manual.length === 4
      ? [0, 90, 180, 270].map((base) => {
          const a = ((base + rot) * Math.PI) / 180;
          return [B.doubleOut * Math.sin(a), -B.doubleOut * Math.cos(a)];
        })
      : [[0, -B.doubleOut], [B.doubleOut, 0], [0, B.doubleOut], [-B.doubleOut, 0]];

    const Hn = homography(use, dst);
    setPts(use);
    setH(Hn);

    const bull = manual.length === 4
      ? lineCross(use[0], use[2], use[1], use[3]) || board?.bull
      : board?.bull;
    if (bull) {
      const [bx, by] = applyH(Hn, bull[0], bull[1]);
      const s = scoreAt(bx, by);
      const off = Math.hypot(bx, by);
      setCheck({
        ok: s.ring === "bull" || s.ring === "outer bull",
        label: s.label,
        offMm: off,
      });
    } else setCheck(null);
  }, [board, rot, manual]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- tapping ---------- */
  const onTap = useCallback((ev) => {
    const c = ovlRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    const x = ((t.clientX - rect.left) / rect.width) * WORK;
    const y = ((t.clientY - rect.top) / rect.height) * WORK;

    if (mode === "manual" && manual.length < 4) {
      const next = [...manual, [x, y]];
      setManual(next);
      setMsg(next.length < 4
        ? `Now tap ${["20 at the top", "6 on the right", "3 at the bottom", "11 on the left"][next.length]}.`
        : "Four points set. Check the drawn rings sit on the real ones.");
      return;
    }
    if (!H) return;
    const [bx, by] = applyH(H, x, y);
    const s = scoreAt(bx, by);
    setProbe({ x, y, mm: [bx, by], score: s });
  }, [mode, manual, H]);

  /* ---------- lock, save, restore ---------- */
  const lock = useCallback(() => {
    if (!H || !pts) return;
    // The zoom matters as much as the four points: calibrating zoomed in and
    // then scoring zoomed out gives a board in completely the wrong place.
    const payload = { pts, rot, savedAt: Date.now(), manual: manual.length === 4,
                      zoom: zoom ? zoom.value : null, source };
    try { window.localStorage.setItem(CAL_KEY, JSON.stringify(payload)); } catch (e) {}
    // remember what the scene looked like, so we can spot the camera moving
    const img = grabWork();
    if (img) {
      const gray = new Float64Array(WORK * WORK);
      for (let i = 0, p = 0; p < WORK * WORK; p++, i += 4)
        gray[p] = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
      const x0 = (WORK - 320) >> 1;
      baseRef.current = profiles(gray, WORK, WORK, x0, x0, 320, 320);
    }
    setMode("locked");
    setDrift({ dx: 0, dy: 0 });
    setMsg("Calibration locked and saved on this phone. Tap the board to test the scoring.");
  }, [H, pts, rot, manual, grabWork, zoom, source]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CAL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.pts?.length === 4) {
        setManual(p.manual ? p.pts : []);
        setPts(p.pts);
        setRot(p.rot || 0);
        setMsg("Found a saved calibration from last time. Start the camera to check it still lines up.");
      }
    } catch (e) {}
  }, []);

  // Drift meter, while locked on live camera.
  useEffect(() => {
    if (mode !== "locked" || source !== "camera") return;
    const id = setInterval(() => {
      const img = grabWork();
      if (!img || !baseRef.current) return;
      const gray = new Float64Array(WORK * WORK);
      for (let i = 0, p = 0; p < WORK * WORK; p++, i += 4)
        gray[p] = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
      const x0 = (WORK - 320) >> 1;
      const cur = profiles(gray, WORK, WORK, x0, x0, 320, 320);
      setDrift({
        dx: shift1d(baseRef.current.cols, cur.cols),
        dy: shift1d(baseRef.current.rows, cur.rows),
      });
    }, 1200);
    return () => clearInterval(id);
  }, [mode, source, grabWork]);

  const applyZoom = (v) => {
    setZoom((z) => (z ? { ...z, value: v } : z));
    trackRef.current?.applyConstraints?.({ advanced: [{ zoom: v }] }).catch(() => {});
  };

  const failed = tests.filter((t) => !t.pass).length;
  const driftMag = drift ? Math.hypot(drift.dx, drift.dy) : 0;

  return (
    <main className="min-h-screen bg-odcBlack text-odcCream">
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
        <header className="mb-5">
          <p className="mono text-[11px] uppercase tracking-[0.2em] text-odcGold">
            Autoscoring · Stage 3
          </p>
          <h1 className="mt-1 text-3xl leading-none">Board calibration</h1>
          <p className="mt-3 text-sm leading-relaxed text-odcCream/70">
            This works out where your board is in the picture. When it has, it draws
            the rings it thinks it found back on top of the real board. If they sit on
            the real rings, it is right — you can see it, no guessing.
          </p>
          <p className="mt-2 rounded-lg border border-odcGold/25 bg-odcGold/5 px-3 py-2 text-xs leading-relaxed text-odcGold">
            Still nowhere near the live scorer. No darts are detected on this page.
          </p>
        </header>

        <section className="rounded-2xl border border-odcCream/10 bg-odcNavy p-3 shadow-raised">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="hidden" />
            <canvas ref={dispRef} className="h-full w-full" />
            <canvas
              ref={ovlRef}
              onClick={onTap}
              className="absolute inset-0 h-full w-full"
              style={{ touchAction: "manipulation" }}
            />
            {source === "none" && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <p className="mono text-sm text-odcCream/50">No picture yet</p>
              </div>
            )}
          </div>

          <p className="mono mt-2 text-[11px] leading-relaxed text-odcCream/55">{msg}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {source !== "camera" && (
              <button onClick={startCamera}
                className="flex-1 rounded-xl bg-odcGreen px-4 py-3 text-sm font-semibold text-odcBlack active:scale-[0.98]">
                Start camera
              </button>
            )}
            <label className="cursor-pointer rounded-xl border border-odcCream/20 px-4 py-3 text-sm text-odcCream/80 active:scale-[0.98]">
              Load a photo
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => loadPhoto(e.target.files?.[0])} />
            </label>
            {source !== "none" && (
              <button onClick={find}
                className="flex-1 rounded-xl bg-odcRed px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]">
                Find the board
              </button>
            )}
          </div>

          {source !== "none" && (
            <button
              onClick={() => { setMode("manual"); setManual([]); setBoard(null); setProbe(null);
                setMsg("Tap 20 at the top of the outer double ring."); }}
              className="mono mt-2 text-xs text-odcCream/45 underline">
              or place the four points by hand
            </button>
          )}

          {zoom && source === "camera" && (
            <label className="mt-3 block">
              <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                Zoom · {Number(zoom.value).toFixed(1)}x
              </span>
              <input type="range" min={zoom.min} max={zoom.max} step={zoom.step}
                value={zoom.value} onChange={(e) => applyZoom(Number(e.target.value))}
                className="mt-1 w-full accent-odcGold" />
            </label>
          )}

          {(board || manual.length === 4) && (
            <label className="mt-3 block">
              <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                Rotation · {rot}°  — turn until the drawn numbers match the real ones
              </span>
              <input type="range" min={0} max={359} step={1} value={rot}
                onChange={(e) => setRot(Number(e.target.value))}
                className="mt-1 w-full accent-odcGold" />
              <span className="mt-1 flex gap-2">
                {[-18, -1, +1, +18].map((d) => (
                  <button key={d} onClick={() => setRot((r) => (r + d + 360) % 360)}
                    className="mono flex-1 rounded-lg border border-odcCream/15 py-1.5 text-xs text-odcCream/70">
                    {d > 0 ? "+" : ""}{d}°
                  </button>
                ))}
              </span>
            </label>
          )}
        </section>

        {check && (
          <section className={`mt-4 rounded-2xl border p-4 ${
            check.ok ? "border-odcGreen/40 bg-odcGreen/10" : "border-odcRed/40 bg-odcRed/10"}`}>
            <h2 className={`text-lg ${check.ok ? "text-odcGreenBright" : "text-odcRed"}`}>
              {check.ok ? "Centre check passed" : "Centre check failed"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-odcCream/80">
              The middle of the board works out as <span className="mono">{check.label}</span>,
              {" "}{check.offMm.toFixed(1)} mm from dead centre.{" "}
              {check.ok
                ? "That is what it should be. Now check the drawn rings sit on the real ones and the numbers match."
                : "That is wrong — the board has not been found properly. Try Find the board again, or place the four points by hand."}
            </p>
          </section>
        )}

        {H && mode !== "locked" && (
          <button onClick={lock}
            className="mt-4 w-full rounded-xl bg-odcGold px-4 py-3 text-sm font-semibold text-odcBlack active:scale-[0.98]">
            Rings line up — lock this calibration
          </button>
        )}

        {probe && (
          <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
            <h2 className="text-lg">Where you tapped</h2>
            <dl className="mono mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-odcCream/45">Score</dt>
              <dd className="text-right text-base text-odcGold">{probe.score.label}</dd>
              <dt className="text-odcCream/45">Worth</dt>
              <dd className="text-right tabular-nums">{probe.score.value}</dd>
              <dt className="text-odcCream/45">Ring</dt>
              <dd className="text-right">{probe.score.ring}</dd>
              <dt className="text-odcCream/45">Distance from bull</dt>
              <dd className="text-right tabular-nums">{Math.hypot(...probe.mm).toFixed(1)} mm</dd>
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-odcCream/55">
              Tap a few beds you know — treble twenty, double sixteen, the bull. If the
              answers are right, the calibration is right.
            </p>
          </section>
        )}

        {mode === "locked" && (
          <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
            <h2 className="text-lg">Has the camera moved?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-odcCream/70">
              Measured against the moment you locked. A nudge of even two pixels is
              enough to upset dart detection, which is why this is here.
            </p>
            <p className={`mono mt-3 text-2xl tabular-nums ${
              driftMag < 1.5 ? "text-odcGreenBright" : driftMag < 4 ? "text-odcGold" : "text-odcRed"}`}>
              {driftMag.toFixed(2)} px
            </p>
            <p className="mono mt-1 text-xs text-odcCream/45">
              sideways {drift?.dx.toFixed(2)} · up-down {drift?.dy.toFixed(2)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-odcCream/55">
              {driftMag < 1.5 ? "Rock steady." :
               driftMag < 4 ? "Slight drift. Fine for now, but this is what a bendy arm does."
               : "Moved too much — worth finding the board again."}
            </p>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
          <button onClick={() => setShowTests((s) => !s)}
            className="flex w-full items-baseline justify-between gap-3">
            <h2 className="text-lg">Scoring maths self-test</h2>
            <span className={`mono text-xs ${failed ? "text-odcRed" : "text-odcGreenBright"}`}>
              {tests.length - failed} / {tests.length} passed
            </span>
          </button>
          <p className="mt-1.5 text-xs leading-relaxed text-odcCream/55">
            These check the board geometry against known answers every time the page
            loads — treble twenty really is treble twenty, the wire is a miss, and so
            on. They do not involve the camera.
          </p>
          {showTests && (
            <ul className="mono mt-3 space-y-1 text-[11px]">
              {tests.map((t) => (
                <li key={t.name} className="flex justify-between gap-2">
                  <span className="text-odcCream/60">{t.name}</span>
                  <span className={t.pass ? "text-odcGreenBright" : "text-odcRed"}>
                    {t.pass ? t.got : `${t.got} — expected ${t.want}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mono mt-6 text-center text-[11px] leading-relaxed text-odcCream/30">
          ODC autoscoring · calibration bench · no darts detected here · no league data
        </p>
      </div>
    </main>
  );
     }
