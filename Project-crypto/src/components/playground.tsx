"use client";

import { CheckCircle2, Dices, FileText, Info, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  TEST_VECTORS,
  VARIANTS,
  getVariant,
  makeCipher,
  maskOf,
  parseHex,
  popcount,
  spacedHex,
  type Family,
} from "@/lib/cipher";

const SIZES = VARIANTS.filter((v) => v.family === "simon").map((v) => `${v.block}/${v.key}`);

function randomHex(bits: number, n: number) {
  const bytes = new Uint8Array(bits / 8);
  crypto.getRandomValues(bytes);
  const v = BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
  return spacedHex(v, bits, n);
}

export function Playground() {
  const [family, setFamily] = useState<Family>("simon");
  const [size, setSize] = useState("32/64");
  const id = `${family}${size}`;
  const v = getVariant(id);
  const [key, setKey] = useState(TEST_VECTORS[id].key);
  const [pt, setPt] = useState(TEST_VECTORS[id].plaintext);
  const [flipBit, setFlipBit] = useState<number | null>(null);

  const choose = (f: Family, s: string) => {
    setFamily(f);
    setSize(s);
    const tv = TEST_VECTORS[`${f}${s}`];
    setKey(tv.key);
    setPt(tv.plaintext);
    setFlipBit(null);
  };

  const result = useMemo(() => {
    try {
      const K = parseHex(key, v.key, "Key");
      const P = parseHex(pt, v.block, "Plaintext");
      const c = makeCipher(id, K);
      const N = BigInt(v.n);
      const mask = maskOf(v.n);
      const trace = c.trace(P >> N, P & mask).map(([x, y]) => (x << N) | y);
      const C = trace[trace.length - 1];
      const back = c.decryptBlock(C);
      const tv = TEST_VECTORS[id];
      const isPaper = K === parseHex(tv.key, v.key, "") && P === parseHex(tv.plaintext, v.block, "");
      const paperOk = isPaper ? C === parseHex(tv.ciphertext, v.block, "") : null;
      let flipped: bigint[] | null = null;
      if (flipBit !== null) {
        const Q = P ^ (1n << BigInt(flipBit));
        flipped = c.trace(Q >> N, Q & mask).map(([x, y]) => (x << N) | y);
      }
      return { ok: true as const, c, trace, C, back, P, paperOk, flipped };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [key, pt, id, v, flipBit]);

  return (
    <div className="space-y-6">
      {/* 1. Pick a version */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <StepLabel n={1} text="Pick a cipher and a size" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-line-strong p-1" role="radiogroup" aria-label="Cipher family">
            {(["simon", "speck"] as Family[]).map((f) => (
              <button
                key={f}
                role="radio"
                aria-checked={family === f}
                onClick={() => choose(f, size)}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
                  family === f ? (f === "simon" ? "bg-simon text-white" : "bg-speck text-white") : "text-ink-2 hover:bg-sunk"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Block and key size">
            {SIZES.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={size === s}
                onClick={() => choose(family, s)}
                className={`rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors ${
                  size === s ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-line-strong"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {v.id.toUpperCase()}: {v.block}-bit block (two {v.n}-bit words), {v.key}-bit key, <strong className="text-ink">{v.rounds} rounds</strong>.
          Size is written block/key.
        </p>
      </div>

      {/* 2. Inputs */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepLabel n={2} text="Type a key and a message (in hex)" />
          <div className="flex gap-2">
            <button
              onClick={() => choose(family, size)}
              className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm hover:bg-sunk"
            >
              <FileText className="h-4 w-4" /> Paper&apos;s example
            </button>
            <button
              onClick={() => {
                setKey(randomHex(v.key, v.n));
                setPt(randomHex(v.block, v.n));
              }}
              className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm hover:bg-sunk"
            >
              <Dices className="h-4 w-4" /> Random
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={`Secret key (${v.key / 4} hex digits)`} value={key} onChange={setKey} />
          <Field label={`Plaintext block (${v.block / 4} hex digits)`} value={pt} onChange={setPt} />
        </div>
      </div>

      {/* 3. Result */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <StepLabel n={3} text="See the result" />
        {!result.ok ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-bad-soft p-3 text-bad">
            <XCircle className="h-5 w-5 shrink-0" /> {result.error}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Out label="Ciphertext" value={spacedHex(result.C, v.block, v.n)} tone={family} />
            <Out
              label="Decrypt it back"
              value={spacedHex(result.back, v.block, v.n)}
              badge={
                result.back === result.P ? (
                  <Badge ok text="Same as the plaintext" />
                ) : (
                  <Badge ok={false} text="Does not match" />
                )
              }
            />
            <div className="rounded-xl border border-line p-4">
              <p className="text-sm text-muted">Check against the paper</p>
              {result.paperOk === null ? (
                <p className="mt-2 flex gap-2 text-sm text-ink-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" /> This is your own input. Press “Paper&apos;s example” to
                  compare with the official answer.
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <p className="font-mono text-sm">Paper says: {TEST_VECTORS[id].ciphertext}</p>
                  <Badge ok={result.paperOk} text={result.paperOk ? "Exact match" : "Mismatch"} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Every round */}
      {result.ok && (
        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StepLabel n={4} text="Watch every round" />
              <p className="mt-2 max-w-2xl text-sm text-ink-2">
                Each row is the whole block after one round, one square per bit. Turn on the avalanche test to flip a
                single plaintext bit and see the difference (yellow) spread.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-sm">
              <input
                type="checkbox"
                checked={flipBit !== null}
                onChange={(e) => setFlipBit(e.target.checked ? 0 : null)}
                className="accent-[var(--hl)]"
              />
              Avalanche test: flip bit
              <select
                value={flipBit ?? 0}
                disabled={flipBit === null}
                onChange={(e) => setFlipBit(+e.target.value)}
                className="rounded border border-line bg-paper px-1 font-mono text-xs"
                aria-label="Which plaintext bit to flip"
              >
                {Array.from({ length: v.block }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 max-h-[34rem] overflow-auto rounded-xl border border-line">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="sticky top-0 z-10 bg-sunk text-left text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Round</th>
                  <th className="px-3 py-2 font-medium">Round key</th>
                  <th className="px-3 py-2 font-medium">State (x y)</th>
                  <th className="w-[45%] px-3 py-2 font-medium">Bits</th>
                  {result.flipped && <th className="px-3 py-2 text-right font-medium">Bits changed</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.trace.map((s, r) => {
                  const diff = result.flipped ? s ^ result.flipped[r] : 0n;
                  const changed = popcount(diff);
                  return (
                    <tr key={r} className={r === result.trace.length - 1 ? "bg-good-soft/50" : ""}>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted">{r === 0 ? "input" : r}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {r === 0 ? "—" : result.c.roundKeys[r - 1].toString(16).padStart(v.n / 4, "0")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs">{spacedHex(s, v.block, v.n)}</td>
                      <td className="px-3 py-1.5">
                        <BitStrip value={s} diff={diff} width={v.block} tone={family} />
                      </td>
                      {result.flipped && (
                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                          {changed} / {v.block}
                          <span className="ml-1 text-muted">({Math.round((100 * changed) / v.block)}%)</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.flipped && (
            <p className="mt-3 text-sm text-ink-2">
              A good cipher ends with about <strong>50%</strong> of the bits changed. Here the final block differs in{" "}
              <strong>
                {popcount(result.C ^ result.flipped[result.flipped.length - 1])} of {v.block}
              </strong>{" "}
              bits.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BitStrip({ value, diff, width, tone }: { value: bigint; diff: bigint; width: number; tone: Family }) {
  const on = tone === "simon" ? "var(--simon)" : "var(--speck)";
  return (
    <div className="flex h-3.5 gap-px" aria-hidden>
      {Array.from({ length: width }, (_, i) => {
        const b = BigInt(width - 1 - i);
        const isDiff = (diff >> b) & 1n;
        const isOn = (value >> b) & 1n;
        return (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{ background: isDiff ? "var(--hl)" : isOn ? on : "var(--sunk)", opacity: isDiff || isOn ? 1 : 1 }}
          />
        );
      })}
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-sm text-paper">{n}</span>
      {text}
    </h2>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-line-strong bg-paper px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-ink"
      />
    </label>
  );
}

function Out({ label, value, tone, badge }: { label: string; value: string; tone?: Family; badge?: React.ReactNode }) {
  const color = tone === "simon" ? "text-simon" : tone === "speck" ? "text-speck" : "text-ink";
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 break-all font-mono text-lg font-semibold ${color}`}>{value}</p>
      {badge && <div className="mt-2">{badge}</div>}
    </div>
  );
}

function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`inline-flex animate-pop items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium ${
        ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
      }`}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {text}
    </span>
  );
}
