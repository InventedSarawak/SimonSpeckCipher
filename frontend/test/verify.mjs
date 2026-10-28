// Compare the JavaScript in the built HTML with ref.py's trace.json, value by value.
import fs from "node:fs";
const [html, tracePath] = process.argv.slice(2);
const src = fs.readFileSync(html, "utf8");
const grab = id => src.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))[1];
const api = new Function(grab("ref-js") + grab("trace-js") + `
  return { _check, simon_round_keys, speck_round_keys, simon_encrypt, simon_decrypt, speck_encrypt, speck_decrypt,
           traceSimonKeys, traceSpeckKeys, traceSimonEnc, traceSpeckEnc, traceSimonDec, traceSpeckDec, run_tests, checkTracers,
           SIMON, SPECK, MASK };`)();
// The embedded ref.py must be byte-identical to the file.
const embedded = src.match(/<script type="text\/plain" id="ref-py">([\s\S]*?)<\/script>/)[1];
const refFile = fs.readFileSync(new URL("../ref.py", import.meta.url), "utf8");
let fails = 0; const fail = m => { fails++; if (fails < 25) console.log("FAIL", m); };
if (embedded !== refFile) fail("embedded ref.py differs from ref.py");
const T = JSON.parse(fs.readFileSync(tracePath, "utf8"));
const B = h => BigInt("0x" + h), H = v => v.toString(16);
const eq = (what, a, b) => { if (a !== b) fail(`${what}: js=${a} py=${b}`); };
let checked = 0;
for (const c of T.cases) {
  const n = c.n, key = c.key.map(B), x = B(c.x), y = B(c.y), S = c.cipher === "simon", tag = `${c.cipher}${2*n}/${n*key.length}`;
  const rk = (S ? api.simon_round_keys : api.speck_round_keys)(key, n);
  eq(`${tag} rk`, rk.map(H).join(), c.rk.join());
  const [cx, cy] = (S ? api.simon_encrypt : api.speck_encrypt)(x, y, key, n);
  eq(`${tag} ct`, H(cx) + " " + H(cy), c.ct.join(" "));
  const [dx, dy] = (S ? api.simon_decrypt : api.speck_decrypt)(cx, cy, key, n);
  eq(`${tag} dec`, H(dx) + " " + H(dy), c.dec.join(" "));
  if (S) {
    const t = api.traceSimonKeys(key, n);
    c.ks.forEach((p, i) => { const j = t.iters[i];
      eq(`${tag} ks i=${p.i}`, [j.i, H(j.tmp29), j.tmp31 === undefined ? null : H(j.tmp31), H(j.tmp32), H(j.notk), Number(j.zbit), H(j.out)].join(),
         [p.i, p.tmp29, p.tmp31, p.tmp32, p.notk, p.zbit, p.out].join()); checked += 7; });
    api.traceSimonEnc(x, y, rk, n).forEach((r, i) => { const p = c.rounds[i];
      eq(`${tag} round ${i+1}`, [r.s1, r.s8, r.and, r.s2, r.f, r.nx, r.ny].map(H).join(), [p.s1, p.s8, p.andv, p.s2, p.f, p.x, p.y].join()); checked += 7; });
    api.traceSimonDec(cx, cy, rk, n).forEach((s, i) => { const p = c.decsteps[i];
      eq(`${tag} dec ${i+1}`, [s.f, s.nx, s.ny].map(H).join(), [p.f, p.x, p.y].join()); checked += 3; });
  } else {
    const t = api.traceSpeckKeys(key, n);
    c.ks.forEach((p, i) => { const j = t.iters[i];
      eq(`${tag} ks i=${p.i}`, [j.i, H(j.rorl), H(j.sum), H(j.lnew), H(j.rolk), H(j.knew)].join(), [p.i, p.rorl, p.sum, p.lnew, p.rolk, p.knew].join()); checked += 6;
      // carries: adding with the carry row must reproduce the sum
      if ((j.ki ^ j.rorl ^ j.carries) !== j.sum) fail(`${tag} carries i=${p.i}`); });
    api.traceSpeckEnc(x, y, rk, n).forEach((r, i) => { const p = c.rounds[i];
      eq(`${tag} round ${i+1}`, [r.rorx, r.sum, r.roly, r.nx, r.ny].map(H).join(), [p.rorx, p.sum, p.roly, p.x, p.y].join()); checked += 5;
      if ((r.rorx ^ x ^ r.carries) === undefined) fail("x"); });
    api.traceSpeckDec(cx, cy, rk, n).forEach((s, i) => { const p = c.decsteps[i];
      eq(`${tag} dec ${i+1}`, [s.xy, s.xk, s.masked, s.nx, s.ny].map(H).join(), [p.xy, p.xk, p.diff, p.x, p.y].join()); checked += 5;
      const w = api.MASK(n + 1);
      if (((s.xk - s.ny) & w) !== ((s.xk ^ s.ny ^ s.borrows) & w)) fail(`${tag} borrows ${i+1}`); });
  }
}
for (const e of T.errors) {
  let msg = null;
  try { api._check(e.words.map(BigInt), e.n, e.table === "SIMON" ? api.SIMON : api.SPECK, ...e.block.map(BigInt)); }
  catch (err) { msg = err.message; if (err.name !== "ValueError") fail("not a ValueError"); }
  eq(`_check ${JSON.stringify(e)}`, msg, e.msg); checked++;
}
const res = api.run_tests();
const pyOut = "SIMON32/64   OK,SIMON48/72   OK,SIMON48/96   OK,SIMON64/96   OK,SIMON64/128  OK,SIMON96/96   OK,SIMON96/144  OK,SIMON128/128  OK,SIMON128/192  OK,SIMON128/256  OK,SPECK32/64   OK,SPECK48/72   OK,SPECK48/96   OK,SPECK64/96   OK,SPECK64/128  OK,SPECK96/96   OK,SPECK96/144  OK,SPECK128/128  OK,SPECK128/192  OK,SPECK128/256  OK";
eq("printed output", res.map(r => r.line).join(), pyOut);
eq("tracers agree", api.checkTracers().join(), "");
console.log(`${T.cases.length} cases, ${checked} intermediate values and error messages compared, ${res.filter(r => r.ok).length}/20 vectors OK, ${fails} failures`);
process.exit(fails ? 1 : 0);
