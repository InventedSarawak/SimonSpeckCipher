"use client";

import { makeCipher, maskOf, rotl, rotr, simonF, speckAB } from "@/lib/cipher";
import { SimonRoundDiagram, SpeckRoundDiagram } from "./diagrams";
import { Stepper, type Step } from "./stepper";

const KEY_32_64 = 0x1918111009080100n;
const hex = (v: bigint) => v.toString(16).padStart(4, "0");

/** Round 1 of SIMON32/64 on the paper's test vector, step by step. */
export function SimonWalkthrough() {
  const n = 16;
  const x = 0x6565n;
  const y = 0x6877n;
  const k = makeCipher("simon32/64", KEY_32_64).roundKeys[0];
  const r1 = rotl(x, 1, n);
  const r8 = rotl(x, 8, n);
  const and = r1 & r8;
  const r2 = rotl(x, 2, n);
  const f = simonF(x, n);
  const yf = y ^ f;
  const nx = yf ^ k;

  const steps: Step[] = [
    {
      title: "Start with the paper's example",
      explain: (
        <>
          The 32-bit block <code className="font-mono">6565 6877</code> is split into two 16-bit words. Round 1 uses
          round key <code className="font-mono">{hex(k)}</code>, which is simply the last word of the key{" "}
          <code className="font-mono">1918 1110 0908 0100</code>.
        </>
      ),
      rows: [
        { label: "x (left)", value: x, tone: "simon" },
        { label: "y (right)", value: y, tone: "simon" },
        { label: "k₀", value: k },
      ],
    },
    {
      title: "Rotate x by 1 and by 8",
      explain: (
        <>
          Make two shifted copies of x. Fun detail: rotating a 16-bit word by 8 just swaps its two bytes, and since{" "}
          <code className="font-mono">6565</code> has the same byte twice, it stays <code className="font-mono">6565</code>.
        </>
      ),
      formula: "x⋘1,  x⋘8",
      rows: [
        { label: "x", value: x },
        { label: "x ⋘ 1", value: r1, tone: "simon" },
        { label: "x ⋘ 8", value: r8, tone: "simon" },
      ],
    },
    {
      title: "AND them together (the bendy step)",
      explain: <>A bit survives only where both copies have a 1. This is SIMON&apos;s only non-linear operation.</>,
      formula: "(x⋘1) & (x⋘8)",
      rows: [
        { label: "x ⋘ 1", value: r1 },
        { label: "x ⋘ 8", value: r8 },
        { label: "AND", value: and, tone: "simon" },
      ],
    },
    {
      title: "XOR with x rotated by 2 → f(x)",
      explain: <>Add one more rotated copy with XOR. The result is the mixing function f(x).</>,
      formula: "f(x) = AND ⊕ (x⋘2)",
      rows: [
        { label: "AND", value: and },
        { label: "x ⋘ 2", value: r2 },
        { label: "f(x)", value: f, tone: "simon", highlight: f },
      ],
    },
    {
      title: "Mix f(x) and the round key into y",
      explain: (
        <>
          XOR f(x) into the right word, then XOR the round key. That gives the new left word,{" "}
          <strong className="font-mono text-ink">{hex(nx)}</strong>, exactly what we got by hand.
        </>
      ),
      formula: "new x = y ⊕ f(x) ⊕ k",
      rows: [
        { label: "y", value: y },
        { label: "f(x)", value: f },
        { label: "k₀", value: k },
        { label: "new x", value: nx, tone: "simon", highlight: nx ^ y },
      ],
    },
    {
      title: "Swap: old x becomes the new y",
      explain: (
        <>
          That is one full round. SIMON32/64 repeats this <strong>32 times</strong>, each with a different round key,
          and ends at <code className="font-mono">c69b e9bb</code>, the paper&apos;s answer.
        </>
      ),
      formula: "(x, y) → (y ⊕ f(x) ⊕ k, x)",
      rows: [
        { label: "new x", value: nx, tone: "simon" },
        { label: "new y", value: x, tone: "simon" },
      ],
    },
  ];
  const active = [undefined, "f", "f", "f", "key", "swap"] as const;
  return <Stepper steps={steps} width={n} tone="simon" diagram={(i) => <SimonRoundDiagram active={active[i]} />} />;
}

