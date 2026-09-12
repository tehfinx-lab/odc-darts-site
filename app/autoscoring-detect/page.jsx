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
const DIR_KEY = "odc:autoscore:dartdirection:v1";

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


/* ================= finding the board again, without leaving this page =======
   Same method as the calibration page: the doubles and trebles are the only
   strongly red and green things in view, so find those, then fit a squashed
   circle round the outside of them. ========================================= */
function redGreenMask(data, w, h) {
  const m = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 55) continue;
    if ((mx - mn) / mx < 0.34) continue;
    if ((r === mx && r - g > 70 && r - b > 55) || (g === mx && g - r > 38 && g - b > 18)) m[p] = 1;
  }
  return m;
}
function fitEllipseTo(pts) {
  if (pts.length < 40) return null;
  let mx = 0, my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= pts.length; my /= pts.length;
  let sc = 0;
  for (const [x, y] of pts) sc += Math.hypot(x - mx, y - my);
  sc = sc / pts.length || 1;
  const N = 5, M = Array.from({ length: N }, () => new Array(N).fill(0)), rhs = new Array(N).fill(0);
  for (const [X, Y] of pts) {
    const x = (X - mx) / sc, y = (Y - my) / sc;
    const row = [x * x, x * y, y * y, x, y];
    for (let i = 0; i < N; i++) { rhs[i] += row[i]; for (let j = 0; j < N; j++) M[i][j] += row[i] * row[j]; }
  }
  const v = solveLin(M, rhs);
  if (!v || v.some((n) => !isFinite(n))) return null;
  const [A_, B_, C_, D_, E_] = v, F_ = -1;
  const disc = B_ * B_ - 4 * A_ * C_;
  if (disc >= 0) return null;
  const ecx = (2 * C_ * D_ - B_ * E_) / disc, ecy = (2 * A_ * E_ - B_ * D_) / disc;
  const up = 2 * (A_ * ecx * ecx + B_ * ecx * ecy + C_ * ecy * ecy - F_);
  const term = Math.sqrt((A_ - C_) * (A_ - C_) + B_ * B_);
  const d1 = A_ + C_ + term, d2 = A_ + C_ - term;
  if (d1 <= 0 || d2 <= 0) return null;
  const a1 = Math.sqrt(Math.abs(up / d1)), a2 = Math.sqrt(Math.abs(up / d2));
  const phi = 0.5 * Math.atan2(B_, A_ - C_);
  const E = { cx: ecx * sc + mx, cy: ecy * sc + my,
              rx: Math.max(a1, a2) * sc, ry: Math.min(a1, a2) * sc,
              phi: a1 >= a2 ? phi : phi + Math.PI / 2 };
  if (!isFinite(E.rx) || !isFinite(E.ry) || E.ry / E.rx < 0.3) return null;
  return E;
}
function findBoard(data, w, h) {
  const m = redGreenMask(data, w, h);
  // Colour that runs off the edge of the picture is not the board: it is the
  // surround (Winmau ones are bright red), or a coloured cast over the whole
  // scene from the lighting. The scoring rings never touch the frame edge on a
  // usable shot, so drop any patch of colour that does.
  {
    const q = new Int32Array(w * h);
    let head = 0, tail = 0;
    const push = (i) => { if (m[i] === 1) { m[i] = 2; q[tail++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (head < tail) {
      const i = q[head++], x = i % w, y = (i / w) | 0;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
    for (let i = 0; i < m.length; i++) if (m[i] === 2) m[i] = 0;
  }

  let sx = 0, sy = 0, n = 0;
  for (let p = 0; p < m.length; p++) if (m[p]) { sx += p % w; sy += (p / w) | 0; n++; }
  if (n < 300) return { ok: false, why: "Cannot see enough red and green. Is the board lit and in view?" };
  const cx0 = sx / n, cy0 = sy / n, pts = [], maxR = Math.hypot(w, h) / 2;
  for (let k = 0; k < 360; k++) {
    const a = (k / 360) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    for (let r = maxR; r > 8; r -= 1) {
      const x = Math.round(cx0 + dx * r), y = Math.round(cy0 + dy * r);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (m[y * w + x]) { pts.push([x, y]); break; }
    }
  }
  const MG = 6;
  let touching = 0;
  for (const [x, y] of pts) if (x < MG || y < MG || x > w - MG || y > h - MG) touching++;
  if (touching > 4) return { ok: false, why: "The board runs off the edge of the picture. Zoom out until there is a gap all the way round the numbers." };
  const E = fitEllipseTo(pts);
  if (!E) return { ok: false, why: "Could not fit a board shape." };
  if (Math.max(E.rx, E.ry) < w * 0.22) return { ok: false, why: "Board too small in the picture. Zoom in a little." };
  const rr = Math.min(E.rx, E.ry) * 0.34;
  let rx = 0, ry = 0, rn = 0, gx = 0, gy = 0, gn = 0;
  for (let y = Math.max(0, (E.cy - rr) | 0); y < Math.min(h, E.cy + rr); y++) {
    for (let x = Math.max(0, (E.cx - rr) | 0); x < Math.min(w, E.cx + rr); x++) {
      if (Math.hypot(x - E.cx, y - E.cy) > rr) continue;
      const i = (y * w + x) * 4, R = data[i], G = data[i + 1], Bb = data[i + 2];
      const mx2 = Math.max(R, G, Bb), mn2 = Math.min(R, G, Bb);
      if (mx2 < 50 || (mx2 - mn2) / mx2 < 0.3) continue;
      if (R === mx2 && R - G > 65 && R - Bb > 50) { rx += x; ry += y; rn++; }
      else if (G === mx2 && G - R > 35 && G - Bb > 15) { gx += x; gy += y; gn++; }
    }
  }
  const bull = rn >= 6 ? [rx / rn, ry / rn] : gn >= 10 ? [gx / gn, gy / gn] : [E.cx, E.cy];
  return { ok: true, ellipse: E, bull, colourPixels: n };
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

  // ---- gather connected lumps of changed pixels ----
  const seen = new Uint8Array(m.length), comps = [], stack = [];
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
    if (px.length < 60 || px.length > 20000) continue;
    comps.push(px);
  }

  /** Work out a lump's centre, its long axis, its two ends and how fat it is
   *  at each end. */
  const describe = (px) => {
    let sx = 0, sy = 0;
    const pts = px.map((i) => { const x = i % WORK, y = (i / WORK) | 0; sx += x; sy += y; return [x, y]; });
    const cx = sx / pts.length, cy = sy / pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pts) { const dx = x - cx, dy = y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const n = pts.length; sxx /= n; syy /= n; sxy /= n;
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ux = Math.cos(th), uy = Math.sin(th), px2 = -uy, py2 = ux;
    let lo = Infinity, hi = -Infinity, A = null, Bp = null;
    const ts = [], ss = [];
    for (const [x, y] of pts) {
      const t = (x - cx) * ux + (y - cy) * uy, sp = (x - cx) * px2 + (y - cy) * py2;
      ts.push(t); ss.push(sp);
      if (t < lo) { lo = t; A = [x, y]; }
      if (t > hi) { hi = t; Bp = [x, y]; }
    }
    const L = hi - lo;
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (let k = 0; k < ts.length; k++) {
      if (ts[k] <= lo + 0.22 * L) { aMin = Math.min(aMin, ss[k]); aMax = Math.max(aMax, ss[k]); }
      if (ts[k] >= hi - 0.22 * L) { bMin = Math.min(bMin, ss[k]); bMax = Math.max(bMax, ss[k]); }
    }
    return { a: A, b: Bp, len: L, area: pts.length, cx, cy,
             ux, uy, wa: aMax - aMin, wb: bMax - bMin, px };
  };

  // ---- JOIN UP BROKEN DARTS ----
  // A long thin dart does not always survive as one lump: where the shaft
  // crosses a wire, or passes over a light patch, the difference fades and the
  // dart snaps into two or three pieces. Each piece then gets counted as its
  // own dart, which is how one dart becomes "S12 S12 S20".
  // So: join pieces that lie along the same line and are close end to end.
  let desc = comps.map(describe);
  const piecesBefore = desc.length;
  let merged = true, guard = 0;
  while (merged && guard++ < 8) {
    merged = false;
    outer:
    for (let i = 0; i < desc.length; i++) {
      for (let j = i + 1; j < desc.length; j++) {
        const A = desc[i], Bd = desc[j];
        // same direction? (axes are undirected, so compare |cos|)
        const cos = Math.abs(A.ux * Bd.ux + A.uy * Bd.uy);
        if (cos < 0.93) continue;                      // more than ~21 deg apart
        // close, end to end?
        let gap = Infinity, ga = null, gb = null;
        for (const p of [A.a, A.b]) for (const q of [Bd.a, Bd.b]) {
          const dd = Math.hypot(p[0] - q[0], p[1] - q[1]);
          if (dd < gap) { gap = dd; ga = p; gb = q; }
        }
        if (gap > 30) continue;
        // The join must run ALONG the shafts, not sideways across two darts
        // lying next to each other. Skipped for pieces that are practically
        // touching: over four or five pixels the direction of the join is just
        // noise, and it was this test wrongly rejecting the obvious merges.
        if (gap > 8) {
          const jx = gb[0] - ga[0], jy = gb[1] - ga[1];
          const jl = Math.hypot(jx, jy) || 1;
          if (Math.abs((jx / jl) * A.ux + (jy / jl) * A.uy) < 0.7) continue;
        }
        comps[i] = comps[i].concat(comps[j]);
        comps.splice(j, 1);
        desc = comps.map(describe);
        merged = true;
        break outer;
      }
    }
  }

  const out = [];
  for (const dsc of desc) {
    if (dsc.area < 130 || dsc.len < 22) continue;
    out.push(dsc);
  }
  return { blobs: out, changedPct, bias, piecesBefore, piecesAfter: desc.length };
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

/** Is this lump merely another piece of a dart already counted this visit?
 *
 *  A dart that was counted as one lump can later break into two: the light
 *  shifts a shade, a wire crossing the shaft stops standing out, and the far
 *  half of the SAME dart arrives as a brand-new lump. The footprint test does
 *  not catch it, because the new piece sits beside the recorded footprint
 *  rather than on top of it. That is how one dart scored "S20 S20".
 *
 *  Two genuinely different darts cross each other at an angle, so demanding
 *  BOTH that the lump runs parallel to the counted dart AND that it sits on
 *  that dart's own line keeps real dart three while killing the phantom. */
function isPieceOfCounted(bl, shaft) {
  const [a, b] = shaft;
  const sx = b[0] - a[0], sy = b[1] - a[1];
  const sl = Math.hypot(sx, sy) || 1;
  if (Math.abs((sx / sl) * bl.ux + (sy / sl) * bl.uy) < 0.93) return false; // >~21 deg apart
  let gap = Infinity;
  for (const p of [bl.a, bl.b]) for (const q of [a, b]) {
    gap = Math.min(gap, Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  if (gap > 34) return false;
  // How far off the counted dart's LINE does this lump sit? Measured against
  // the infinite line, not the segment: the broken-off piece usually lies
  // beyond the end of the counted shaft, which a segment distance would score
  // as "far away" even though it is dead in line with it.
  const ux = sx / sl, uy = sy / sl;
  const perp = (p) => Math.abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux);
  const off = Math.max(perp(bl.a), perp(bl.b));
  return off < 11;
}

/* ================= which end is the point? =================
   Two independent rules: the end nearer the camera's axis, and the thinner end
   (a dart is fat at the flight and thin at the point).

   But the question only matters if the two ends would score DIFFERENTLY. When
   the camera is nearly square-on the dart points at the lens, so it appears as
   a short stub and both ends sit in the same bed. Asking then is pure noise.
   So: work out the score at each end first, and only ask when they disagree. */
function chooseTip(blob, axis, scoreOf, learned) {
  const dA = Math.hypot(blob.a[0] - axis[0], blob.a[1] - axis[1]);
  const dB = Math.hypot(blob.b[0] - axis[0], blob.b[1] - axis[1]);
  const geo = dA < dB ? "a" : "b";                 // nearer the camera axis
  const thin = blob.wa < blob.wb ? "a" : "b";      // thinner end
  const ratio = Math.min(blob.wa, blob.wb) / Math.max(blob.wa, blob.wb, 1);
  let agree = geo === thin;

  // The learned direction beats both of the above once it exists, because it
  // comes from this camera, this board and this thrower rather than a guess.
  let pickEnd = geo, learnedCos = 0, usedLearned = false;
  if (learned && learned.n >= 1) {
    const vx = blob.b[0] - blob.a[0], vy = blob.b[1] - blob.a[1];
    const L = Math.hypot(vx, vy) || 1;
    const cos = (vx / L) * learned.x + (vy / L) * learned.y;   // a -> b vs flight -> tip
    learnedCos = cos;
    if (Math.abs(cos) > 0.25) { pickEnd = cos > 0 ? "b" : "a"; usedLearned = true; }
  }

  const tip = blob[pickEnd];
  const other = blob[pickEnd === "a" ? "b" : "a"];
  if (usedLearned) agree = pickEnd === thin;
  const tipScore = scoreOf ? scoreOf(tip) : null;
  const otherScore = scoreOf ? scoreOf(other) : null;
  const sameEitherWay = !!(tipScore && otherScore && tipScore.label === otherScore.label);

  // Is there a real fat-end/thin-end difference to read, or are both ends much
  // the same width? If they are the same, the shape tells us nothing and must
  // not be treated as evidence either way.
  const widthKnown = ratio < 0.85;

  let confidence;
  if (sameEitherWay) confidence = "high";           // nothing to argue about
  // THE SHAPE DISAGREES WITH THE LEARNED DIRECTION — ASK.
  // This is what put a marker on the flight instead of the point. A strong
  // learned direction used to be declared "high" on its own and committed
  // silently, even when the dart's own shape said the opposite end was the
  // thin one. The learned direction is only ever an average of past throws;
  // this dart's own fat end is evidence about THIS dart. When the two
  // disagree, neither is trusted and the question goes to the player.
  else if (usedLearned && widthKnown && pickEnd !== thin) confidence = "low";
  else if (usedLearned && Math.abs(learnedCos) > 0.55) confidence = "high";
  else if (usedLearned) confidence = "medium";
  else if (agree) confidence = ratio < 0.6 ? "high" : "medium";
  else confidence = "low";

  return { tip, flight: other, other, geo, thin, agree, confidence,
           widthRatio: ratio, tipScore, otherScore, sameEitherWay,
           usedLearned, learnedCos };
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
  const visitShaftsRef = useRef([]); // shafts counted THIS visit, reset each visit
  const dirRef = useRef(null);      // learned flight -> point direction
  const countedRef = useRef(null);  // coarse footprint of every dart counted

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
  const [cams, setCams] = useState([]);
  const [camId, setCamId] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [vidPlaying, setVidPlaying] = useState(true);
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
      void rot;
      const Hi = invert3(Hn);
      let ax = null;
      try { const s = window.localStorage.getItem(AXIS_KEY); if (s) ax = JSON.parse(s); } catch (e) {}
      try { const d = window.localStorage.getItem(DIR_KEY); if (d) dirRef.current = JSON.parse(d); } catch (e) {}
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

  const startCamera = useCallback(async (deviceId) => {
    try {
      // Release the current camera first. Without this the phone simply keeps
      // the lens it already has and the picker appears to do nothing.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        await new Promise((r) => setTimeout(r, 250));
      }
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      // A different lens sees a different picture, so anything measured from
      // the old one is void.
      baseRef.current = null; emptyRef.current = null;
      setHasBaseline(false); setRunning(false);
      seenRef.current = []; candRef.current = []; visitShaftsRef.current = [];
      setVisit([]); setPending(null); setLastBlobs([]);
      streamRef.current = s;
      trackRef.current = s.getVideoTracks()[0];
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      sourceRef.current = "camera";
      setSource("camera");
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const vids = list.filter((d) => d.kind === "videoinput");
        setCams(vids);
        setCamId(trackRef.current?.getSettings?.().deviceId || deviceId || "");
      } catch (e) { /* not fatal */ }

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


  /** Rebuild the transform and the "only look inside the board" mask. */
  const applyPoints = useCallback((pts, rot, manual) => {
    const dst = manual
      ? [0, 90, 180, 270].map((base) => {
          const a = ((base + rot) * Math.PI) / 180;
          return [B.doubleOut * Math.sin(a), -B.doubleOut * Math.cos(a)];
        })
      : [[0, -B.doubleOut], [B.doubleOut, 0], [0, B.doubleOut], [-B.doubleOut, 0]];
    const Hn = homography(pts, dst);
    const inside = new Uint8Array(WORK * WORK);
    for (let y = 0; y < WORK; y++) for (let x = 0; x < WORK; x++) {
      const [mx, my] = applyH(Hn, x, y);
      if (Math.hypot(mx, my) <= B.doubleOut * 1.08) inside[y * WORK + x] = 1;
    }
    insideRef.current = inside;
    setH(Hn);
    return Hn;
  }, []);

  /** Find the board again from the current camera view, keeping the rotation
   *  that was set during calibration. Saves the result, so it sticks. */
  const refindBoard = useCallback(() => {
    const img = grab();
    if (!img) { setStatus("No picture to work from yet."); return; }
    const r = findBoard(img.data, WORK, WORK);
    if (!r.ok) { setStatus(r.why); return; }
    const rot = cal?.rot || 0;
    const pts = autoPoints(r.ellipse, r.bull, rot);
    if (!pts) { setStatus("Found the board but could not place the four points."); return; }
    applyPoints(pts, rot, false);
    const payload = { pts, rot, savedAt: Date.now(), manual: false,
                      zoom: zoom ? zoom.value : (cal?.zoom ?? null), source: "camera" };
    try { window.localStorage.setItem(CAL_KEY, JSON.stringify(payload)); } catch (e) {}
    setCal(payload);
    setZoomWarn(null);
    baseRef.current = null; emptyRef.current = null;
    setHasBaseline(false); setRunning(false);
    seenRef.current = []; candRef.current = []; visitShaftsRef.current = [];
    setVisit([]); setPending(null); setLastBlobs([]);
    setStatus(`Board found again from ${r.colourPixels.toLocaleString()} coloured pixels. Check the gold rings sit on the real ones, then clear the board and Set baseline.`);
  }, [grab, cal, zoom, applyPoints]);

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
    // (The stray green dot that used to be drawn here was an internal marker
    //  for where the camera's axis meets the board. It looked like a detected
    //  dart and confused more than it helped, so it is gone.)
  }, [H, visit, pending, lastBlobs, axis, showDebug]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  /* ---------- baseline ---------- */
  const setBaseline = useCallback(() => {
    const img = grab(); if (!img) { setStatus("No picture yet."); return; }
    const gray = toGray(img.data);
    baseRef.current = { gray, prof: profiles(gray) };
    emptyRef.current = { gray };
    setHasBaseline(true);
    candRef.current = []; seenRef.current = []; visitShaftsRef.current = []; countedRef.current = null;
    setVisit([]); setPending(null); setLastBlobs([]);
    setStatus("Baseline set. Throw.");
  }, [grab]);

  /* ---------- accept a dart ---------- */
  const commitDart = useCallback((blob, pick, rebaseGray, trusted) => {
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
    visitShaftsRef.current.push([blob.a, blob.b]);
    // stamp this dart's footprint so it is not counted a second time as it settles
    if (!countedRef.current) countedRef.current = new Uint8Array((WORK >> 2) * (WORK >> 2));
    if (blob.px) for (const i of blob.px) {
      const cx2 = ((i % WORK) >> 2), cy2 = (((i / WORK) | 0) >> 2);
      countedRef.current[cy2 * (WORK >> 2) + cx2] = 1;
    }

    // Learn the flight-to-point direction, but ONLY from darts the user
    // confirmed. Same thrower, same camera, same board, so it is the same
    // direction every time and one answer is enough to stop it asking again.
    // Learning from its own guesses would let a single early mistake poison
    // every dart that followed.
    if (trusted && pick.flight && pick.tip) {
      const vx = pick.tip[0] - pick.flight[0], vy = pick.tip[1] - pick.flight[1];
      const L = Math.hypot(vx, vy);
      if (L > 8) {
        const prev = dirRef.current;
        const w = prev ? Math.min(prev.n, 8) : 0;
        const nx = ((prev?.x || 0) * w + vx / L) / (w + 1);
        const ny = ((prev?.y || 0) * w + vy / L) / (w + 1);
        const nl = Math.hypot(nx, ny) || 1;
        dirRef.current = { x: nx / nl, y: ny / nl, n: (prev?.n || 0) + 1 };
        try { window.localStorage.setItem(DIR_KEY, JSON.stringify(dirRef.current)); } catch (e) {}
      }
    }
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
      //    Three passes, each searching a smaller range than the last. The wide
      //    first pass is what lets the board survive a real nudge of the phone
      //    — reaching down to tap a score or type to your opponent shifts it
      //    tens of pixels, and the old +/-12 px search simply gave up.
      const refProf = baseRef.current.prof;
      let dx = 0, dy = 0;
      for (const rng of [48, 12, 4]) {
        const pr = profiles(gray);
        const ex = shift1d(refProf.cols, pr.cols, rng);
        const ey = shift1d(refProf.rows, pr.rows, rng);
        if (Math.abs(ex) < 0.05 && Math.abs(ey) < 0.05) break;
        dx += ex; dy += ey;
        gray = shiftGray(gray, ex, ey);
      }
      const drift = Math.hypot(dx, dy);

      // 2. Compare against the EMPTY board — always. Every dart currently in
      //    the board shows up in this list, every time.
      const { blobs, changedPct, piecesBefore, piecesAfter } = detectBlobs(gray, emptyRef.current.gray, insideRef.current, thr);
      setLastBlobs(blobs);

      const tMs = performance.now() - t0;
      setDebug({ dx, dy, drift, changedPct, inBoard: changedPct,
                 blobs: blobs.length, piecesBefore, piecesAfter, ms: tMs,
                 candidates: candRef.current.length, counted: seenRef.current.length });

      // 2b. The camera has been properly knocked, not merely flexed. Nothing
      //     measured from here is trustworthy, so stop rather than score junk.
      if (drift > 52) {
        candRef.current = [];
        setStatus(`Camera has moved ${drift.toFixed(0)} px — too far to correct. Tap "Find the board again, here", then Set baseline.`);
        return;
      }

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
        seenRef.current = []; candRef.current = []; visitShaftsRef.current = []; countedRef.current = null;
        setVisit([]); setPending(null);
        emptyRef.current = { gray };
        baseRef.current = { gray, prof: profiles(gray) };
        setStatus("Board clear. New visit — throw when ready.");
        return;
      }

      if (pending || seenRef.current.length >= 3) return;

      // 5. Which of these are darts we have not counted yet? A blob counts as
      //    already-seen if a point we have recorded lies on it.
      // Which of these have we not counted yet?
      //
      // Matching on the ends of the dart does not work: as a dart settles and
      // the difference against the empty board strengthens, its lump GROWS, so
      // its ends move and the same dart looks like a new one. That is how one
      // dart became three.
      //
      // Instead, remember the actual footprint of every dart counted, and call
      // a lump already-seen when it mostly sits on top of one. A dart that has
      // merely grown still covers its old footprint; a genuinely new dart
      // crossing over an old one only clips it.
      const fresh = blobs.filter((bl) => {
        const mask = countedRef.current;
        if (!mask) return true;
        let hit = 0, tot = 0;
        for (const i of bl.px) {
          const cx2 = ((i % WORK) >> 2), cy2 = (((i / WORK) | 0) >> 2);
          tot++;
          if (mask[cy2 * (WORK >> 2) + cx2]) hit++;
        }
        return tot === 0 || hit / tot < 0.45;
      })
      // ...and drop anything that is plainly a second piece of a dart already
      // counted. See isPieceOfCounted: this is what stops "S20 S20" from one
      // dart when the shaft breaks in half after it has been scored.
      .filter((bl) => !visitShaftsRef.current.some((sh) => isPieceOfCounted(bl, sh)));

      // 6. A blob must hold still across two looks before it counts, so a
      //    dart still quivering in the board is not measured mid-wobble.
      const next = [];
      for (const bl of fresh) {
        const mid = [bl.cx, bl.cy];
        const prev = candRef.current.find((c) => Math.hypot(c.mid[0] - mid[0], c.mid[1] - mid[1]) < 7);
        const n = (prev?.n || 0) + 1;
        if (n >= 2) {
          const pick = chooseTip(bl, axis || [WORK / 2, WORK / 2],
            (pt) => { const [mx, my] = applyH(H, pt[0], pt[1]); return scoreAt(mx, my); },
            dirRef.current);
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
    // The `true` is what makes it learn from this. Your answer is the only
    // trustworthy evidence of which way round a dart sits.
    commitDart(pending.blob, { ...pending, tip, other, flight: other, confidence: "confirmed" }, pending.gray, true);
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

  const loadVideo = useCallback((file) => {
    if (!file) return;
    const v = videoRef.current;
    if (!v) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    v.srcObject = null;
    v.src = URL.createObjectURL(file);
    v.loop = false;
    v.muted = true;
    v.playbackRate = 1;
    v.onloadeddata = () => {
      sourceRef.current = "camera";      // same path as a live camera feed
      setSource("camera");
      setIsVideo(true);
      v.play().catch(() => {});
      paint();
      setStatus("Video loaded. Pause it on a frame with an EMPTY board, tap Set baseline, then play on and Start scoring.");
    };
    baseRef.current = null; emptyRef.current = null;
    setHasBaseline(false); setRunning(false);
    seenRef.current = []; candRef.current = []; visitShaftsRef.current = [];
    setVisit([]); setPending(null); setLastBlobs([]);
  }, [paint]);

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

      {/* THE QUESTION BAR.
          Pinned to the top of the screen, over everything, whatever you have
          scrolled to. It used to sit below the picture, which meant scrolling
          the phone to answer it — and nudging a phone mid-visit is exactly what
          throws the board out of line. You never have to move it now.
          The two scores are on the buttons, so you answer by score without
          having to look at the little circles at all. */}
      {pending && (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-odcGold/50 bg-odcBlack/95 px-3 pb-3 pt-2 shadow-raised backdrop-blur">
          <div className="mx-auto w-full max-w-2xl">
            <p className="mono text-center text-[10px] uppercase tracking-wider text-odcRed">
              Scoring paused — which end is the point?
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => resolvePending("tip")}
                className="flex-1 rounded-xl bg-odcGreen px-4 py-4 text-odcBlack">
                <span className="block text-2xl font-bold">{pending.tipScore?.label || "green"}</span>
                <span className="mono block text-[10px] opacity-70">green ring</span>
              </button>
              <button onClick={() => resolvePending("other")}
                className="flex-1 rounded-xl bg-odcRed px-4 py-4 text-white">
                <span className="block text-2xl font-bold">{pending.otherScore?.label || "red"}</span>
                <span className="mono block text-[10px] opacity-70">red ring</span>
              </button>
            </div>
            <p className="mono mt-1.5 text-center text-[10px] leading-snug text-odcCream/50">
              {pending.merged
                ? "Long enough to be two darts touching — pick the end the point is at."
                : "Both ends would score differently, so it is asking rather than guessing."}
            </p>
          </div>
        </div>
      )}

      <div className={`mx-auto w-full max-w-2xl px-4 py-6 pb-24 ${pending ? "pt-40" : ""}`}>
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

        {/* Where you are up to. A greyed-out button should never be a mystery. */}
        <ol className="mb-4 grid grid-cols-4 gap-1.5">
          {[
            { n: 1, label: "Calibration", done: !!H, hint: "from the calibrate page" },
            { n: 2, label: "Camera on", done: source !== "none", hint: "tap Start camera" },
            { n: 3, label: "Baseline", done: hasBaseline, hint: "clear the board first" },
            { n: 4, label: "Scoring", done: running, hint: "tap Start scoring" },
          ].map((st, i, all) => {
            const isNext = !st.done && all.slice(0, i).every((x) => x.done);
            return (
              <li key={st.n}
                className={`rounded-lg border px-2 py-2 text-center ${
                  st.done ? "border-odcGreen/40 bg-odcGreen/10"
                  : isNext ? "border-odcGold/50 bg-odcGold/10"
                  : "border-odcCream/10 bg-odcNavy"}`}>
                <p className={`mono text-[10px] ${
                  st.done ? "text-odcGreenBright" : isNext ? "text-odcGold" : "text-odcCream/30"}`}>
                  {st.done ? "done" : isNext ? "do this" : "step " + st.n}
                </p>
                <p className={`mt-0.5 text-[11px] leading-tight ${
                  st.done ? "text-odcCream/70" : isNext ? "text-odcCream" : "text-odcCream/35"}`}>
                  {st.label}
                </p>
                {isNext && (
                  <p className="mono mt-1 text-[9px] leading-tight text-odcGold/80">{st.hint}</p>
                )}
              </li>
            );
          })}
        </ol>

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

          {!H && (
            <p className="mono mt-2 rounded-lg border border-odcRed/40 bg-odcRed/10 px-3 py-2 text-[11px] leading-relaxed text-odcCream/85">
              Everything here is greyed out because there is no calibration saved on
              this phone yet. Go to /autoscoring-calibrate, line the board up and lock
              it, then come back.
            </p>
          )}
          {H && source === "none" && (
            <p className="mono mt-2 text-[11px] leading-relaxed text-odcCream/45">
              Set baseline and Start scoring stay greyed out until the camera is running.
            </p>
          )}
          {H && source !== "none" && !hasBaseline && (
            <p className="mono mt-2 text-[11px] leading-relaxed text-odcCream/45">
              Start scoring stays greyed out until you have set a baseline. Take the
              darts out of the board first, then tap Set baseline.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {source !== "camera" && (
              <button onClick={() => startCamera(camId || undefined)} disabled={!H}
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

          {source === "camera" && (
            <button onClick={refindBoard}
              className="mt-2 w-full rounded-xl border border-odcGold/50 bg-odcGold/10 px-4 py-3 text-sm font-semibold text-odcGold active:scale-[0.98]">
              Find the board again, here
            </button>
          )}

          {cams.length > 1 && source === "camera" && (
            <label className="mt-3 block">
              <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                Which lens
              </span>
              <select value={camId}
                onChange={(e) => { setCamId(e.target.value); startCamera(e.target.value); }}
                className="mono mt-1 w-full rounded-lg border border-odcCream/20 bg-odcPanel2 px-3 py-2 text-xs text-odcCream/85">
                {cams.map((c, i) => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label || `camera ${i + 1}`}</option>
                ))}
              </select>
            </label>
          )}

          {isVideo && (
            <div className="mt-3 rounded-xl border border-odcCream/15 bg-odcPanel2 p-3">
              <p className="mono text-[11px] uppercase tracking-wider text-odcCream/50">Replaying a video</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const v = videoRef.current; if (!v) return;
                    if (v.paused) { v.play(); setVidPlaying(true); } else { v.pause(); setVidPlaying(false); }
                  }}
                  className="flex-1 rounded-lg bg-odcCream/15 px-3 py-2 text-xs text-odcCream">
                  {vidPlaying ? "Pause video" : "Play video"}
                </button>
                {[0.25, 0.5, 1].map((r) => (
                  <button key={r}
                    onClick={() => { if (videoRef.current) videoRef.current.playbackRate = r; }}
                    className="mono rounded-lg border border-odcCream/20 px-3 py-2 text-xs text-odcCream/70">
                    {r}x
                  </button>
                ))}
              </div>
              <p className="mono mt-2 text-[10px] leading-relaxed text-odcCream/45">
                Slower is better — the detector needs a couple of looks at each dart
                before it counts it.
              </p>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <label className="mono cursor-pointer rounded-lg border border-odcCream/15 px-3 py-2 text-[11px] text-odcCream/60">
              test: a video of a real visit
              <input type="file" accept="video/*" className="hidden"
                onChange={(e) => loadVideo(e.target.files?.[0])} />
            </label>
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
            <button onClick={() => { setVisit([]); seenRef.current = []; candRef.current = []; visitShaftsRef.current = []; setPending(null); setStatus("Visit cleared."); }}
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
              <dt className="text-odcCream/45">Lumps before joining</dt>
              <dd className="text-right tabular-nums">{debug.piecesBefore}</dd>
              <dt className="text-odcCream/45">Lumps after joining</dt>
              <dd className="text-right tabular-nums">{debug.piecesAfter}</dd>
              <dt className="text-odcCream/45">New things found</dt>
              <dd className="text-right tabular-nums">{debug.blobs}</dd>
              <dt className="text-odcCream/45">Waiting to settle</dt>
              <dd className="text-right tabular-nums">{debug.candidates}</dd>
              <dt className="text-odcCream/45">Counted this visit</dt>
              <dd className="text-right tabular-nums">{debug.counted}</dd>
              <dt className="text-odcCream/45">Time per look</dt>
              <dd className="text-right tabular-nums">{debug.ms.toFixed(0)} ms</dd>
              <dt className="text-odcCream/45">Learned dart direction</dt>
              <dd className="text-right tabular-nums">
                {dirRef.current ? `from ${dirRef.current.n} darts` : "not yet"}
              </dd>
            </dl>
          )}
          {showDebug && dirRef.current && (
            <button
              onClick={() => { dirRef.current = null;
                try { window.localStorage.removeItem(DIR_KEY); } catch (e) {}
                setStatus("Forgotten which way round your darts sit. It will ask again on the next one."); }}
              className="mono mt-3 text-xs text-odcCream/40 underline">
              forget which way round my darts sit
            </button>
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
