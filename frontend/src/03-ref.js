"use strict";
// Line-for-line JavaScript translation of ref.py. The number at the end of each line is the ref.py line.
// Words are BigInt (Python ints have no size limit; JS Numbers lose precision past 53 bits).
// Sizes and counters (n, r, m, T, j, i) stay ordinary numbers, as they are small.

const Z = ["11111010001001010110000111001101111101000100101011000011100110",    // 1
           "10001110111110010011000010110101000111011111001001100001011010",    // 2
           "10101111011100000011010010011000101000010001111110010110110011",    // 3
           "11011011101011000110010111100000010010001010011100110100001111",    // 4
           "11010001111001101011011000100000010111000011001010010011101111"];   // 5

// A Python dict keyed by the tuple (n, m) becomes a Map keyed by the string "n,m".
const SIMON = new Map([["16,4", [32, 0]], ["24,3", [36, 0]], ["24,4", [36, 1]], ["32,3", [42, 2]], ["32,4", [44, 3]],     // 7
                       ["48,2", [52, 2]], ["48,3", [54, 3]], ["64,2", [68, 2]], ["64,3", [69, 3]], ["64,4", [72, 4]]]);  // 8
const SPECK = new Map([["16,4", 22], ["24,3", 22], ["24,4", 23], ["32,3", 26], ["32,4", 27],                              // 9
                       ["48,2", 28], ["48,3", 29], ["64,2", 32], ["64,3", 33], ["64,4", 34]]);                            // 10

function rol(v, r, n) { r = BigInt(r); n = BigInt(n); return ((v << r) | (v >> (n - r))) & ((1n << n) - 1n); }  // 12
function ror(v, r, n) { r = BigInt(r); n = BigInt(n); return ((v >> r) | (v << (n - r))) & ((1n << n) - 1n); }  // 13

class ValueError extends Error { constructor(msg) { super(msg); this.name = "ValueError"; } }
const pyHex = v => (v < 0n ? "-0x" + (-v).toString(16) : "0x" + v.toString(16));    // Python's f"{v:#x}"

function _check(words, n, table, ...block) {                                          // 15
  // Reject unsupported variants and values that don't fit in an n-bit word.          // 16
  if (!table.has(`${n},${words.length}`))                                             // 17
    throw new ValueError(`unsupported variant: ${n}-bit words with ${words.length} key words`);  // 18
  for (const v of [...words, ...block])                                               // 19
    if (!(0n <= v && v < (1n << BigInt(n))))                                          // 20
      throw new ValueError(`value ${pyHex(v)} does not fit in a ${n}-bit word`);      // 21
}

function simon_round_keys(key, n) {                                                   // 23
  // key = [k0, k1, ..., k_{m-1}]  (k0 is the RIGHTMOST word in the paper's test vectors)   // 24
  _check(key, n, SIMON);                                                              // 25
  const m = key.length, [T, j] = SIMON.get(`${n},${m}`), mask = (1n << BigInt(n)) - 1n;      // 26
  const k = [...key];                                                                 // 27
  for (let i = m; i < T; i++) {                                                       // 28
    let tmp = ror(k[i - 1], 3, n);                                                    // 29
    if (m === 4)                                                                      // 30
      tmp ^= k[i - 3];                                                                // 31
    tmp ^= ror(tmp, 1, n);                                                            // 32
    k.push((~k[i - m] & mask) ^ tmp ^ BigInt(Z[j][(i - m) % 62]) ^ 3n);               // 33
  }
  return k;                                                                           // 34
}

function simon_f(v, n) { return (rol(v, 1, n) & rol(v, 8, n)) ^ rol(v, 2, n); }       // 36

function simon_encrypt(x, y, key, n) {                                                // 38
  _check(key, n, SIMON, x, y);                                                        // 39
  for (const k of simon_round_keys(key, n))                                           // 40
    [x, y] = [y ^ simon_f(x, n) ^ k, x];                                              // 41
  return [x, y];                                                                      // 42
}

function simon_decrypt(x, y, key, n) {                                                // 44
  _check(key, n, SIMON, x, y);                                                        // 45
  for (const k of simon_round_keys(key, n).reverse())                                 // 46
    [x, y] = [y, x ^ simon_f(y, n) ^ k];                                              // 47
  return [x, y];                                                                      // 48
}

function speck_round_keys(key, n) {                                                   // 50
  // key = [k0, l0, l1, ..., l_{m-2}]  (k0 is the RIGHTMOST word in the paper's test vectors)   // 51
  _check(key, n, SPECK);                                                              // 52
  const m = key.length, T = SPECK.get(`${n},${m}`), mask = (1n << BigInt(n)) - 1n;    // 53
  const [a, b] = n === 16 ? [7, 2] : [8, 3];                                          // 54
  const k = [key[0]], l = key.slice(1);                                               // 55
  for (let i = 0; i < T - 1; i++) {                                                   // 56
    l.push(((k[i] + ror(l[i], a, n)) & mask) ^ BigInt(i));                            // 57
    k.push(rol(k[i], b, n) ^ l[i + m - 1]);                                           // 58
  }
  return k;                                                                           // 59
}

