"use client";

import { useState } from "react";
import data from "@/data/avalanche.json";

interface Curve {
  variant: string;
  family: "simon" | "speck";
  block: number;
  key: number;
  rounds: number;
  fullDiffusionRound: number;
  percent: number[];
}

const CURVES = data as Curve[];
const SIZES = CURVES.filter((c) => c.family === "simon").map((c) => `${c.block}/${c.key}`);
const COLOR = { simon: "var(--simon)", speck: "var(--speck)" };

const W = 720;
const H = 300;
const M = { l: 44, r: 16, t: 16, b: 36 };

/** % of output bits changed after each round, SIMON vs SPECK, for one size. */
export function AvalancheChart() {
  const [size, setSize] = useState("64/128");
  const [hover, setHover] = useState<number | null>(null);
  const pair = (["simon", "speck"] as const).map((f) => CURVES.find((c) => c.variant === `${f}${size}`)!);
  const maxR = Math.max(...pair.map((c) => c.rounds));
  const x = (r: number) => M.l + (r / maxR) * (W - M.l - M.r);
  const y = (p: number) => M.t + (1 - p / 60) * (H - M.t - M.b);
  const path = (c: Curve) => c.percent.map((p, r) => `${r ? "L" : "M"}${x(r).toFixed(1)},${y(p).toFixed(1)}`).join("");
  const ticks = Array.from({ length: Math.floor(maxR / 10) + 1 }, (_, i) => i * 10);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const r = Math.round(((px - M.l) / (W - M.l - M.r)) * maxR);
    setHover(r >= 0 && r <= maxR ? r : null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
          {SIZES.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              className={`rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors ${
                size === s ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-line-strong"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-sm">
          {pair.map((c) => (
            <span key={c.family} className="flex items-center gap-2">
              <span className="h-0.5 w-5" style={{ background: COLOR[c.family] }} />
              {c.family.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={`Percent of bits changed per round for ${size}. SIMON reaches full diffusion at round ${pair[0].fullDiffusionRound}, SPECK at round ${pair[1].fullDiffusionRound}.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 10, 20, 30, 40, 50, 60].map((p) => (
            <g key={p}>
              <line x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} stroke="var(--line)" strokeWidth={p === 50 ? 0 : 1} />
              <text x={M.l - 8} y={y(p) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                {p}%
              </text>
            </g>
          ))}
          <line x1={M.l} x2={W - M.r} y1={y(50)} y2={y(50)} stroke="var(--ink-2)" strokeDasharray="5 4" strokeWidth={1.5} />
          <text x={W - M.r} y={y(50) - 6} textAnchor="end" fontSize={11} fill="var(--ink-2)">
            ideal: half the bits change
          </text>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - M.b + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">
              {t}
            </text>
          ))}
          <text x={(W + M.l) / 2} y={H - 2} textAnchor="middle" fontSize={11} fill="var(--muted)">
            round
          </text>
          {pair.map((c) => (
            <path key={c.family} d={path(c)} fill="none" stroke={COLOR[c.family]} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {pair.map((c) => (
            <g key={`m-${c.family}`}>
              <circle
                cx={x(c.fullDiffusionRound)}
                cy={y(c.percent[c.fullDiffusionRound])}
                r={5.5}
                fill={COLOR[c.family]}
                stroke="var(--card)"
                strokeWidth={2}
              />
              <text
                x={x(c.fullDiffusionRound) + 9}
                y={y(c.percent[c.fullDiffusionRound]) + (c.family === "simon" ? 16 : -10)}
                fontSize={11.5}
                fontWeight={600}
                fill="var(--ink)"
              >
                {c.family.toUpperCase()}: fully mixed at round {c.fullDiffusionRound}
              </text>
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="var(--ink-2)" strokeWidth={1} />
              {pair.map((c) =>
                hover <= c.rounds ? (
                  <circle key={c.family} cx={x(hover)} cy={y(c.percent[hover])} r={4} fill={COLOR[c.family]} stroke="var(--card)" strokeWidth={2} />
                ) : null,
              )}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-sm"
            style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% + 10px), calc(100% - 11rem))` }}
          >
            <p className="font-semibold">After round {hover}</p>
            {pair.map((c) => (
              <p key={c.family} className="mt-0.5 flex items-center gap-2 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR[c.family] }} />
                {c.family.toUpperCase()}: {hover <= c.rounds ? `${c.percent[hover].toFixed(1)}%` : "finished"}
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        50 random keys and messages, every input bit flipped once. Computed with our Python library.
      </p>
    </div>
  );
}

/** For each size: rounds until full mixing vs. the remaining “safety cushion”. */
export function CushionChart() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-ink-2">
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-ink-2" /> rounds until fully mixed
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm border border-line-strong bg-sunk" /> extra rounds (safety cushion)
        </span>
      </div>
      <ul className="space-y-3">
        {SIZES.map((s) => (
          <li key={s} className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
            <span className="text-right font-mono text-sm text-ink-2">{s}</span>
            <div className="space-y-[3px]">
              {(["simon", "speck"] as const).map((f) => {
                const c = CURVES.find((d) => d.variant === `${f}${s}`)!;
                return (
                  <div key={f} className="flex items-center gap-2" title={`${c.variant.toUpperCase()}: fully mixed after ${c.fullDiffusionRound} of ${c.rounds} rounds`}>
                    <div className="flex h-3 overflow-hidden rounded-r-[4px]" style={{ width: `${(c.rounds / 72) * 80}%` }}>
                      <span style={{ width: `${(c.fullDiffusionRound / c.rounds) * 100}%`, background: COLOR[f] }} />
                      <span className="ml-[2px] flex-1 border border-l-0 border-line-strong bg-sunk" />
                    </div>
                    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-2">
                      {c.fullDiffusionRound}/{c.rounds}
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Top bar of each pair is <span className="font-semibold text-simon">SIMON</span>, bottom is{" "}
        <span className="font-semibold text-speck">SPECK</span>.
      </p>
    </div>
  );
}
