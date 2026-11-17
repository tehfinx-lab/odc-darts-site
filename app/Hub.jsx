"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, LogOut, MessageCircle, Save, Trash2, UserCog } from "lucide-react";

/* ---------- session hook: who's signed in ---------- */
export function useMe() {
  const [me, setMe] = useState({ loading: true, signedIn: false });
  const load = (player) =>
    fetch(`/api/me${player ? `?player=${encodeURIComponent(player)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe({ loading: false, ...j }))
      .catch(() => setMe({ loading: false, signedIn: false }));
  useEffect(() => { load(); }, []);
  return [me, load];
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ordinal = (n) => {
  const v = Number(n) || 0;
  const t = v % 100;
  return `${v}${t >= 11 && t <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th"}`;
};

export function SignInButton({ me, onOpenHub, compact = false }) {
  if (me.loading) return <span className="h-10 w-10" aria-hidden="true" />;
  if (me.signedIn) {
    const pic = me.picture || me.discord?.avatarUrl;
    return (
      <button
        onClick={onOpenHub}
        className={`flex items-center gap-2 rounded-md border border-odcCream/15 p-1 text-xs font-bold transition hover:border-odcAcc ${compact ? "" : "pr-3"}`}
        title="My hub"
      >
        <img src={pic} alt="" className="h-8 w-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = me.discord?.avatarUrl || "/odc-logo.png"; }} />
        {!compact && <span className="max-w-[110px] truncate">{me.player || me.discord?.name}</span>}
      </button>
    );
  }
  return (
    <a
      href="/api/auth/signin"
      className="rounded-md border border-odcCream/25 px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-odcCream transition hover:border-odcAcc"
    >
      Sign in
    </a>
  );
}

const SIGNIN_ERRORS = {
  cancelled: "Sign-in was cancelled.",
  expired: "That sign-in link expired. Try again.",
  discord: "Discord didn't let us sign you in. Try again.",
  error: "Something went wrong signing you in. Try again.",
  "not-set-up": "Sign-in isn't switched on yet. An admin needs to finish the setup.",
};

const FIELDS = [
  { k: "nickname", label: "Darts nickname", ph: "The Flying Scotsman" },
  { k: "nationality", label: "Nationality", ph: "Scottish" },
  { k: "handedness", label: "Throwing hand", ph: "Right", options: ["", "Right", "Left"] },
  { k: "darts", label: "Darts", ph: "Target Power 9Five 23g" },
  { k: "weight", label: "Weight", ph: "23g" },
  { k: "favFinish", label: "Favourite finish", ph: "170" },
  { k: "favDouble", label: "Favourite double", ph: "D16" },
  { k: "favPro", label: "Favourite pro", ph: "Luke Littler" },
  { k: "walkOn", label: "Walk-on song", ph: "Song – Artist" },
];

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-odcCream/10 bg-odcNavy p-5 md:p-6 ${className}`}>
      {title && <h3 className="mb-4 text-xl">{title}</h3>}
      {children}
    </section>
  );
}

function Form({ me, onSaved }) {
  const [vals, setVals] = useState(me.profile || {});
  const [state, setState] = useState({ busy: false, msg: "", ok: false });
  useEffect(() => { setVals(me.profile || {}); setState({ busy: false, msg: "", ok: false }); }, [me.target, me.profile]);

  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, msg: "", ok: false });
    const res = await fetch("/api/me/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: vals, player: me.admin ? me.target : undefined }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState({ busy: false, msg: "Saved. The bot's /profile card uses this too.", ok: true });
      onSaved?.();
    } else setState({ busy: false, msg: j.error || "Couldn't save. Try again.", ok: false });
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <label key={f.k} className={f.k === "walkOn" || f.k === "darts" ? "sm:col-span-2" : ""}>
          <span className="mb-1.5 block text-sm font-semibold text-odcCream/70">{f.label}</span>
          {f.options ? (
            <select
              value={vals[f.k] || ""}
              onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })}
              className="w-full rounded-lg border border-odcCream/15 bg-odcBlack px-4 py-3 text-odcCream outline-none focus:border-odcAcc"
            >
              {f.options.map((o) => <option key={o} value={o}>{o || "Not set"}</option>)}
            </select>
          ) : (
            <input
              value={vals[f.k] || ""}
              onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })}
              placeholder={f.ph}
              maxLength={f.k === "walkOn" ? 80 : 60}
              className="w-full rounded-lg border border-odcCream/15 bg-odcBlack px-4 py-3 text-odcCream outline-none placeholder:text-odcCream/25 focus:border-odcAcc"
            />
          )}
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          disabled={state.busy}
          className="inline-flex items-center gap-2 rounded-md bg-odcAcc px-5 py-3 text-sm font-bold text-odcOnAcc transition hover:bg-odcAccDeep disabled:opacity-60"
        >
          <Save size={16} /> {state.busy ? "Saving…" : "Save profile"}
        </button>
        {state.msg && (
          <p className={`text-sm ${state.ok ? "text-odcGreenBright" : "text-odcLoss"}`} role="status">{state.msg}</p>
        )}
      </div>
    </form>
  );
}

function Picture({ me, onChanged }) {
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, msg: "" });
  const pic = me.picture || me.discord?.avatarUrl;
  const editingSelf = !me.admin || norm(me.target) === norm(me.player);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setState({ busy: false, msg: "That picture is over 4MB." });
    setState({ busy: true, msg: "" });
    const fd = new FormData();
    fd.append("file", file);
    if (me.admin) fd.append("player", me.target);
    const res = await fetch("/api/me/picture", { method: "POST", body: fd }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setState({ busy: false, msg: res?.ok ? "Picture updated." : j.error || "Upload failed." });
    if (res?.ok) onChanged?.();
  };

  const remove = async () => {
    setState({ busy: true, msg: "" });
    const q = me.admin ? `?player=${encodeURIComponent(me.target)}` : "";
    const res = await fetch(`/api/me/picture${q}`, { method: "DELETE" }).catch(() => null);
    setState({ busy: false, msg: res?.ok ? "Back to your Discord picture." : "Couldn't remove it." });
    if (res?.ok) onChanged?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <img
        src={editingSelf ? pic : me.picture || "/odc-logo.png"}
        onError={(e) => { e.currentTarget.src = editingSelf ? me.discord?.avatarUrl : "/odc-logo.png"; }}
        alt=""
        className="h-24 w-24 rounded-full border-[3px] border-odcAcc object-cover"
      />
      <div className="space-y-2">
        {me.canUpload ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => input.current?.click()}
                disabled={state.busy}
                className="inline-flex items-center gap-2 rounded-md border border-odcCream/25 px-4 py-2.5 text-sm font-bold transition hover:border-odcAcc disabled:opacity-60"
              >
                <Camera size={16} /> {state.busy ? "Uploading…" : "Upload a picture"}
              </button>
              {me.picture && (
                <button
                  onClick={remove}
                  disabled={state.busy}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-odcCream/60 transition hover:text-odcCream"
                >
                  <Trash2 size={15} /> Use Discord picture
                </button>
              )}
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <p className="text-xs text-odcCream/45">JPG, PNG or WebP, up to 4MB. Square pictures look best.</p>
          </>
        ) : (
          <p className="max-w-xs text-sm text-odcCream/55">Your Discord picture is used. Change it in Discord and it updates here next time you sign in.</p>
        )}
        {state.msg && <p className="text-sm text-odcCream/70" role="status">{state.msg}</p>}
      </div>
    </div>
  );
}

function Form5({ form }) {
  const res = String(form || "").split(/\s+/).filter(Boolean).slice(-5);
  const col = { W: "bg-odcCream text-odcBlack", L: "bg-odcLoss text-white", D: "bg-odcCream/15 text-odcCream" };
  return (
    <span className="flex gap-1.5">
      {res.map((r, i) => (
        <span key={i} className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${col[r] || col.D}`}>{r}</span>
      ))}
    </span>
  );
}

