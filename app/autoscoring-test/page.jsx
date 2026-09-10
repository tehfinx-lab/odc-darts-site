// app/autoscoring-test/page.jsx
//
// ODC AUTOSCORING — STAGE 2: camera test bench.
//
// What this page does:
//   - opens the phone's REAR camera
//   - shows it in a square 1:1 window, which is exactly what gets captured
//   - reports the real resolution and frame rate
//   - lets you capture square photos and save/share them off the phone
//   - walks you through a shot list so we end up with a proper test set
//
// What this page deliberately does NOT do:
//   - no AI, no model, no ONNX, nothing downloaded
//   - it does not import, read or touch the manual scorer (odc-play.html)
//   - it does not talk to any ODC API, the Google Sheet or the Discord bot
//
// It is a completely self-contained page. Deleting this file removes it
// entirely with no side effects anywhere else in the site — it is one file,
// with no other file anywhere depending on it.
//
// The <meta name="robots" content="noindex"> tag near the bottom keeps this
// workshop page out of Google and off the ODC site map. React hoists that tag
// into the page <head> automatically, so it works from inside this component.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
   The shot list.
   These are the photos we need to judge every later stage against.
   The camera MUST NOT MOVE between them — that is the whole point.
   ------------------------------------------------------------------ */
const SHOT_LIST = [
  { id: "a1", group: "Empty board", text: "Empty board — your normal playing light" },
  { id: "a2", group: "Empty board", text: "Empty board — brighter, all lights on" },
  { id: "a3", group: "Empty board", text: "Empty board — dimmer, evening light" },
  { id: "b1", group: "One dart", text: "One dart in treble 20" },
  { id: "b2", group: "One dart", text: "One dart in double 20" },
  { id: "b3", group: "One dart", text: "One dart in the bull" },
  { id: "b4", group: "One dart", text: "One dart in a thin single, e.g. single 1" },
  { id: "c1", group: "Two darts", text: "Two darts in the 20 bed, side by side" },
  { id: "c2", group: "Two darts", text: "Two darts crossing / overlapping each other" },
  { id: "d1", group: "Three darts", text: "Three darts tight in treble 20" },
  { id: "d2", group: "Three darts", text: "Three darts spread around the board" },
  { id: "d3", group: "Three darts", text: "Three darts in trebles of different numbers" },
  { id: "e1", group: "Awkward angles", text: "A dart pointing sharply upwards" },
  { id: "e2", group: "Awkward angles", text: "A dart pointing sharply downwards" },
  { id: "e3", group: "Awkward angles", text: "A dart in the wire, only just holding" },
  { id: "f1", group: "Real life", text: "Your hand reaching in to pull the darts out" },
  { id: "f2", group: "Real life", text: "Someone standing next to the board" },
  { id: "f3", group: "Real life", text: "Empty board again — proves the camera never moved" },
];

const TICKS_KEY = "odc:autoscore:ticks:v1";

function twoDigit(n) {
  return String(n).padStart(2, "0");
}

function stamp(d) {
  return (
    d.getFullYear() +
    twoDigit(d.getMonth() + 1) +
    twoDigit(d.getDate()) +
    "-" +
    twoDigit(d.getHours()) +
    twoDigit(d.getMinutes()) +
    twoDigit(d.getSeconds())
  );
}

