// Checks the TypeScript cipher against the paper's 20 test vectors.
// Run: node --experimental-strip-types tests/vectors.test.ts
import { VARIANTS, checkVector } from "../src/lib/cipher";

let failed = 0;
for (const v of VARIANTS) {
  const r = checkVector(v.id);
  const ok = r.ok && r.roundTrip;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${v.id}`);
}
console.log(failed ? `${failed} failures` : "All 20 variants match the paper");
process.exit(failed ? 1 : 0);
