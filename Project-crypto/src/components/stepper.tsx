"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BitRow } from "./bits";

export interface StepRow {
  label: string;
  value: bigint;
  tone?: "ink" | "simon" | "speck";
  highlight?: bigint;
}

export interface Step {
  title: string;
  explain: ReactNode;
  rows: StepRow[];
  formula?: string;
}

/** Click-through explanation: one step at a time, with bit rows and hex for each value. */
export function Stepper({
  steps,
  width,
  diagram,
  tone,
}: {
  steps: Step[];
  width: number;
  diagram: (stepIndex: number) => ReactNode;
  tone: "simon" | "speck";
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const accent = tone === "simon" ? "bg-simon" : "bg-speck";
  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-card p-5 sm:p-6 lg:grid-cols-[22rem_1fr]">
      <div className="order-2 lg:order-1">{diagram(i)}</div>
      <div className="order-1 min-w-0 lg:order-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm text-muted">
            Step {i + 1} of {steps.length}
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, j) => (
              <span key={j} className={`h-1.5 w-5 rounded-full transition-colors ${j <= i ? accent : "bg-line"}`} />
            ))}
          </div>
        </div>
        <h3 className="mt-2 text-xl font-semibold" aria-live="polite">
          {step.title}
        </h3>
        <div className="mt-2 leading-relaxed text-ink-2">{step.explain}</div>
        {step.formula && (
          <p className="mt-3 inline-block rounded-lg bg-sunk px-3 py-1.5 font-mono text-sm">{step.formula}</p>
        )}
        <div className="mt-5 space-y-2.5 overflow-x-auto pb-1" key={i}>
          {step.rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 animate-rise">
              <BitRow value={r.value} width={width} label={r.label} tone={r.tone} highlight={r.highlight} size="sm" />
              <span className="font-mono text-sm font-medium">{r.value.toString(16).padStart(width / 4, "0")}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            className="flex items-center gap-1 rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-sunk disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {i < steps.length - 1 ? (
            <button
              onClick={() => setI(i + 1)}
              className="flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
            >
              Next step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setI(0)}
              className="flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              <RotateCcw className="h-4 w-4" /> Start again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
