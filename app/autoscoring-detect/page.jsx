// app/autoscoring-detect/page.jsx
//
// ODC AUTOSCORING — STAGE 4: dart detection and the three-dart visit.
//
// HOW IT WORKS, in plain English:
//
//   The camera never moves. So we take a photo of the empty board and keep it.
//   Every so often we take a new photo and ask "what is different?". The answer
//   is a dart, because nothing else in the picture ever changes.
//
//   Two things make that actually work rather than nearly work:
//
//   1. ALIGNMENT. Your arm flexes by about a pixel. That is invisible to you,
//      but it makes every wire and every segment edge look "different", and you
//      get ten fake darts. So before comparing, we slide the new picture back
//      into line with the old one. Measured on your own board photos this takes
//      the false readings from eleven down to none.
//
//   2. RE-BASELINING. After each dart is counted, that picture becomes the new
//      "before". So dart two is whatever changed since dart one, not since the
//      board was empty. Darts cannot be counted twice.
//
//   Finding the point of the dart is the hard part, and this is honest about it.
//   Two independent rules are used, and if they disagree it says so and asks you
//   rather than guessing.
//
// This page does NOT touch the live ODC scorer. It shows the visit it worked
// out, and stops there. Wiring it into the real scoreboard is Stage 5.
//
// Needs a calibration from /autoscoring-calibrate first.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ================= board constants (same as calibration) ================= */
const RING_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const B = { bull: 6.35, outerBull: 15.9, trebleIn: 99, trebleOut: 107, doubleIn: 162, doubleOut: 170 };
const WORK = 480;
const CAL_KEY = "odc:autoscore:calibration:v1";
const AXIS_KEY = "odc:autoscore:axispoint:v1";

function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= B.bull) return { value: 50, label: "BULL", ring: "bull" };
  if (r <= B.outerBull) return { value: 25, label: "25", ring: "outer bull" };
  if (r > B.doubleOut) return { value: 0, label: "MISS", ring: "off board" };
  let a = (Math.atan2(x, -y) * 180) / Math.PI;
  if (a < 0) a += 360;
  const num = RING_ORDER[Math.floor(((a + 9) % 360) / 18)];
  if (r >= B.trebleIn && r <= B.trebleOut) return { value: num * 3, label: "T" + num, ring: "treble" };
  if (r >= B.doubleIn) return { value: num * 2, label: "D" + num, ring: "double" };
  return { value: num, label: "S" + num, ring: "single" };
}

/* ================= linear algebra ================= */
function solveLin(M, b) {
  const n = b.length, m = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    if (Math.abs(d) < 1e-12) continue;
    for (let k = c; k <= n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c]; if (!f) continue;
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((r) => r[n]);
}
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
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / d, (H[1][0] * x + H[1][1] * y + H[1][2]) / d];
}
function invert3(M) {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
  const A = e * i - f * h, Bv = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * Bv + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [[A / det, (c * h - b * i) / det, (b * f - c * e) / det],
          [Bv / det, (a * i - c * g) / det, (c * d - a * f) / det],
          [C / det, (b * g - a * h) / det, (a * e - b * d) / det]];
}

/* ================= alignment (the thing that makes this work) ================= */
const PROF = 340, PROF0 = (WORK - PROF) >> 1;

/** Grey, then softened. The softening matters more than it looks: without it
 *  camera sensor noise alone makes several percent of the board read as
 *  "changed", which drowns the darts. A 5-tap blur in each direction. */
