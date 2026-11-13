"use client";

import { CheckCircle2, Play, XCircle } from "lucide-react";
import { useState } from "react";
import { TEST_VECTORS, VARIANTS, checkVector, spacedHex } from "@/lib/cipher";

type Row = { id: string; got: string; ok: boolean; roundTrip: boolean };

/** One button that runs all 20 official test vectors, so the audience can see the proof happen. */
export function VerifyAll() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const run = () => {
    setRows(
      VARIANTS.map((v) => {
        const r = checkVector(v.id);
        return { id: v.id, got: spacedHex(r.got, v.block, v.n), ok: r.ok, roundTrip: r.roundTrip };
      }),
    );
  };
  const passed = rows?.filter((r) => r.ok && r.roundTrip).length ?? 0;

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Prove all 20 versions at once</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            The paper prints one official example (key, plaintext, ciphertext) for every version. This button encrypts
            all 20 and also decrypts them back.
          </p>
        </div>
        <button
          onClick={run}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-medium text-paper transition-transform hover:-translate-y-0.5"
        >
          <Play className="h-4 w-4" /> {rows ? "Run again" : "Run all 20 tests"}
        </button>
      </div>
      {rows && (
        <>
          <p
            className={`mt-5 inline-flex animate-pop items-center gap-2 rounded-lg px-3 py-2 font-semibold ${
              passed === 20 ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
            }`}
          >
            {passed === 20 ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {passed} of 20 match the paper and decrypt back correctly
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="flex animate-rise items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className={`font-mono font-semibold ${r.id.startsWith("simon") ? "text-simon" : "text-speck"}`}>
                  {r.id.toUpperCase()}
                </span>
                <span className="truncate font-mono text-xs text-muted" title={`paper: ${TEST_VECTORS[r.id].ciphertext}`}>
                  {r.got}
                </span>
                {r.ok && r.roundTrip ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-good" aria-label="pass" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-bad" aria-label="fail" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
