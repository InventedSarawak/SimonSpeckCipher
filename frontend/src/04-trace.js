"use strict";
// Instrumented copies of the loops in ref.py. They do the same arithmetic but also record every
// intermediate value the page draws. checkTracers() confirms they agree with the plain functions.

const MASK = n => (1n << BigInt(n)) - 1n;
const speckAB = n => (n === 16 ? [7, 2] : [8, 3]);

// simon_round_keys, lines 28-33
function traceSimonKeys(key, n) {
  const m = key.length, [T, j] = SIMON.get(`${n},${m}`), mask = MASK(n);
  const k = [...key], iters = [];
  for (let i = m; i < T; i++) {
    const it = { i, km1: k[i - 1], kim: k[i - m] };
    let tmp = ror(k[i - 1], 3, n);                       // 29
    it.tmp29 = tmp;
    if (m === 4) { it.km3 = k[i - 3]; tmp ^= k[i - 3]; it.tmp31 = tmp; }   // 30-31
    it.pre32 = tmp; it.ror1 = ror(tmp, 1, n);
    tmp ^= it.ror1;                                      // 32
    it.tmp32 = tmp;
    it.notk = ~k[i - m] & mask;                          // 33, term by term
    it.zidx = (i - m) % 62;
    it.zbit = BigInt(Z[j][it.zidx]);
    it.out = it.notk ^ tmp ^ it.zbit ^ 3n;
    k.push(it.out);
    iters.push(it);
  }
  return { m, T, j, mask, k, iters };
}

// speck_round_keys, lines 56-58
function traceSpeckKeys(key, n) {
  const m = key.length, T = SPECK.get(`${n},${m}`), mask = MASK(n), [a, b] = speckAB(n);
  const k = [key[0]], l = key.slice(1), iters = [];
  for (let i = 0; i < T - 1; i++) {
    const it = { i, ki: k[i], li: l[i] };
    it.rorl = ror(l[i], a, n);                           // 57, piece by piece
    it.sum = k[i] + it.rorl;
    it.carries = it.sum ^ k[i] ^ it.rorl;                // bit p = carry into bit p
    it.masked = it.sum & mask;
    it.lnew = it.masked ^ BigInt(i);
    l.push(it.lnew);
    it.rolk = rol(k[i], b, n);                           // 58
    it.knew = it.rolk ^ l[i + m - 1];
    k.push(it.knew);
    iters.push(it);
  }
  return { m, T, a, b, mask, k, l, iters };
}

// simon_encrypt, lines 40-41 (with simon_f, line 36, opened up)
function traceSimonEnc(x, y, rk, n) {
  return rk.map((k, idx) => {
    const r = { r: idx + 1, k, x, y };
    r.s1 = rol(x, 1, n); r.s8 = rol(x, 8, n); r.and = r.s1 & r.s8; r.s2 = rol(x, 2, n);
    r.f = r.and ^ r.s2;
    [x, y] = [y ^ r.f ^ k, x];
    r.nx = x; r.ny = y;
    return r;
  });
}

// speck_encrypt, lines 64-66
function traceSpeckEnc(x, y, rk, n) {
  const [a, b] = speckAB(n), mask = MASK(n);
  return rk.map((k, idx) => {
    const r = { r: idx + 1, k, x, y };
    r.rorx = ror(x, a, n); r.sum = r.rorx + y; r.carries = r.sum ^ r.rorx ^ y; r.masked = r.sum & mask;
    x = r.masked ^ k; r.nx = x;                          // 65
    r.roly = rol(y, b, n); y = r.roly ^ x; r.ny = y;     // 66
    return r;
  });
}

// simon_decrypt, lines 46-47
function traceSimonDec(x, y, rk, n) {
  const T = rk.length;
  return [...rk].reverse().map((k, idx) => {
    const s = { s: idx + 1, kidx: T - 1 - idx, k, x, y };
    s.s1 = rol(y, 1, n); s.s8 = rol(y, 8, n); s.and = s.s1 & s.s8; s.s2 = rol(y, 2, n);
    s.f = s.and ^ s.s2;
    [x, y] = [y, x ^ s.f ^ k];
    s.nx = x; s.ny = y;
    return s;
  });
}

// speck_decrypt, lines 72-74
function traceSpeckDec(x, y, rk, n) {
  const [a, b] = speckAB(n), mask = MASK(n), T = rk.length;
  return [...rk].reverse().map((k, idx) => {
    const s = { s: idx + 1, kidx: T - 1 - idx, k, x, y };
    s.xy = x ^ y; y = ror(s.xy, b, n); s.ny = y;                       // 73
    s.xk = x ^ k; s.diff = s.xk - y;                                   // 74, piece by piece
    s.borrows = (s.diff & MASK(n + 1)) ^ s.xk ^ y;                     // bit p = borrow into bit p
    s.masked = s.diff & mask;
    x = rol(s.masked, a, n); s.nx = x;
    return s;
  });
}

// Fast whole-block helpers for chapters 10 and 11: same loops, round keys computed once.
function statesWith(cipher, x, y, rk, n) {
  const out = [[x, y]];
  if (cipher === "simon") {
    for (const k of rk) { [x, y] = [y ^ simon_f(x, n) ^ k, x]; out.push([x, y]); }
  } else {
    const [a, b] = speckAB(n), mask = MASK(n);
    for (const k of rk) { x = ((ror(x, a, n) + y) & mask) ^ k; y = rol(y, b, n) ^ x; out.push([x, y]); }
  }
  return out;
}
function encryptWith(cipher, x, y, rk, n) {
  if (cipher === "simon") {
    for (const k of rk) [x, y] = [y ^ simon_f(x, n) ^ k, x];
  } else {
    const [a, b] = speckAB(n), mask = MASK(n);
    for (const k of rk) { x = ((ror(x, a, n) + y) & mask) ^ k; y = rol(y, b, n) ^ x; }
  }
  return [x, y];
}

// Every tracer must reproduce the plain functions exactly, for all 20 test vectors.
function checkTracers() {
  const bad = [];
  for (const cipher of ["simon", "speck"])
    for (const [n, keyText, pt] of VECTORS[cipher]) {
      const key = keyText.trim().split(/\s+/).map(w => BigInt("0x" + w)).reverse();
      const [x, y] = pt.trim().split(/\s+/).map(w => BigInt("0x" + w));
      const S = cipher === "simon";
      const rk = S ? simon_round_keys(key, n) : speck_round_keys(key, n);
      const tk = (S ? traceSimonKeys : traceSpeckKeys)(key, n).k;
      const [cx, cy] = (S ? simon_encrypt : speck_encrypt)(x, y, key, n);
      const enc = (S ? traceSimonEnc : traceSpeckEnc)(x, y, rk, n).at(-1);
      const dec = (S ? traceSimonDec : traceSpeckDec)(cx, cy, rk, n).at(-1);
      const fast = encryptWith(cipher, x, y, rk, n), st = statesWith(cipher, x, y, rk, n).at(-1);
      const ok = tk.length === rk.length && tk.every((v, i) => v === rk[i]) &&
        enc.nx === cx && enc.ny === cy && dec.nx === x && dec.ny === y &&
        fast[0] === cx && fast[1] === cy && st[0] === cx && st[1] === cy;
      if (!ok) bad.push(`${cipher.toUpperCase()}${2 * n}/${n * key.length}`);
    }
  return bad;
}
