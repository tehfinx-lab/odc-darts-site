"use client";

import { useMemo } from "react";
import { CalendarDays, ArrowRight, Trophy } from "lucide-react";

/**
 * NEXT EVENT BANNER
 * Shows the soonest upcoming event chronologically.
 * Parses dates in "D/M/YY" or "DD/MM/YY" format (your sheet format, e.g. "19/6/26").
 */

function parseEventDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  d = Number(d); mo = Number(mo); y = Number(y);
  if (y < 100) y += 2000; // "26" -> 2026
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

export default function NextEventBanner({ events, onViewEvents }) {
  const nextEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dated = events
      .map((e) => ({ event: e, date: parseEventDate(e.date) }))
      .filter((x) => x.date && x.date >= now)
      .sort((a, b) => a.date - b.date);

    return dated[0] || null;
  }, [events]);

  if (!nextEvent) return null;

  const { event, date } = nextEvent;
  const daysAway = Math.ceil((date - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  const dayLabel = daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `In ${daysAway} days`;
  const niceDate = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6">
      <button
        onClick={onViewEvents}
        className="group relative block w-full overflow-hidden rounded-xl border border-odcRed/30 bg-odcNavy p-5 text-left transition hover:border-odcRed/60"
      >
        {/* animated shine */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-odcNavy transition-transform duration-1000 group-hover:translate-x-full" />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-odcRed/20">
              <Trophy className="text-odcRed" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-odcRed px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                  <CalendarDays size={12} /> Next Event
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-odcRed">{dayLabel}</span>
              </div>
              <h3 className="mt-2 text-2xl font-semibold leading-tight">{event.name}</h3>
              <p className="mt-1 text-sm text-odcCream/60">
                {niceDate}
                {event.format ? ` • ${event.format}` : ""}
                {event.prize ? ` • ${event.prize}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-lg border border-odcCream/20 px-5 py-3 font-semibold text-odcCream transition group-hover:bg-odcRed group-hover:text-white md:self-center">
            View Events
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </button>
    </section>
  );
}