function toGray(data) {
  const raw = new Float32Array(WORK * WORK);
  for (let i = 0, p = 0; p < WORK * WORK; p++, i += 4)
    raw[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

  const K = [1, 4, 6, 4, 1], KS = 16;
  const tmp = new Float32Array(WORK * WORK);
  for (let y = 0; y < WORK; y++) {
    const row = y * WORK;
    for (let x = 0; x < WORK; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++) {
        let xx = x + k;
        if (xx < 0) xx = 0; else if (xx >= WORK) xx = WORK - 1;
        acc += raw[row + xx] * K[k + 2];
      }
      tmp[row + x] = acc / KS;
    }
  }
  const out = new Float32Array(WORK * WORK);
  for (let y = 0; y < WORK; y++) {
    for (let x = 0; x < WORK; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++) {
        let yy = y + k;
        if (yy < 0) yy = 0; else if (yy >= WORK) yy = WORK - 1;
        acc += tmp[yy * WORK + x] * K[k + 2];
      }
      out[y * WORK + x] = acc / KS;
    }
  }
  return out;
}
function profiles(g) {
  const rows = new Float32Array(PROF), cols = new Float32Array(PROF);
  let tot = 0;
  for (let y = 0; y < PROF; y++) {
    const off = (PROF0 + y) * WORK + PROF0;
    for (let x = 0; x < PROF; x++) { const v = g[off + x]; rows[y] += v; cols[x] += v; tot += v; }
  }
  const mr = tot / PROF, mc = tot / PROF;
  for (let i = 0; i < PROF; i++) { rows[i] -= mr; cols[i] -= mc; }
  return { rows, cols };
}
function sad(a, b, s) {
  let sum = 0, n = 0;
  if (s < 0) for (let i = 0; i < a.length + s; i++) { sum += Math.abs(a[i - s] - b[i]); n++; }
  else for (let i = 0; i < a.length - s; i++) { sum += Math.abs(a[i] - b[i + s]); n++; }
  return n ? sum / n : Infinity;
}
function shift1d(a, b, rng = 12) {
  let best = 0, bs = Infinity;
  for (let s = -rng; s <= rng; s++) { const d = sad(a, b, s); if (d < bs) { bs = d; best = s; } }
  const y1 = sad(a, b, best - 1), y2 = sad(a, b, best), y3 = sad(a, b, best + 1);
  const den = y1 - 2 * y2 + y3;
  return best + (Math.abs(den) > 1e-9 ? (0.5 * (y1 - y3)) / den : 0);
}
/** shift a grayscale buffer by (dx,dy), bilinear */
function shiftGray(g, dx, dy) {
  const out = new Float32Array(WORK * WORK);
  const fx = Math.floor(dx), fy = Math.floor(dy);
  const ax = dx - fx, ay = dy - fy;
  for (let y = 0; y < WORK; y++) {
    for (let x = 0; x < WORK; x++) {
      const sx = x + fx, sy = y + fy;
      if (sx < 0 || sy < 0 || sx + 1 >= WORK || sy + 1 >= WORK) { out[y * WORK + x] = g[y * WORK + x]; continue; }
      const i = sy * WORK + sx;
      out[y * WORK + x] =
        g[i] * (1 - ax) * (1 - ay) + g[i + 1] * ax * (1 - ay) +
        g[i + WORK] * (1 - ax) * ay + g[i + WORK + 1] * ax * ay;
    }
  }
  return out;
}

/* ================= finding what changed ================= */
function detectBlobs(cur, ref, inside, thr) {
  // brightness bias: kills camera auto-exposure drift
  let s = 0, c = 0;
  for (let p = 0; p < cur.length; p += 5) if (inside[p]) { s += cur[p] - ref[p]; c++; }
  const bias = c ? s / c : 0;

  const m = new Uint8Array(WORK * WORK);
  let changed = 0, total = 0;
  for (let p = 0; p < m.length; p++) {
    if (!inside[p]) continue;
    total++;
    if (Math.abs(cur[p] - bias - ref[p]) > thr) { m[p] = 1; changed++; }
  }
  const changedPct = total ? (changed / total) * 100 : 0;

  // open then close: drop speckle, join the dart to its own shaft
  const e = new Uint8Array(m.length);
  for (let y = 1; y < WORK - 1; y++) for (let x = 1; x < WORK - 1; x++) {
    const i = y * WORK + x; if (!m[i]) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += m[i + dy * WORK + dx];
    if (n >= 6) e[i] = 1;
  }
  const d = new Uint8Array(m.length);
  for (let y = 2; y < WORK - 2; y++) for (let x = 2; x < WORK - 2; x++) {
    const i = y * WORK + x; if (!e[i]) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) d[i + dy * WORK + dx] = 1;
  }

  const seen = new Uint8Array(m.length), out = [], stack = [];
  for (let s0 = 0; s0 < d.length; s0++) {
    if (!d[s0] || seen[s0]) continue;
    stack.length = 0; stack.push(s0); seen[s0] = 1;
    const px = [];
    while (stack.length) {
      const i = stack.pop(); px.push(i);
      const x = i % WORK, y = (i / WORK) | 0;
      if (x > 0 && d[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < WORK - 1 && d[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && d[i - WORK] && !seen[i - WORK]) { seen[i - WORK] = 1; stack.push(i - WORK); }
      if (y < WORK - 1 && d[i + WORK] && !seen[i + WORK]) { seen[i + WORK] = 1; stack.push(i + WORK); }
    }
    if (px.length < 130 || px.length > 20000) continue;

    let sx = 0, sy = 0;
    const pts = px.map((i) => { const x = i % WORK, y = (i / WORK) | 0; sx += x; sy += y; return [x, y]; });
    const cx = sx / pts.length, cy = sy / pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pts) { const ddx = x - cx, ddy = y - cy; sxx += ddx * ddx; syy += ddy * ddy; sxy += ddx * ddy; }
    const n = pts.length; sxx /= n; syy /= n; sxy /= n;
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ux = Math.cos(th), uy = Math.sin(th), px2 = -uy, py2 = ux;
    let lo = Infinity, hi = -Infinity, A = null, Bp = null;
    const ts = [], ss = [];
    for (const [x, y] of pts) {
      const t = (x - cx) * ux + (y - cy) * uy, sPerp = (x - cx) * px2 + (y - cy) * py2;
      ts.push(t); ss.push(sPerp);
      if (t < lo) { lo = t; A = [x, y]; }
      if (t > hi) { hi = t; Bp = [x, y]; }
    }
    const L = hi - lo;
    if (L < 22) continue;
    // how fat is each end? (the flight is fat, the point is thin)
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (let k = 0; k < ts.length; k++) {
      if (ts[k] <= lo + 0.22 * L) { aMin = Math.min(aMin, ss[k]); aMax = Math.max(aMax, ss[k]); }
      if (ts[k] >= hi - 0.22 * L) { bMin = Math.min(bMin, ss[k]); bMax = Math.max(bMax, ss[k]); }
    }
    out.push({ a: A, b: Bp, len: L, area: pts.length, cx, cy,
               wa: aMax - aMin, wb: bMax - bMin });
  }
  return { blobs: out, changedPct, bias };
}