/** Round 1 of SPECK32/64 on the paper's test vector. */
export function SpeckWalkthrough() {
  const n = 16;
  const [a, b] = speckAB(32);
  const x = 0x6574n;
  const y = 0x694cn;
  const k = makeCipher("speck32/64", KEY_32_64).roundKeys[0];
  const rx = rotr(x, a, n);
  const sum = (rx + y) & maskOf(n);
  const nx = sum ^ k;
  const ry = rotl(y, b, n);
  const ny = ry ^ nx;

  const steps: Step[] = [
    {
      title: "Start with the paper's example",
      explain: (
        <>
          The block <code className="font-mono">6574 694c</code> becomes two 16-bit words. For the 32-bit version the
          rotation amounts are α = 7 and β = 2 (all bigger versions use 8 and 3).
        </>
      ),
      rows: [
        { label: "x (left)", value: x, tone: "speck" },
        { label: "y (right)", value: y, tone: "speck" },
        { label: "k₀", value: k },
      ],
    },
    {
      title: "Rotate x right by 7",
      explain: <>Slide the bits of x seven places to the right, wrapping around.</>,
      formula: "x ⋙ 7",
      rows: [
        { label: "x", value: x },
        { label: "x ⋙ 7", value: rx, tone: "speck" },
      ],
    },
    {
      title: "Add y (the bendy step)",
      explain: (
        <>
          Ordinary addition, wrapping past 65535. The carries ripple across the whole word in one go, which is why SPECK
          mixes so much faster than SIMON.
        </>
      ),
      formula: "(x ⋙ 7) + y   mod 2¹⁶",
      rows: [
        { label: "x ⋙ 7", value: rx },
        { label: "y", value: y },
        { label: "sum", value: sum, tone: "speck", highlight: sum ^ (rx ^ y) },
      ],
    },
    {
      title: "XOR the round key → new x",
      explain: (
        <>
          The highlighted bits in the sum above are the ones changed by carries. Now XOR in the key to get the new x:{" "}
          <strong className="font-mono text-ink">{hex(nx)}</strong>.
        </>
      ),
      formula: "new x = sum ⊕ k",
      rows: [
        { label: "sum", value: sum },
        { label: "k₀", value: k },
        { label: "new x", value: nx, tone: "speck" },
      ],
    },
    {
      title: "Rotate y left by 2, XOR with new x → new y",
      explain: (
        <>
          After round 1 the state is <code className="font-mono">{hex(nx)} {hex(ny)}</code>. SPECK32/64 needs only{" "}
          <strong>22 rounds</strong> (SIMON needs 32) and ends at <code className="font-mono">a868 42f2</code>, matching
          the paper.
        </>
      ),
      formula: "new y = (y ⋘ 2) ⊕ new x",
      rows: [
        { label: "y ⋘ 2", value: ry },
        { label: "new x", value: nx },
        { label: "new y", value: ny, tone: "speck" },
      ],
    },
  ];
  const active = [undefined, "rotx", "add", "key", "xor"] as const;
  return <Stepper steps={steps} width={n} tone="speck" diagram={(i) => <SpeckRoundDiagram active={active[i]} />} />;
}

/** First few round keys for the 32/64 example, to show the key schedule's output. */
export function RoundKeyStrip({ family }: { family: "simon" | "speck" }) {
  const keys = makeCipher(`${family}32/64`, KEY_32_64).roundKeys.slice(0, 8);
  const color = family === "simon" ? "text-simon" : "text-speck";
  return (
    <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {keys.map((k, i) => (
        <li key={i} className="rounded-lg border border-line bg-paper p-2 text-center">
          <span className="block text-xs text-muted">k{i}</span>
          <span className={`font-mono text-sm font-semibold ${family === "simon" && i < 4 ? "text-ink" : color}`}>
            {hex(k)}
          </span>
        </li>
      ))}
    </ol>
  );
}