function speck_encrypt(x, y, key, n) {                                                // 61
  _check(key, n, SPECK, x, y);                                                        // 62
  const [a, b] = n === 16 ? [7, 2] : [8, 3], mask = (1n << BigInt(n)) - 1n;           // 63
  for (const k of speck_round_keys(key, n)) {                                         // 64
    x = ((ror(x, a, n) + y) & mask) ^ k;                                              // 65
    y = rol(y, b, n) ^ x;                                                             // 66
  }
  return [x, y];                                                                      // 67
}

function speck_decrypt(x, y, key, n) {                                                // 69
  _check(key, n, SPECK, x, y);                                                        // 70
  const [a, b] = n === 16 ? [7, 2] : [8, 3], mask = (1n << BigInt(n)) - 1n;           // 71
  for (const k of speck_round_keys(key, n).reverse()) {                               // 72
    y = ror(x ^ y, b, n);                                                             // 73
    x = rol(((x ^ k) - y) & mask, a, n);                                              // 74
  }
  return [x, y];                                                                      // 75
}

// Test vectors from Appendices B and C: (n, key words left-to-right, plaintext, ciphertext)   // 77
const VECTORS = {                                                                     // 78
 simon: [                                                                             // 79
  [16, "1918 1110 0908 0100", "6565 6877", "c69b e9bb"],
  [24, "121110 0a0908 020100", "612067 6e696c", "dae5ac 292cac"],
  [24, "1a1918 121110 0a0908 020100", "726963 20646e", "6e06a5 acf156"],
  [32, "13121110 0b0a0908 03020100", "6f722067 6e696c63", "5ca2e27f 111a8fc8"],
  [32, "1b1a1918 13121110 0b0a0908 03020100", "656b696c 20646e75", "44c8fc20 b9dfa07a"],
  [48, "0d0c0b0a0908 050403020100", "2072616c6c69 702065687420", "602807a462b4 69063d8ff082"],
  [48, "151413121110 0d0c0b0a0908 050403020100", "746168742074 73756420666f", "ecad1c6c451e 3f59c5db1ae9"],
  [64, "0f0e0d0c0b0a0908 0706050403020100", "6373656420737265 6c6c657661727420", "49681b1e1e54fe3f 65aa832af84e0bbc"],
  [64, "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "206572656874206e 6568772065626972", "c4ac61effcdc0d4f 6c9c8d6e2597b85b"],
  [64, "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "74206e69206d6f6f 6d69732061207369", "8d2b5579afc8a3a0 3bf72a87efe7b868"]],
 speck: [                                                                             // 90
  [16, "1918 1110 0908 0100", "6574 694c", "a868 42f2"],
  [24, "121110 0a0908 020100", "20796c 6c6172", "c049a5 385adc"],
  [24, "1a1918 121110 0a0908 020100", "6d2073 696874", "735e10 b6445d"],
  [32, "13121110 0b0a0908 03020100", "74614620 736e6165", "9f7952ec 4175946c"],
  [32, "1b1a1918 13121110 0b0a0908 03020100", "3b726574 7475432d", "8c6fa548 454e028b"],
  [48, "0d0c0b0a0908 050403020100", "65776f68202c 656761737520", "9e4d09ab7178 62bdde8f79aa"],
  [48, "151413121110 0d0c0b0a0908 050403020100", "656d6974206e 69202c726576", "2bf31072228a 7ae440252ee6"],
  [64, "0f0e0d0c0b0a0908 0706050403020100", "6c61766975716520 7469206564616d20", "a65d985179783265 7860fedf5c570d18"],
  [64, "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "7261482066656968 43206f7420746e65", "1be4cf3a13135566 f9bc185de03c1886"],
  [64, "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "65736f6874206e49 202e72656e6f6f70", "4109010405c0f53e 4eeeb48d9c188f43"]]};

// if __name__ == "__main__":  the test block. It returns one record per vector instead of printing.   // 102
function run_tests() {
  const ciphers = { simon: [simon_encrypt, simon_decrypt], speck: [speck_encrypt, speck_decrypt] };      // 103
  const results = [];
  for (const [name, [enc, dec]] of Object.entries(ciphers))                                              // 104
    for (const [n, key, pt, ct] of VECTORS[name]) {                                                      // 105
      const words = key.trim().split(/\s+/).map(w => BigInt("0x" + w)).reverse();     // -> [k0, k1, ...]   106
      const [x, y] = pt.trim().split(/\s+/).map(w => BigInt("0x" + w));                                  // 107
      const [cx, cy] = enc(x, y, words, n);                                                              // 108
      const got = `${cx.toString(16).padStart(n / 4, "0")} ${cy.toString(16).padStart(n / 4, "0")}`;
      const [dx, dy] = dec(cx, cy, words, n);
      const ok = got === ct && dx === x && dy === y;                                                     // 109
      const line = `${name.toUpperCase()}${2 * n}/${String(n * words.length).padEnd(4)} ${ok ? "OK" : "FAIL"}`;  // 110
      results.push({ name, n, m: words.length, key, pt, ct, got, back: dx === x && dy === y, ok, line });
    }
  return results;
}
