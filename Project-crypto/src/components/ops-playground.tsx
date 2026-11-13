"use client";

import { useState } from "react";
import { BitRow } from "./bits";

type Op = "xor" | "rot" | "and" | "add";

const OPS: { id: Op; name: string; kind: "straight" | "bendy"; story: string; usedBy: string }[] = [
  {
    id: "xor",
    name: "XOR",
    kind: "straight",
    story: "Like a light switch: where B has a 1, the bit in A flips. Where B has a 0, nothing changes. XOR-ing with B twice gives A back.",
    usedBy: "Both. This is how the key gets mixed in.",
  },
  {
    id: "rot",
    name: "Rotate",
    kind: "straight",
    story: "Slide every bit to the left, and the bits that fall off the end come back on the right, like turning a ring.",
    usedBy: "Both. It moves information to new positions.",
  },
  {
    id: "and",
    name: "AND",
    kind: "bendy",
    story: "The result is 1 only where both A and B are 1. You can't always work backwards: a 0 could come from 0&0, 0&1 or 1&0.",
    usedBy: "SIMON's non-linear step. Cheap on a chip (1.25 GE per bit).",
  },
  {
    id: "add",
    name: "Add",
    kind: "bendy",
    story: "Normal adding, where overflow wraps around like a clock. Carries (1+1 = 10) ripple left and tangle the bits together.",
    usedBy: "SPECK's non-linear step. One instruction on any processor.",
  },
];

const W = 8;
const MASK = 0xff;

export function OpsPlayground() {
  const [a, setA] = useState(0b10110100);
  const [b, setB] = useState(0b01100110);
  const [r, setR] = useState(3);
  const [op, setOp] = useState<Op>("xor");
  const info = OPS.find((o) => o.id === op)!;

  const result =
    op === "xor" ? a ^ b : op === "and" ? a & b : op === "add" ? (a + b) & MASK : ((a << r) | (a >> (W - r))) & MASK;

  // carry bits for addition: c_{i+1} = majority(a_i, b_i, c_i)
  let carries = 0;
  if (op === "add") {
    let c = 0;
    for (let i = 0; i < W; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const nc = (ai & bi) | (ai & c) | (bi & c);
      if (nc && i + 1 < W) carries |= 1 << (i + 1);
      c = nc;
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card">
      <div role="tablist" aria-label="Bit operation" className="flex flex-wrap gap-1 border-b border-line p-2">
        {OPS.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={op === o.id}
            onClick={() => setOp(o.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              op === o.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3 overflow-x-auto">
          <BitRow value={a} width={W} label="A (click bits)" onToggle={(i) => setA(a ^ (1 << i))} />
          {op === "rot" ? (
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-right text-sm text-ink-2">rotate left by</span>
              <input
                type="range"
                min={1}
                max={7}
                value={r}
                onChange={(e) => setR(+e.target.value)}
                className="w-48 accent-[var(--ink)]"
                aria-label="rotation amount"
              />
              <span className="font-mono">{r}</span>
            </div>
          ) : (
            <BitRow value={b} width={W} label="B (click bits)" onToggle={(i) => setB(b ^ (1 << i))} />
          )}
          {op === "add" && <BitRow value={carries} width={W} label="carries" size="md" highlight={carries} />}
          <div className="ml-[7.75rem] h-px max-w-[17rem] bg-line-strong" />
          <BitRow value={result} width={W} label={`= A ${info.name === "Rotate" ? `⟲ ${r}` : info.name}`} tone="simon" />
          <p className="pl-[7.75rem] font-mono text-sm text-muted">
            {a} {op === "xor" ? "⊕" : op === "and" ? "&" : op === "add" ? "+" : "⋘"} {op === "rot" ? r : b} = {result}
            {op === "add" && a + b > MASK ? `  (${a + b} wrapped past 255)` : ""}
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
              info.kind === "bendy" ? "bg-speck-soft text-speck" : "bg-sunk text-ink-2"
            }`}
          >
            {info.kind === "bendy" ? "Non-linear (bendy)" : "Linear (straight-line)"}
          </span>
          <p className="leading-relaxed text-ink-2">{info.story}</p>
          <p className="leading-relaxed">
            <span className="text-muted">Used by: </span>
            {info.usedBy}
          </p>
        </div>
      </div>
    </div>
  );
}
