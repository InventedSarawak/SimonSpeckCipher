"use client";

import { Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { TEST_VECTORS, getVariant, makeCipher, maskOf, parseHex } from "@/lib/cipher";

// 12 × 12 padlock, one pixel = one block (same picture as demo.py ecb)
const LOCK = [
  "............",
  "....####....",
  "...#....#...",
  "...#....#...",
  "...#....#...",
  ".##########.",
  ".####..####.",
  ".####..####.",
  ".####..####.",
  ".##########.",
  ".##########.",
  "............",
];

const VARIANT = "speck64/128";

function randomBlock(bits: number) {
  const bytes = new Uint8Array(bits / 8);
  crypto.getRandomValues(bytes);
  return BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
}

/** Turn a ciphertext block into a colour, so equal blocks get equal colours. */
function colorOf(v: bigint) {
  const h = Number(v % 360n);
  const l = 35 + Number((v >> 9n) % 35n);
  return `hsl(${h} 70% ${l}%)`;
}

export function PadlockDemo() {
  // Fixed start value on first render (so server and browser agree), random after each click
  const [iv, setIv] = useState(0x0123456789abcdefn);
  const panels = useMemo(() => {
    const v = getVariant(VARIANT);
    const c = makeCipher(VARIANT, parseHex(TEST_VECTORS[VARIANT].key, v.key, "key"));
    const full = maskOf(v.block);
    const plain = LOCK.flatMap((row) => row.split("").map((ch) => (ch === "#" ? full : 0n)));
    const ecb = plain.map((p) => c.encryptBlock(p));
    const cbc: bigint[] = [];
    for (const p of plain) cbc.push(c.encryptBlock(p ^ (cbc.at(-1) ?? iv)));
    const ctr = plain.map((p, i) => p ^ c.encryptBlock((iv + BigInt(i)) & full));
    const distinct = (xs: bigint[]) => new Set(xs.map(String)).size;
    return [
      { name: "Original picture", note: "144 blocks: white or black", cells: plain.map((p) => (p ? "var(--ink)" : "var(--sunk)")), count: null },
      { name: "ECB", note: "each block alone, same key", cells: ecb.map(colorOf), count: distinct(ecb) },
      { name: "CBC", note: "each block chained to the last", cells: cbc.map(colorOf), count: distinct(cbc) },
      { name: "CTR", note: "a counter makes every block unique", cells: ctr.map(colorOf), count: distinct(ctr) },
    ];
  }, [iv]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {panels.map((p) => {
          const leaks = p.count !== null && p.count < 144;
          return (
            <figure key={p.name} className="rounded-2xl border border-line bg-card p-3">
              <div className="grid aspect-square grid-cols-12 gap-px overflow-hidden rounded-lg">
                {p.cells.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
              <figcaption className="mt-3">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.note}</p>
                {p.count !== null && (
                  <p
                    className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                      leaks ? "bg-bad-soft text-bad" : "bg-good-soft text-good"
                    }`}
                  >
                    {p.count} different blocks of 144 · {leaks ? "picture leaks" : "looks like noise"}
                  </p>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIv(randomBlock(64))}
          className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-medium hover:bg-sunk"
        >
          <Shuffle className="h-4 w-4" /> Encrypt again with a new random start value
        </button>
        <p className="text-sm text-muted">
          ECB looks the same every time. CBC and CTR change completely. Encrypted live with SPECK64/128.
        </p>
      </div>
    </div>
  );
}