export default function Hub({ data, me, reload }) {
  const [signinError, setSigninError] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("signin");
    if (p) {
      setSigninError(SIGNIN_ERRORS[p] || SIGNIN_ERRORS.error);
      window.history.replaceState(null, "", "/#hub");
    }
  }, []);

  const name = me.player;
  const stats = useMemo(() => {
    if (!name) return null;
    const key = norm(name);
    const p = (data.players || []).find((x) => norm(x.name) === key);
    const master = data.masterStats?.[String(name).toLowerCase()];
    const division = p?.division || master?.division || "";
    const table = data.tables?.[division] || [];
    const row = table.find((r) => norm(r.name) === key);
    const all = (data.allResults?.length ? data.allResults : data.results) || [];
    const results = all.filter((r) => norm(r.home) === key || norm(r.away) === key);
    const fixtures = Object.values(data.fixtures || {}).flat().filter((f) => norm(f.home) === key || norm(f.away) === key);
    return { p, master, division, table, row, results, fixtures };
  }, [data, name]);

  /* ---------- signed out ---------- */
  if (me.loading) {
    return <section className="mx-auto max-w-5xl px-4 py-20 text-odcCream/50">Loading your hub…</section>;
  }
  if (!me.signedIn) {
    return (
      <section className="relative overflow-hidden">
        <div className="odc-watermark -right-40 -top-24 h-[620px] w-[620px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-20">
        <div className="relative max-w-xl">
          <h1 className="text-[clamp(56px,12vw,104px)] leading-[0.9]">My hub</h1>
          <p className="mt-5 text-lg leading-8 text-odcCream/70">
            Sign in with the Discord account you use in the ODC server to see your fixtures, results and stats in one place,
            and edit your player profile.
          </p>
          {signinError && <p className="mt-5 rounded-lg border border-odcLoss/40 bg-odcLoss/10 px-4 py-3 text-sm">{signinError}</p>}
          <a
            href="/api/auth/signin"
            className="mt-8 inline-flex items-center gap-2.5 rounded-md bg-odcAcc px-6 py-4 text-sm font-bold uppercase tracking-[0.05em] text-odcOnAcc transition hover:bg-odcAccDeep"
          >
            <MessageCircle size={18} /> Sign in with Discord
          </a>
          <p className="mt-4 text-sm text-odcCream/45">We only see your Discord name, ID and picture. Nothing is posted for you.</p>
        </div>
        </div>
      </section>
    );
  }

  /* ---------- signed in, not on the league list ---------- */
  const signOut = (
    <a href="/api/auth/signout" className="inline-flex items-center gap-2 text-sm font-semibold text-odcCream/55 transition hover:text-odcCream">
      <LogOut size={15} /> Sign out
    </a>
  );

  if (!name && !me.admin) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-center gap-4">
          <img src={me.discord?.avatarUrl} alt="" className="h-16 w-16 rounded-full border-2 border-odcAcc" />
          <div>
            <p className="text-sm text-odcCream/55">Signed in as</p>
            <p className="display text-3xl">{me.discord?.name}</p>
          </div>
        </div>
        <Panel className="mt-8">
          <p className="text-lg font-semibold">This Discord account isn't on the league list yet.</p>
          <p className="mt-2 leading-7 text-odcCream/65">
            If you play in ODC, ask an admin to add your Discord ID to the Players tab, then sign in again. If you're new,
            join the Discord and sign up for next season.
          </p>
          <p className="mt-4 text-xs text-odcCream/40">Your Discord ID: {me.discord?.id}</p>
        </Panel>
        <div className="mt-6">{signOut}</div>
      </section>
    );
  }

  const s = stats || {};
  const p = s.p || {};
  const avg = p.avg ? Number(p.avg).toFixed(2) : "–";
  const tiles = [
    ["Season average", avg, true],
    ["Played", p.played ?? s.master?.gamesPlayed ?? 0],
    ["Won", p.wins ?? 0],
    ["Lost", p.losses ?? 0],
    ["180s", p.tons ?? s.master?.tons ?? 0],
    ["Best checkout", p.highCheckout || s.master?.bestCheckout || "–"],
  ];

  return (
    <div className="relative overflow-hidden">
    <div className="odc-watermark -right-60 -top-56 h-[760px] w-[760px]" aria-hidden="true" />
    <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:pt-14">

      {/* header */}
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={me.picture && norm(me.target) === norm(me.player) ? me.picture : me.discord?.avatarUrl}
            onError={(e) => { e.currentTarget.src = me.discord?.avatarUrl; }}
            alt=""
            className="h-20 w-20 rounded-full border-[3px] border-odcAcc object-cover md:h-28 md:w-28"
          />
          <div>
            <p className="text-sm font-semibold text-odcCream/55">
              {s.division || "ODC"}{s.row ? ` · ${ordinal(s.row.pos)} in the table` : ""}
            </p>
            <h1 className="text-[clamp(44px,9vw,92px)] leading-[0.9]">{name || me.discord?.name}</h1>
            {s.row?.form && <div className="mt-3"><Form5 form={s.row.form} /></div>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          {s.row && (
            <div className="text-right">
              <p className="score text-6xl leading-none text-odcAcc">{s.row.points}</p>
              <p className="text-sm text-odcCream/55">points</p>
            </div>
          )}
          {signOut}
        </div>
      </div>

      {name && (
        <>
          {/* stats */}
          <div className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-odcCream/10 bg-odcCream/10 md:grid-cols-6">
            {tiles.map(([label, v, hero]) => (
              <div key={label} className={`p-5 ${hero ? "bg-odcAcc text-odcOnAcc" : "bg-odcNavy"}`}>
                <p className={`text-sm font-semibold ${hero ? "" : "text-odcCream/55"}`}>{label}</p>
                <p className="score mt-1 text-4xl">{v}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* fixtures */}
            <Panel title={`Week ${data.currentWeek || ""} fixtures`}>
              {s.fixtures?.length ? (
                <ul className="divide-y divide-odcCream/10">
                  {s.fixtures.map((f, i) => {
                    const opp = norm(f.home) === norm(name) ? f.away : f.home;
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 py-3">
                        <span>
                          <span className="text-sm text-odcCream/50">v </span>
                          <span className="display text-2xl">{opp}</span>
                        </span>
                        <span className="text-sm font-semibold text-odcCream/70">{f.date || "Time to be agreed"}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-odcCream/55">No fixtures for you this week.</p>
              )}
            </Panel>

            {/* table */}
            <Panel title={s.division || "Table"}>
              {s.table?.length ? (
                <table className="num w-full text-sm">
                  <thead>
                    <tr className="text-left text-odcCream/45">
                      <th className="pb-2 font-semibold">Pos</th>
                      <th className="pb-2 font-semibold">Player</th>
                      <th className="pb-2 text-center font-semibold">P</th>
                      <th className="pb-2 text-center font-semibold">+/−</th>
                      <th className="pb-2 text-right font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.map((r) => {
                      const mine = norm(r.name) === norm(name);
                      return (
                        <tr key={r.name} className={`border-t border-odcCream/[0.07] ${mine ? "bg-odcAcc/10 font-bold" : ""}`}>
                          <td className={`py-2 pl-1 ${mine ? "text-odcAcc" : ""}`}>{r.pos}</td>
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 text-center">{r.played}</td>
                          <td className="py-2 text-center">{r.legs}</td>
                          <td className="py-2 pr-1 text-right">{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-odcCream/55">The table fills in after your first match.</p>
              )}
            </Panel>
          </div>

          {/* results */}
          <Panel title="Your results" className="relative mt-6">
            {s.results?.length ? (
              <ul className="num divide-y divide-odcCream/10">
                {s.results.slice(0, 20).map((r) => {
                  const home = norm(r.home) === norm(name);
                  const me1 = home ? r.p1Stats : r.p2Stats;
                  const them = home ? r.p2Stats : r.p1Stats;
                  const lf = Number(me1?.legsFor) || 0, la = Number(them?.legsFor) || 0;
                  const res = lf > la ? "W" : lf < la ? "L" : "D";
                  return (
                    <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded text-sm font-bold ${res === "W" ? "bg-odcCream text-odcBlack" : res === "L" ? "bg-odcLoss text-white" : "bg-odcCream/15"}`}>{res}</span>
                      <span className="min-w-0">
                        <span className="display block truncate text-xl">v {home ? r.away : r.home}</span>
                        <span className="text-xs text-odcCream/45">{[r.week ? `Week ${r.week}` : "", me1?.avg ? `your average ${Number(me1.avg).toFixed(2)}` : ""].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="score text-2xl">{lf}–{la}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-odcCream/55">No results yet this season.</p>
            )}
          </Panel>
        </>
      )}

      {/* profile editing */}
      <Panel title="Edit profile" className="relative mt-6">
        {me.admin && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-odcAcc/30 bg-odcAcc/5 p-4">
            <UserCog size={18} className="text-odcAcc" />
            <span className="text-sm font-semibold">Admin: editing</span>
            <select
              value={me.target || ""}
              onChange={(e) => reload(e.target.value)}
              className="rounded-md border border-odcCream/15 bg-odcBlack px-3 py-2 text-sm"
            >
              {!me.target && <option value="">Choose a player</option>}
              {(me.adminPlayers || []).slice().sort((a, b) => a.localeCompare(b)).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
        {!me.canEdit ? (
          <p className="text-odcCream/55">Profile editing isn't switched on yet. An admin needs to finish the setup.</p>
        ) : !me.target ? (
          <p className="text-odcCream/55">Choose a player above to edit their profile.</p>
        ) : (
          <div className="space-y-8">
            <Picture me={me} onChanged={() => reload(me.admin ? me.target : undefined)} />
            <Form me={me} onSaved={() => reload(me.admin ? me.target : undefined)} />
          </div>
        )}
      </Panel>
    </section>
    </div>
  );
}
