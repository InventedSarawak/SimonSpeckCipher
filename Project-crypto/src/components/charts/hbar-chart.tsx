"use client";

import { useState } from "react";

export interface HBar {
  label: string;
  value: number;
  tone: "simon" | "speck" | "other";
  note?: string;
}

const FILL = { simon: "var(--simon)", speck: "var(--speck)", other: "var(--line-strong)" };

/**
 * Horizontal bar chart with an optional reference line (e.g. a 2000 GE budget).
 * Bars are thin with a rounded data end, values are labelled at the bar end,
 * and hovering a row shows its note.
 */
export function HBarChart({
  bars,
  unit,
  max,
  refLine,
  ariaLabel,
}: {
  bars: HBar[];
  unit: string;
  max: number;
  refLine?: { value: number; label: string };
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <figure aria-label={ariaLabel}>
      <div className="relative">
        {refLine && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 bottom-0 z-10 border-l-2 border-dashed border-bad"
            style={{ left: `calc(9.5rem + (100% - 9.5rem - 4.5rem) * ${refLine.value / max})` }}
          >
            <span className="absolute -top-0.5 left-1.5 whitespace-nowrap text-xs font-semibold text-bad">
              {refLine.label}
            </span>
          </div>
        )}
        <ul className="space-y-1.5 pt-6">
          {bars.map((b, i) => (
            <li
              key={b.label}
              className={`grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-0 rounded-md py-1 transition-colors ${
                hover === i ? "bg-sunk" : ""
              }`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate pr-3 text-right text-sm text-ink-2">{b.label}</span>
              <span className="relative h-5">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-700"
                  style={{ width: pct(b.value), background: FILL[b.tone] }}
                />
              </span>
              <span className="pl-2 font-mono text-sm tabular-nums">{b.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 min-h-[1.5rem] text-sm text-muted">
        {hover !== null && bars[hover].note ? (
          <span className="text-ink-2">
            <strong className="text-ink">{bars[hover].label}:</strong> {bars[hover].note}
          </span>
        ) : (
          <>Unit: {unit}. Hover a bar for details.</>
        )}
      </figcaption>
    </figure>
  );
}