/** How far a point is from a line segment — used to tell whether a blob
 *  is a dart we have already counted. */
function distToSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const wx = p[0] - a[0], wy = p[1] - a[1];
  const L2 = vx * vx + vy * vy;
  let t = L2 ? (wx * vx + wy * vy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

/* ================= which end is the point? ================= */
function chooseTip(blob, axis) {
  const dA = Math.hypot(blob.a[0] - axis[0], blob.a[1] - axis[1]);
  const dB = Math.hypot(blob.b[0] - axis[0], blob.b[1] - axis[1]);
  const geo = dA < dB ? "a" : "b";                 // nearer the camera axis
  const thin = blob.wa < blob.wb ? "a" : "b";      // thinner end
  const ratio = Math.min(blob.wa, blob.wb) / Math.max(blob.wa, blob.wb, 1);
  const agree = geo === thin;
  return {
    tip: blob[geo], flight: blob[geo === "a" ? "b" : "a"],
    other: blob[thin], geo, thin, agree,
    // confident when both rules agree AND the two ends really are different widths
    confidence: agree ? (ratio < 0.6 ? "high" : "medium") : "low",
    widthRatio: ratio,
  };
}

export default function DetectPage() {
  const videoRef = useRef(null);
  const dispRef = useRef(null);
  const ovlRef = useRef(null);
  const workRef = useRef(null);
  const streamRef = useRef(null);
  const stillRef = useRef(null);
  // TWO references, and the difference between them matters:
  //   emptyRef — the board with no darts in it. Never changes during a visit.
  //              Used to spot "the darts have been pulled out, start again".
  //   baseRef  — the board as of the last dart counted. Used to spot the NEXT
  //              dart, so a dart already counted cannot be counted twice.
  // Both are stored aligned to emptyRef, so one alignment per frame serves both.
  const baseRef = useRef(null);     // { gray, prof }
  const emptyRef = useRef(null);    // { gray }
  const insideRef = useRef(null);
  const loopRef = useRef(null);
  const rafRef = useRef(null);
  const busyRef = useRef(false);
  const candRef = useRef([]);       // candidates awaiting stability
  const seenRef = useRef([]);       // darts already counted this visit
  const shaftsRef = useRef([]);     // for refining the camera axis point

  // Where the picture is coming from, kept in a ref as well as in state.
  // The state drives what is drawn; the ref is what grab() reads, because
  // grab() is called from callbacks created before the state has caught up.
  const sourceRef = useRef("none");
  const [hasBaseline, setHasBaseline] = useState(false);

  const [cal, setCal] = useState(null);
  const [H, setH] = useState(null);
  const [axis, setAxis] = useState(null);
  const [source, setSource] = useState("none");
  const [running, setRunning] = useState(false);
  const [visit, setVisit] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Load your calibration, then start the camera.");
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(true);
  const [pending, setPending] = useState(null);   // low-confidence dart awaiting a decision
  const [thr, setThr] = useState(26);
  const [zoom, setZoom] = useState(null);
  const [zoomWarn, setZoomWarn] = useState(null);
  const trackRef = useRef(null);
  const [lastBlobs, setLastBlobs] = useState([]);

  /* ---------- restore calibration ---------- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CAL_KEY);
      if (!raw) { setStatus("No calibration found. Do /autoscoring-calibrate first, then come back."); return; }
      const p = JSON.parse(raw);
      if (!p?.pts || p.pts.length !== 4) { setStatus("Saved calibration looks wrong. Calibrate again."); return; }
      const rot = p.rot || 0;
      const dst = [0, 90, 180, 270].map((base) => {
        const a = ((base + rot) * Math.PI) / 180;
        return [B.doubleOut * Math.sin(a), -B.doubleOut * Math.cos(a)];
      });
      const Hn = homography(p.pts, p.manual ? dst : [[0, -B.doubleOut], [B.doubleOut, 0], [0, B.doubleOut], [-B.doubleOut, 0]]);
      setCal(p); setH(Hn);
      const Hi = invert3(Hn);
      let ax = null;
      try { const s = window.localStorage.getItem(AXIS_KEY); if (s) ax = JSON.parse(s); } catch (e) {}
      setAxis(ax || (Hi ? applyH(Hi, 0, 0) : [WORK / 2, WORK / 2]));
      setStatus("Calibration loaded. Start the camera, clear the board, then Set baseline.");
      // the region we look inside: the scoring area, plus a little for wire darts
      if (Hi) {
        const inside = new Uint8Array(WORK * WORK);
        for (let y = 0; y < WORK; y++) for (let x = 0; x < WORK; x++) {
          const [mx, my] = applyH(Hn, x, y);
          if (Math.hypot(mx, my) <= B.doubleOut * 1.08) inside[y * WORK + x] = 1;
        }
        insideRef.current = inside;
      }
    } catch (e) { setStatus("Could not read the saved calibration."); }
  }, []);

  /* ---------- frame grabbing ---------- */
  const grab = useCallback(() => {
    if (!workRef.current) workRef.current = document.createElement("canvas");
    const c = workRef.current;
    if (c.width !== WORK) { c.width = WORK; c.height = WORK; }
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const isPhoto = sourceRef.current === "photo";
    const src = isPhoto ? stillRef.current : videoRef.current;
    if (!src) return null;
    const w = isPhoto ? src.naturalWidth : src.videoWidth;
    const h = isPhoto ? src.naturalHeight : src.videoHeight;
    if (!w) return null;
    const side = Math.min(w, h);
    ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, WORK, WORK);
    return ctx.getImageData(0, 0, WORK, WORK);
  }, []);

  const paint = useCallback(() => {
    const d = dispRef.current;
    if (d) {
      if (d.width !== WORK) { d.width = WORK; d.height = WORK; }
      const ctx = d.getContext("2d");
      const isPhoto = sourceRef.current === "photo";
      const src = isPhoto ? stillRef.current : videoRef.current;
      const w = isPhoto ? src?.naturalWidth : src?.videoWidth;
      const h = isPhoto ? src?.naturalHeight : src?.videoHeight;
      if (src && w) {
        const side = Math.min(w, h);
        ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, WORK, WORK);
      }
    }
    if (sourceRef.current === "camera") rafRef.current = requestAnimationFrame(paint);
  }, []);

  useEffect(() => {
    if (source === "camera") { rafRef.current = requestAnimationFrame(paint); return () => cancelAnimationFrame(rafRef.current); }
    if (source === "photo") paint();
  }, [source, paint]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = s;
      trackRef.current = s.getVideoTracks()[0];
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      sourceRef.current = "camera";
      setSource("camera");

      // Match the zoom the calibration was locked at, or the board will not be
      // where the maths thinks it is.
      let caps = {};
      try { caps = trackRef.current.getCapabilities?.() || {}; } catch (e) {}
      if (caps.zoom) {
        const want = cal?.zoom;
        const start = want != null
          ? Math.max(caps.zoom.min, Math.min(caps.zoom.max, want))
          : (trackRef.current.getSettings?.().zoom ?? caps.zoom.min);
        setZoom({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1, value: start });
        try { await trackRef.current.applyConstraints({ advanced: [{ zoom: start }] }); } catch (e) {}
        if (want != null) setZoomWarn(null);
        else setZoomWarn("This calibration was saved without a zoom setting. Line the board up by eye, or calibrate again.");
      } else if (cal?.zoom != null) {
        setZoomWarn("This phone will not let the page set the zoom. Match it by hand to how it was when you calibrated.");
      }

      setStatus(cal?.source === "photo"
        ? "Careful: that calibration was made from a loaded photo, not this camera. Calibrate again on the live view before scoring."
        : "Camera running. Clear the board completely, then tap Set baseline.");
    } catch (e) { setStatus("Camera would not start: " + (e?.name || e)); }
  }, [cal]);

  /* ---------- overlay ---------- */
  const drawOverlay = useCallback(() => {
    const c = ovlRef.current; if (!c) return;
    if (c.width !== WORK) { c.width = WORK; c.height = WORK; }
    const g = c.getContext("2d");
    g.clearRect(0, 0, WORK, WORK);
    const Hi = H ? invert3(H) : null;
    if (Hi && showDebug) {
      g.strokeStyle = "rgba(217,180,91,.5)"; g.lineWidth = 1.5;
      for (const rmm of [B.doubleOut, B.doubleIn, B.trebleOut, B.trebleIn, B.outerBull]) {
        g.beginPath();
        for (let k = 0; k <= 90; k++) {
          const a = (k / 90) * Math.PI * 2;
          const [px, py] = applyH(Hi, rmm * Math.sin(a), -rmm * Math.cos(a));
          k === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.stroke();
      }
    }
    if (showDebug) for (const bl of lastBlobs) {
      g.strokeStyle = "rgba(107,168,220,.9)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(bl.a[0], bl.a[1]); g.lineTo(bl.b[0], bl.b[1]); g.stroke();
    }
    visit.forEach((d, i) => {
      g.strokeStyle = d.confidence === "low" ? "#D9B45B" : "#E63329";
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(d.tip[0], d.tip[1], 10, 0, 7); g.stroke();
      g.fillStyle = "#E9EFE7"; g.font = "bold 13px sans-serif";
      g.fillText(d.label, d.tip[0] + 13, d.tip[1] + 4);
      g.fillStyle = "rgba(233,239,231,.5)"; g.font = "10px sans-serif";
      g.fillText(String(i + 1), d.tip[0] - 3, d.tip[1] + 3);
    });
    if (pending) {
      for (const [p, col] of [[pending.tip, "#23A566"], [pending.other, "#E63329"]]) {
        g.strokeStyle = col; g.lineWidth = 3;
        g.beginPath(); g.arc(p[0], p[1], 12, 0, 7); g.stroke();
      }
    }
    if (axis && showDebug) {
      g.strokeStyle = "rgba(43,191,119,.8)"; g.lineWidth = 1;
      g.beginPath(); g.arc(axis[0], axis[1], 5, 0, 7); g.stroke();
    }
  }, [H, visit, pending, lastBlobs, axis, showDebug]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  /* ---------- baseline ---------- */
  const setBaseline = useCallback(() => {
    const img = grab(); if (!img) { setStatus("No picture yet."); return; }
    const gray = toGray(img.data);
    baseRef.current = { gray, prof: profiles(gray) };
    emptyRef.current = { gray };
    setHasBaseline(true);
    candRef.current = []; seenRef.current = [];
    setVisit([]); setPending(null); setLastBlobs([]);
    setStatus("Baseline set. Throw.");
  }, [grab]);

  /* ---------- accept a dart ---------- */
  const commitDart = useCallback((blob, pick, rebaseGray) => {
    const [mx, my] = applyH(H, pick.tip[0], pick.tip[1]);
    const s = scoreAt(mx, my);
    const dart = {
      tip: pick.tip, other: pick.other, flight: pick.flight,
      label: s.label, value: s.value, ring: s.ring,
      mm: [mx, my], confidence: pick.confidence,
      geo: pick.geo, thin: pick.thin, widthRatio: pick.widthRatio,
      len: blob.len, area: blob.area,
    };
    seenRef.current.push(pick.tip);
    shaftsRef.current.push([blob.a, blob.b]);
    // NOTE: we deliberately do NOT fold this dart into the reference picture.
    // Every frame is compared against the EMPTY board, so all the darts in the
    // board show up every time. A dart is stopped from being counted twice by
    // remembering where its point was, not by hiding it. That way two darts
    // landing between two looks are both still found.
    setVisit((v) => {
      const nv = [...v, dart];
      if (nv.length >= 3) {
        setStatus(`Visit complete: ${nv.map((d) => d.label).join(" ")} = ${nv.reduce((a, d) => a + d.value, 0)}. Pull the darts out.`);
      } else {
        setStatus(`Dart ${nv.length}: ${dart.label}. Throw again.`);
      }
      return nv;
    });
  }, [H]);

  /* ---------- the loop ---------- */
  const step = useCallback(() => {
    if (busyRef.current || !baseRef.current || !H || !insideRef.current) return;
    busyRef.current = true;
    const t0 = performance.now();
    try {
      const img = grab(); if (!img) return;
      let gray = toGray(img.data);

      // 1. Slide back into line with the baseline. Done twice: the first pass
      //    gets most of it, the second mops up the residue, which matters on
      //    the bigger nudges where one pass leaves a pixel behind and a pixel
      //    is enough to light up every wire on the board.
      const refProf = baseRef.current.prof;
      let dx = 0, dy = 0;
      for (let pass = 0; pass < 2; pass++) {
        const pr = profiles(gray);
        const ex = shift1d(refProf.cols, pr.cols);
        const ey = shift1d(refProf.rows, pr.rows);
        if (Math.abs(ex) < 0.05 && Math.abs(ey) < 0.05) break;
        dx += ex; dy += ey;
        gray = shiftGray(gray, ex, ey);
      }
      const drift = Math.hypot(dx, dy);

      // 2. Compare against the EMPTY board — always. Every dart currently in
      //    the board shows up in this list, every time.
      const { blobs, changedPct } = detectBlobs(gray, emptyRef.current.gray, insideRef.current, thr);
      setLastBlobs(blobs);

      const tMs = performance.now() - t0;
      setDebug({ dx, dy, drift, changedPct, inBoard: changedPct,
                 blobs: blobs.length, ms: tMs,
                 candidates: candRef.current.length, counted: seenRef.current.length });

      // 3. Something big is in the way — an arm reaching in, or the light
      //    changed. Do not try to score through it.
      if (changedPct > 16) {
        candRef.current = [];
        setStatus("Board obscured — waiting.");
        return;
      }

      // 4. Nothing in the board at all, but we counted darts: they were pulled
      //    out, so bank the visit and start again.
      if (seenRef.current.length > 0 && blobs.length === 0 && changedPct < 0.7) {
        setHistory((h) => (visit.length
          ? [{ darts: visit, total: visit.reduce((a, d) => a + d.value, 0), at: Date.now() }, ...h].slice(0, 12)
          : h));
        seenRef.current = []; candRef.current = [];
        setVisit([]); setPending(null);
        emptyRef.current = { gray };
        baseRef.current = { gray, prof: profiles(gray) };
        setStatus("Board clear. New visit — throw when ready.");
        return;
      }

      if (pending || seenRef.current.length >= 3) return;

      // 5. Which of these are darts we have not counted yet? A blob counts as
      //    already-seen if a point we have recorded lies on it.
      const fresh = blobs.filter((bl) =>
        seenRef.current.every((t) => distToSeg(t, bl.a, bl.b) > 13));

      // 6. A blob must hold still across two looks before it counts, so a
      //    dart still quivering in the board is not measured mid-wobble.
      const next = [];
      for (const bl of fresh) {
        const mid = [bl.cx, bl.cy];
        const prev = candRef.current.find((c) => Math.hypot(c.mid[0] - mid[0], c.mid[1] - mid[1]) < 7);
        const n = (prev?.n || 0) + 1;
        if (n >= 2) {
          const pick = chooseTip(bl, axis || [WORK / 2, WORK / 2]);
          // A blob far longer than a dart is probably two darts touching.
          const merged = bl.len > 95;
          if (pick.confidence === "low" || merged) {
            setPending({ blob: bl, ...pick, gray, merged });
            setStatus(merged
              ? "That looks like two darts touching — check the point it has picked."
              : "Not sure which end is the point — tap the right one.");
          } else {
            commitDart(bl, pick, null);
          }
          candRef.current = next;
          return;
        }
        next.push({ mid, n });
      }
      candRef.current = next;
    } finally { busyRef.current = false; }
  }, [grab, H, thr, axis, pending, visit, commitDart]);

  useEffect(() => {
    if (!running) return;
    loopRef.current = setInterval(step, 220);
    return () => clearInterval(loopRef.current);
  }, [running, step]);

  /* ---------- the human decides ---------- */
  const resolvePending = useCallback((which) => {
    if (!pending) return;
    const tip = which === "tip" ? pending.tip : pending.other;
    const other = which === "tip" ? pending.other : pending.tip;
    commitDart(pending.blob, { ...pending, tip, other, flight: other, confidence: "confirmed" }, pending.gray);
    // learn: once a few shafts are known, work out where the camera axis really is
    if (shaftsRef.current.length >= 4) {
      const A = [], b = [];
      for (const [p, q] of shaftsRef.current) {
        const ax = q[0] - p[0], ay = q[1] - p[1];
        const L = Math.hypot(ax, ay) || 1;
        const nx = -ay / L, ny = ax / L;
        A.push([nx, ny]); b.push(nx * p[0] + ny * p[1]);
      }
      const M = [[0, 0], [0, 0]], rhs = [0, 0];
      for (let i = 0; i < A.length; i++) {
        M[0][0] += A[i][0] * A[i][0]; M[0][1] += A[i][0] * A[i][1];
        M[1][0] += A[i][1] * A[i][0]; M[1][1] += A[i][1] * A[i][1];
        rhs[0] += A[i][0] * b[i]; rhs[1] += A[i][1] * b[i];
      }
      const v = solveLin(M, rhs);
      if (v.every((n) => isFinite(n) && n > -WORK && n < 2 * WORK)) {
        setAxis(v);
        try { window.localStorage.setItem(AXIS_KEY, JSON.stringify(v)); } catch (e) {}
      }
    }
    setPending(null);
  }, [pending, commitDart]);

  const editDart = useCallback((i, label) => {
    setVisit((v) => v.map((d, j) => {
      if (j !== i) return d;
      const up = label.toUpperCase().trim();
      let value = 0;
      if (up === "BULL") value = 50;
      else if (up === "25") value = 25;
      else if (up === "MISS") value = 0;
      else {
        const m = up.match(/^([TDS]?)(\d{1,2})$/);
        if (!m) return d;
        const n = parseInt(m[2], 10);
        if (!RING_ORDER.includes(n)) return d;
        value = n * (m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1);
      }
      return { ...d, label: up, value, confidence: "corrected" };
    }));
  }, []);

  const loadPhoto = useCallback((file, asBaseline) => {
    if (!file) return;
    const im = new Image();
    im.onload = () => {
      stillRef.current = im;
      sourceRef.current = "photo";
      setSource("photo");
      paint();
      if (asBaseline) setBaseline();
    };
    im.src = URL.createObjectURL(file);
  }, [paint, setBaseline]);

  const total = visit.reduce((a, d) => a + d.value, 0);

  return (
    <main className="min-h-screen bg-odcBlack text-odcCream">
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
        <header className="mb-5">
          <p className="mono text-[11px] uppercase tracking-[0.2em] text-odcGold">Autoscoring · Stage 4</p>
          <h1 className="mt-1 text-3xl leading-none">Dart detection</h1>
          <p className="mt-3 text-sm leading-relaxed text-odcCream/70">
            Takes a picture of the empty board, then watches for what changes. Since the
            camera never moves, anything that changes is a dart. It slides each new frame
            back into line first, which is what stops a one-pixel wobble looking like ten darts.
          </p>
          <p className="mt-2 rounded-lg border border-odcGold/25 bg-odcGold/5 px-3 py-2 text-xs leading-relaxed text-odcGold">
            Nothing here reaches the real scoreboard. It works out the visit and stops.
          </p>
        </header>

        <section className="rounded-2xl border border-odcCream/10 bg-odcNavy p-3 shadow-raised">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="hidden" />
            <canvas ref={dispRef} className="h-full w-full" />
            <canvas ref={ovlRef} className="absolute inset-0 h-full w-full" />
            {source === "none" && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <p className="mono text-sm text-odcCream/50">No picture yet</p>
              </div>
            )}
          </div>

          <p className="mono mt-2 text-[11px] leading-relaxed text-odcCream/60">{status}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {source !== "camera" && (
              <button onClick={startCamera} disabled={!H}
                className="flex-1 rounded-xl bg-odcGreen px-4 py-3 text-sm font-semibold text-odcBlack disabled:opacity-40">
                Start camera
              </button>
            )}
            <button onClick={setBaseline} disabled={source === "none" || !H}
              className="flex-1 rounded-xl border border-odcCream/25 px-4 py-3 text-sm text-odcCream/85 disabled:opacity-40">
              Set baseline
            </button>
            <button onClick={() => setRunning((r) => !r)} disabled={!hasBaseline}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 ${
                running ? "bg-odcRedDeep text-white" : "bg-odcRed text-white"}`}>
              {running ? "Pause" : "Start scoring"}
            </button>
          </div>

          {zoom && source === "camera" && (
            <label className="mt-3 block">
              <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                Zoom · {Number(zoom.value).toFixed(1)}x
                {cal?.zoom != null && Math.abs(zoom.value - cal.zoom) > 0.05 && (
                  <span className="text-odcRed"> — calibrated at {Number(cal.zoom).toFixed(1)}x</span>
                )}
              </span>
              <input type="range" min={zoom.min} max={zoom.max} step={zoom.step} value={zoom.value}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setZoom((z) => ({ ...z, value: v }));
                  trackRef.current?.applyConstraints?.({ advanced: [{ zoom: v }] }).catch(() => {});
                }}
                className="mt-1 w-full accent-odcGold" />
              <span className="mono mt-1 block text-[10px] leading-relaxed text-odcCream/45">
                Changing the zoom moves the board, so set the baseline again afterwards.
              </span>
            </label>
          )}

          {zoomWarn && (
            <p className="mono mt-2 rounded-lg border border-odcGold/30 bg-odcGold/5 px-3 py-2 text-[11px] leading-relaxed text-odcGold">
              {zoomWarn}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <label className="mono cursor-pointer rounded-lg border border-odcCream/15 px-3 py-2 text-[11px] text-odcCream/60">
              test: empty-board photo
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => loadPhoto(e.target.files?.[0], true)} />
            </label>
            <label className="mono cursor-pointer rounded-lg border border-odcCream/15 px-3 py-2 text-[11px] text-odcCream/60">
              test: photo with darts
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => loadPhoto(e.target.files?.[0], false)} />
            </label>
          </div>
        </section>

        {pending && (
          <section className="mt-4 rounded-2xl border border-odcGold/50 bg-odcGold/10 p-4">
            <h2 className="text-lg text-odcGold">Not sure — which end is the point?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-odcCream/80">
              The two ways of working this out disagreed on this dart, so it is asking
              rather than guessing. On the picture, one end is circled green and one red.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => resolvePending("tip")}
                className="flex-1 rounded-xl bg-odcGreen px-4 py-3 text-sm font-semibold text-odcBlack">
                Green end
              </button>
              <button onClick={() => resolvePending("other")}
                className="flex-1 rounded-xl bg-odcRed px-4 py-3 text-sm font-semibold text-white">
                Red end
              </button>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg">This visit</h2>
            <span className="mono text-2xl tabular-nums text-odcGold">{total}</span>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => {
              const d = visit[i];
              return (
                <li key={i} className={`rounded-xl border p-3 text-center ${
                  d ? "border-odcCream/20 bg-odcPanel2" : "border-dashed border-odcCream/10"}`}>
                  <p className="mono text-[10px] uppercase tracking-wider text-odcCream/40">Dart {i + 1}</p>
                  <p className="mt-1 text-2xl">{d ? d.label : "–"}</p>
                  {d && (
                    <>
                      <p className="mono text-[10px] text-odcCream/45">{d.value} · {d.ring}</p>
                      <p className={`mono mt-1 text-[10px] ${
                        d.confidence === "high" ? "text-odcGreenBright" :
                        d.confidence === "medium" ? "text-odcGold" : "text-odcCream/50"}`}>
                        {d.confidence}
                      </p>
                      <input
                        defaultValue={d.label}
                        onBlur={(e) => editDart(i, e.target.value)}
                        className="mono mt-1.5 w-full rounded border border-odcCream/15 bg-odcBlack/40 px-1 py-1 text-center text-[11px]"
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {visit.length > 0 && (
            <button onClick={() => { setVisit([]); seenRef.current = []; candRef.current = []; setPending(null); setStatus("Visit cleared."); }}
              className="mono mt-3 text-xs text-odcCream/40 underline">clear this visit</button>
          )}
        </section>

        {history.length > 0 && (
          <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
            <h2 className="text-lg">Earlier visits</h2>
            <ul className="mono mt-2 space-y-1 text-xs">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-odcCream/60">{h.darts.map((d) => d.label).join("  ")}</span>
                  <span className="tabular-nums text-odcGold">{h.total}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
          <button onClick={() => setShowDebug((s) => !s)} className="flex w-full items-baseline justify-between">
            <h2 className="text-lg">Debug</h2>
            <span className="mono text-xs text-odcCream/45">{showDebug ? "on" : "off"}</span>
          </button>
          {showDebug && debug && (
            <dl className="mono mt-3 grid grid-cols-2 gap-y-1.5 text-[11px]">
              <dt className="text-odcCream/45">Camera drift corrected</dt>
              <dd className="text-right tabular-nums">{debug.drift.toFixed(2)} px
                <span className="text-odcCream/35"> ({debug.dx.toFixed(1)}, {debug.dy.toFixed(1)})</span></dd>
              <dt className="text-odcCream/45">Changed vs empty board</dt>
              <dd className="text-right tabular-nums">{debug.inBoard?.toFixed(2)}%</dd>
              <dt className="text-odcCream/45">Changed vs last dart</dt>
              <dd className="text-right tabular-nums">{debug.changedPct.toFixed(2)}%</dd>
              <dt className="text-odcCream/45">New things found</dt>
              <dd className="text-right tabular-nums">{debug.blobs}</dd>
              <dt className="text-odcCream/45">Waiting to settle</dt>
              <dd className="text-right tabular-nums">{debug.candidates}</dd>
              <dt className="text-odcCream/45">Counted this visit</dt>
              <dd className="text-right tabular-nums">{debug.counted}</dd>
              <dt className="text-odcCream/45">Time per look</dt>
              <dd className="text-right tabular-nums">{debug.ms.toFixed(0)} ms</dd>
            </dl>
          )}
          {showDebug && (
            <label className="mt-3 block">
              <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                Sensitivity · {thr} — lower spots fainter darts but picks up more noise
              </span>
              <input type="range" min={12} max={60} step={1} value={thr}
                onChange={(e) => setThr(Number(e.target.value))} className="mt-1 w-full accent-odcGold" />
            </label>
          )}
        </section>

        <p className="mono mt-6 text-center text-[11px] leading-relaxed text-odcCream/30">
          ODC autoscoring · detection bench · does not touch the live scorer
        </p>
      </div>
    </main>
  );
          }