export default function AutoscoringTestPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | starting | live | error
  const [problem, setProblem] = useState(null); // { title, detail, fix }
  const [info, setInfo] = useState(null);
  const [fps, setFps] = useState(0);
  const [shots, setShots] = useState([]);
  const [guide, setGuide] = useState(true);
  const [zoom, setZoom] = useState(null); // { min, max, step, value }
  const [torch, setTorch] = useState(null); // null = unsupported, else bool
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [ticks, setTicks] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  /* ---------- checklist ticks, remembered on this phone ---------- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TICKS_KEY);
      if (raw) setTicks(JSON.parse(raw));
    } catch (e) {
      /* private browsing, or storage blocked — no harm done */
    }
  }, []);

  const toggleTick = useCallback((id) => {
    setTicks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(TICKS_KEY, JSON.stringify(next));
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* ---------- camera ---------- */
  const stopCamera = useCallback(() => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setFps(0);
    setInfo(null);
    setZoom(null);
    setTorch(null);
  }, []);

  const startCamera = useCallback(
    async (deviceId) => {
      setProblem(null);
      setStatus("starting");

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setStatus("error");
        setProblem({
          title: "This page is not on a secure connection",
          detail:
            "Phone browsers only hand over the camera on an https:// address. This page is currently not on one.",
          fix: "Open the page using its https:// Vercel address rather than an IP address or http://.",
        });
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("error");
        setProblem({
          title: "This browser cannot open a camera",
          detail: "The browser did not offer the camera interface at all.",
          fix: "Try Safari on iPhone or Chrome on Android. In-app browsers inside Facebook, Instagram or Discord often block cameras — open the link in the real browser instead.",
        });
        return;
      }

      // Stop anything already running before asking for a new stream.
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

      const constraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        setStatus("error");
        const name = err && err.name ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setProblem({
            title: "Camera permission was refused",
            detail: "The browser asked, and the answer was no — or it was blocked from a previous visit.",
            fix: "iPhone: tap the 'aA' or lock icon in the address bar, then Website Settings, then set Camera to Allow, and reload. Android: tap the lock icon, then Permissions, then allow Camera, and reload.",
          });
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setProblem({
            title: "No suitable camera was found",
            detail: "The phone reported no camera matching what we asked for.",
            fix: "Close other apps that might be holding the camera, then reload and try again.",
          });
        } else if (name === "NotReadableError") {
          setProblem({
            title: "The camera is busy",
            detail: "Another app is already using it.",
            fix: "Close any other camera, video call or streaming app, then reload this page.",
          });
        } else {
          setProblem({
            title: "The camera would not start",
            detail: String((err && err.message) || err),
            fix: "Reload the page and try again. If it keeps happening, tell me the message above word for word.",
          });
        }
        return;
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        try {
          await v.play();
        } catch (e) {
          /* some browsers resolve this late; the stream is still attached */
        }
      }

      const settings = track.getSettings ? track.getSettings() : {};
      setInfo({
        width: settings.width || (v && v.videoWidth) || 0,
        height: settings.height || (v && v.videoHeight) || 0,
        declaredFps: settings.frameRate ? Math.round(settings.frameRate) : null,
        facing: settings.facingMode || "unknown",
        label: track.label || "camera",
      });

      // Optional extras, only if this phone supports them.
      let caps = {};
      try {
        caps = track.getCapabilities ? track.getCapabilities() : {};
      } catch (e) {
        caps = {};
      }
      if (caps.zoom) {
        setZoom({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
          value: (settings.zoom ?? caps.zoom.min) || caps.zoom.min,
        });
      } else {
        setZoom(null);
      }
      setTorch(caps.torch ? false : null);

      // Now that permission is granted, camera labels become readable.
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const vids = list.filter((d) => d.kind === "videoinput");
        setCameras(vids);
        setCameraId(settings.deviceId || (vids[0] && vids[0].deviceId) || "");
      } catch (e) {
        /* not essential */
      }

      setStatus("live");
    },
    []
  );

  // Always release the camera when leaving the page.
  useEffect(() => stopCamera, [stopCamera]);

  /* ---------- true frame rate ---------- */
  useEffect(() => {
    if (status !== "live") return;
    const v = videoRef.current;
    if (!v) return;

    let frames = 0;
    let last = performance.now();
    let handle = null;
    let dead = false;
    const useRvfc = typeof v.requestVideoFrameCallback === "function";

    const tick = () => {
      if (dead) return;
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      handle = useRvfc ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    tick();

    return () => {
      dead = true;
      if (handle == null) return;
      if (useRvfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [status]);

  /* ---------- keep the screen awake while lining the camera up ---------- */
  useEffect(() => {
    if (status !== "live") return;
    let lock = null;
    let dead = false;
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (dead) l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    }
    return () => {
      dead = true;
      if (lock) lock.release().catch(() => {});
    };
  }, [status]);

  /* ---------- capture ---------- */
  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    // Exactly the centre square of the sensor — the same square shown on screen.
    const side = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - side) / 2;
    const sy = (v.videoHeight - side) / 2;

    const c = document.createElement("canvas");
    c.width = side;
    c.height = side;
    c.getContext("2d").drawImage(v, sx, sy, side, side, 0, 0, side, side);

    c.toBlob(
      (blob) => {
        if (!blob) return;
        const now = new Date();
        setShots((prev) => {
          const name = `odc-board-${stamp(now)}-${twoDigit(prev.length + 1)}.jpg`;
          return [
            { id: `${now.getTime()}`, blob, url: URL.createObjectURL(blob), name, side, note },
            ...prev,
          ];
        });
        setNote("");
        if (navigator.vibrate) navigator.vibrate(25);
      },
      "image/jpeg",
      0.92
    );
  }, [note]);

  const removeShot = useCallback((id) => {
    setShots((prev) => {
      const hit = prev.find((s) => s.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const saveShots = useCallback(
    async (list) => {
      if (!list.length) return;
      setBusy(true);
      try {
        const files = list.map((s) => new File([s.blob], s.name, { type: "image/jpeg" }));
        if (navigator.canShare && navigator.canShare({ files })) {
          try {
            await navigator.share({ files, title: "ODC board photos" });
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return; // user changed their mind
          }
        }
        // Fallback: download one at a time.
        for (const s of list) {
          const a = document.createElement("a");
          a.href = s.url;
          a.download = s.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          await new Promise((r) => setTimeout(r, 250));
        }
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const applyZoom = useCallback((value) => {
    setZoom((z) => (z ? { ...z, value } : z));
    const t = trackRef.current;
    if (t && t.applyConstraints) t.applyConstraints({ advanced: [{ zoom: value }] }).catch(() => {});
  }, []);

  const toggleTorch = useCallback(() => {
    const t = trackRef.current;
    if (!t || !t.applyConstraints) return;
    setTorch((on) => {
      const next = !on;
      t.applyConstraints({ advanced: [{ torch: next }] }).catch(() => {});
      return next;
    });
  }, []);

  const done = SHOT_LIST.filter((s) => ticks[s.id]).length;
  const groups = [...new Set(SHOT_LIST.map((s) => s.group))];

  return (
    <main className="min-h-screen bg-odcBlack text-odcCream">
      {/*
        Keeps this workshop page out of Google. React hoists this tag into the
        page <head>, where it sits alongside the site-wide "index, follow" tag
        from the root layout. Search engines resolve conflicting robots tags by
        taking the MOST restrictive one, so noindex wins.

        If this page ever moves to the live site for real, replace this with a
        proper app/autoscoring-test/layout.jsx exporting
        `metadata = { robots: { index: false } }`, which overrides cleanly
        instead of relying on that precedence rule.
      */}
      <meta name="robots" content="noindex, nofollow" />

      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
        {/* ---------------- header ---------------- */}
        <header className="mb-5">
          <p className="mono text-[11px] uppercase tracking-[0.2em] text-odcGold">
            Autoscoring · Stage 2
          </p>
          <h1 className="mt-1 text-3xl leading-none">Camera test bench</h1>
          <p className="mt-3 text-sm leading-relaxed text-odcCream/70">
            No AI here yet. This page only proves the camera works, shows you the exact
            square the scorer will see, and helps you collect the test photos everything
            else gets measured against.
          </p>
          <p className="mt-2 rounded-lg border border-odcGold/25 bg-odcGold/5 px-3 py-2 text-xs leading-relaxed text-odcGold">
            The live scorer is untouched. Nothing on this page can affect a real match.
          </p>
        </header>

        {/* ---------------- camera window ---------------- */}
        <section className="rounded-2xl border border-odcCream/10 bg-odcNavy p-3 shadow-raised">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />

            {guide && status === "live" && (
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="38" fill="none" stroke="#D9B45B" strokeWidth="0.5" opacity="0.75" />
                <circle cx="50" cy="50" r="14" fill="none" stroke="#D9B45B" strokeWidth="0.35" opacity="0.5" />
                <line x1="50" y1="4" x2="50" y2="16" stroke="#E63329" strokeWidth="0.6" />
                <line x1="50" y1="84" x2="50" y2="96" stroke="#E63329" strokeWidth="0.6" />
                <line x1="4" y1="50" x2="16" y2="50" stroke="#E63329" strokeWidth="0.6" />
                <line x1="84" y1="50" x2="96" y2="50" stroke="#E63329" strokeWidth="0.6" />
              </svg>
            )}

            {status !== "live" && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                {status === "starting" ? (
                  <p className="mono text-sm text-odcCream/70">Asking for the camera…</p>
                ) : status === "error" ? (
                  <p className="mono text-sm text-odcRed">Camera not running</p>
                ) : (
                  <p className="mono text-sm text-odcCream/50">
                    Camera off. Tap Start below.
                  </p>
                )}
              </div>
            )}

            {status === "live" && (
              <div className="mono pointer-events-none absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11px] tabular-nums text-odcGreenBright">
                {fps} fps
              </div>
            )}
          </div>

          <p className="mono mt-2 text-center text-[11px] text-odcCream/45">
            This square is exactly what gets captured and scored. Nothing outside it counts.
          </p>

          {/* ---------------- controls ---------------- */}
          <div className="mt-3 flex flex-wrap gap-2">
            {status !== "live" ? (
              <button
                onClick={() => startCamera(cameraId || undefined)}
                disabled={status === "starting"}
                className="flex-1 rounded-xl bg-odcGreen px-4 py-3 text-sm font-semibold text-odcBlack transition active:scale-[0.98] disabled:opacity-50"
              >
                {status === "starting" ? "Starting…" : "Start camera"}
              </button>
            ) : (
              <>
                <button
                  onClick={capture}
                  className="flex-[2] rounded-xl bg-odcRed px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                >
                  Capture photo
                </button>
                <button
                  onClick={stopCamera}
                  className="rounded-xl border border-odcCream/20 px-4 py-3 text-sm text-odcCream/80 transition active:scale-[0.98]"
                >
                  Stop
                </button>
              </>
            )}
            <button
              onClick={() => setGuide((g) => !g)}
              className="rounded-xl border border-odcCream/20 px-4 py-3 text-sm text-odcCream/80 transition active:scale-[0.98]"
            >
              {guide ? "Hide guide" : "Show guide"}
            </button>
          </div>

          {status === "live" && (
            <>
              <label className="mt-3 block">
                <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                  Label the next photo (optional)
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. three darts in T20"
                  className="mt-1 w-full rounded-lg border border-odcCream/15 bg-odcPanel2 px-3 py-2 text-sm text-odcCream placeholder:text-odcCream/30 focus:border-odcGold focus:outline-none"
                />
              </label>

              {zoom && (
                <label className="mt-3 block">
                  <span className="mono text-[11px] uppercase tracking-wider text-odcCream/50">
                    Zoom · {Number(zoom.value).toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min={zoom.min}
                    max={zoom.max}
                    step={zoom.step}
                    value={zoom.value}
                    onChange={(e) => applyZoom(Number(e.target.value))}
                    className="mt-1 w-full accent-odcGold"
                  />
                </label>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {torch !== null && (
                  <button
                    onClick={toggleTorch}
                    className="rounded-lg border border-odcCream/20 px-3 py-2 text-xs text-odcCream/80"
                  >
                    {torch ? "Torch off" : "Torch on"}
                  </button>
                )}
                {cameras.length > 1 && (
                  <select
                    value={cameraId}
                    onChange={(e) => {
                      setCameraId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="rounded-lg border border-odcCream/20 bg-odcPanel2 px-3 py-2 text-xs text-odcCream/80"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </section>

        {/* ---------------- problems ---------------- */}
        {problem && (
          <section className="mt-4 rounded-2xl border border-odcRed/40 bg-odcRed/10 p-4">
            <h2 className="text-lg text-odcRed">{problem.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-odcCream/80">{problem.detail}</p>
            <p className="mt-2 text-sm leading-relaxed text-odcCream/80">
              <span className="font-semibold">What to do: </span>
              {problem.fix}
            </p>
          </section>
        )}

        {/* ---------------- diagnostics ---------------- */}
        {info && (
          <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
            <h2 className="text-lg">What the camera is actually doing</h2>
            <dl className="mono mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-odcCream/45">Sensor feed</dt>
              <dd className="tabular-nums text-right">{info.width} × {info.height}</dd>

              <dt className="text-odcCream/45">Square captured</dt>
              <dd className="tabular-nums text-right">
                {Math.min(info.width, info.height)} × {Math.min(info.width, info.height)}
              </dd>

              <dt className="text-odcCream/45">Measured frame rate</dt>
              <dd className="tabular-nums text-right">{fps} fps</dd>

              <dt className="text-odcCream/45">Claimed frame rate</dt>
              <dd className="tabular-nums text-right">{info.declaredFps ?? "—"}</dd>

              <dt className="text-odcCream/45">Which camera</dt>
              <dd className="text-right">{info.facing}</dd>

              <dt className="col-span-2 truncate text-odcCream/45">{info.label}</dt>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-odcCream/60">
              Anything at or above 15 fps is plenty — a dart stays in the board, so we are
              not chasing a fast-moving object. If the square is smaller than about 720 × 720,
              tell me, because that would limit how precisely we can place a dart tip.
            </p>
          </section>
        )}

        {/* ---------------- captured photos ---------------- */}
        <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg">Captured ({shots.length})</h2>
            {shots.length > 0 && (
              <button
                onClick={() => saveShots(shots)}
                disabled={busy}
                className="rounded-lg bg-odcGold px-3 py-2 text-xs font-semibold text-odcBlack disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save / share all"}
              </button>
            )}
          </div>

          {shots.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-odcCream/55">
              Nothing captured yet. Photos live only in this browser tab until you save
              them — if you close the tab, they are gone. Save them as you go.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed text-odcCream/55">
                &ldquo;Save / share all&rdquo; opens your phone&rsquo;s normal share sheet, so you can
                send them to yourself however you like.
              </p>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {shots.map((s) => (
                  <li key={s.id} className="overflow-hidden rounded-lg border border-odcCream/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt={s.note || s.name} className="aspect-square w-full object-cover" />
                    {s.note && (
                      <p className="truncate px-1.5 pt-1 text-[10px] text-odcCream/70">{s.note}</p>
                    )}
                    <div className="flex">
                      <button
                        onClick={() => saveShots([s])}
                        className="mono flex-1 px-1 py-1.5 text-[10px] text-odcGreenBright"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => removeShot(s.id)}
                        className="mono flex-1 px-1 py-1.5 text-[10px] text-odcRed"
                      >
                        Bin
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------------- shot list ---------------- */}
        <section className="mt-4 rounded-2xl border border-odcCream/10 bg-odcNavy p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg">Shot list</h2>
            <span className="mono text-xs tabular-nums text-odcGold">
              {done} / {SHOT_LIST.length}
            </span>
          </div>

          <p className="mt-2 rounded-lg border border-odcRed/30 bg-odcRed/10 px-3 py-2 text-xs leading-relaxed text-odcCream/85">
            <span className="font-semibold text-odcRed">Do not move the camera</span> at any
            point between the first photo and the last. If it shifts even slightly, the set
            is worthless and we start again. Mount it, then leave it alone.
          </p>

          {groups.map((g) => (
            <div key={g} className="mt-4">
              <p className="mono text-[11px] uppercase tracking-wider text-odcCream/45">{g}</p>
              <ul className="mt-1.5 space-y-1.5">
                {SHOT_LIST.filter((s) => s.group === g).map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => toggleTick(s.id)}
                      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        ticks[s.id]
                          ? "border-odcGreen/40 bg-odcGreen/10 text-odcCream/55 line-through"
                          : "border-odcCream/10 bg-odcPanel2 text-odcCream/90"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded border text-[10px] ${
                          ticks[s.id]
                            ? "border-odcGreen bg-odcGreen text-odcBlack"
                            : "border-odcCream/30"
                        }`}
                        aria-hidden="true"
                      >
                        {ticks[s.id] ? "✓" : ""}
                      </span>
                      <span className="leading-snug">{s.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button
            onClick={() => {
              setTicks({});
              try {
                window.localStorage.removeItem(TICKS_KEY);
              } catch (e) {
                /* ignore */
              }
            }}
            className="mono mt-4 text-xs text-odcCream/40 underline"
          >
            Clear all ticks
          </button>
        </section>

        <p className="mono mt-6 text-center text-[11px] leading-relaxed text-odcCream/30">
          ODC autoscoring · test page · not indexed · no model, no AI, no league data
        </p>
      </div>
    </main>
  );
}
