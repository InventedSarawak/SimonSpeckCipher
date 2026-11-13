/**
 * SIMON and SPECK in TypeScript, a line-for-line port of the project's
 * Python library (simonspeck/). Words are BigInt so every block size,
 * up to 128 bits, uses the same code.
 *
 * Conventions match the paper: keys are written k[m-1] ... k[0] and blocks
 * x y, most-significant word first.
 */

export type Family = "simon" | "speck";

export interface Variant {
  id: string; // e.g. "simon32/64"
  family: Family;
  block: number; // 2n bits
  key: number; // mn bits
  n: number; // word size
  m: number; // key words
  rounds: number;
}

const SIZES: [number, number][] = [
  [32, 64], [48, 72], [48, 96], [64, 96], [64, 128],
  [96, 96], [96, 144], [128, 128], [128, 192], [128, 256],
];

const SIMON_PARAMS: Record<string, [number, number]> = {
  "32/64": [32, 0], "48/72": [36, 0], "48/96": [36, 1], "64/96": [42, 2], "64/128": [44, 3],
  "96/96": [52, 2], "96/144": [54, 3], "128/128": [68, 2], "128/192": [69, 3], "128/256": [72, 4],
};

const SPECK_ROUNDS: Record<string, number> = {
  "32/64": 22, "48/72": 22, "48/96": 23, "64/96": 26, "64/128": 27,
  "96/96": 28, "96/144": 29, "128/128": 32, "128/192": 33, "128/256": 34,
};

/** The five constant sequences z0..z4 of SIMON (paper, Figure 3.3). */
export const Z = [
  "11111010001001010110000111001101111101000100101011000011100110",
  "10001110111110010011000010110101000111011111001001100001011010",
  "10101111011100000011010010011000101000010001111110010110110011",
  "11011011101011000110010111100000010010001010011100110100001111",
  "11010001111001101011011000100000010111000011001010010011101111",
];

export const VARIANTS: Variant[] = (["simon", "speck"] as Family[]).flatMap((family) =>
  SIZES.map(([block, key]) => {
    const size = `${block}/${key}`;
    const n = block / 2;
    return {
      id: `${family}${size}`,
      family,
      block,
      key,
      n,
      m: key / n,
      rounds: family === "simon" ? SIMON_PARAMS[size][0] : SPECK_ROUNDS[size],
    };
  }),
);

export function getVariant(id: string): Variant {
  const v = VARIANTS.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown variant ${id}`);
  return v;
}

export const prettyName = (id: string) => id.toUpperCase();

// ---------------------------------------------------------------- word helpers

export const maskOf = (n: number) => (1n << BigInt(n)) - 1n;

export function rotl(x: bigint, r: number, n: number): bigint {
  return ((x << BigInt(r)) | (x >> BigInt(n - r))) & maskOf(n);
}

export function rotr(x: bigint, r: number, n: number): bigint {
  return ((x >> BigInt(r)) | (x << BigInt(n - r))) & maskOf(n);
}

// ---------------------------------------------------------------- SIMON

export function simonF(x: bigint, n: number): bigint {
  return (rotl(x, 1, n) & rotl(x, 8, n)) ^ rotl(x, 2, n);
}

function simonKeys(v: Variant, keyWords: bigint[]): bigint[] {
  const { n, m } = v;
  const [rounds, j] = SIMON_PARAMS[`${v.block}/${v.key}`];
  const c = maskOf(n) ^ 3n;
  const k = [...keyWords];
  for (let i = m; i < rounds; i++) {
    let tmp = rotr(k[i - 1], 3, n);
    if (m === 4) tmp ^= k[i - 3];
    tmp ^= rotr(tmp, 1, n);
    const z = BigInt(Z[j][(i - m) % 62]);
    k.push(c ^ z ^ k[i - m] ^ tmp);
  }
  return k;
}

// ---------------------------------------------------------------- SPECK

export const speckAB = (block: number): [number, number] => (block === 32 ? [7, 2] : [8, 3]);

function speckRound(x: bigint, y: bigint, k: bigint, v: Variant): [bigint, bigint] {
  const [a, b] = speckAB(v.block);
  const nx = ((rotr(x, a, v.n) + y) & maskOf(v.n)) ^ k;
  const ny = rotl(y, b, v.n) ^ nx;
  return [nx, ny];
}

function speckInvRound(x: bigint, y: bigint, k: bigint, v: Variant): [bigint, bigint] {
  const [a, b] = speckAB(v.block);
  const mask = maskOf(v.n);
  const ny = rotr(x ^ y, b, v.n);
  const nx = rotl(((x ^ k) - ny + mask + 1n) & mask, a, v.n);
  return [nx, ny];
}

function speckKeys(v: Variant, keyWords: bigint[]): bigint[] {
  const k = [keyWords[0]];
  const l = keyWords.slice(1);
  for (let i = 0; i < v.rounds - 1; i++) {
    const [nl, nk] = speckRound(l[i], k[i], BigInt(i), v);
    l.push(nl);
    k.push(nk);
  }
  return k;
}

// ---------------------------------------------------------------- public API

export interface Cipher {
  variant: Variant;
  roundKeys: bigint[];
  encrypt(x: bigint, y: bigint): [bigint, bigint];
  decrypt(x: bigint, y: bigint): [bigint, bigint];
  trace(x: bigint, y: bigint): [bigint, bigint][];
  encryptBlock(p: bigint): bigint;
  decryptBlock(c: bigint): bigint;
}

export function makeCipher(variantId: string, key: bigint): Cipher {
  const v = getVariant(variantId);
  const mask = maskOf(v.n);
  const N = BigInt(v.n);
  const keyWords = Array.from({ length: v.m }, (_, i) => (key >> BigInt(v.n * i)) & mask);
  const roundKeys = v.family === "simon" ? simonKeys(v, keyWords) : speckKeys(v, keyWords);

  const round = (x: bigint, y: bigint, k: bigint): [bigint, bigint] =>
    v.family === "simon" ? [y ^ simonF(x, v.n) ^ k, x] : speckRound(x, y, k, v);
  const inv = (x: bigint, y: bigint, k: bigint): [bigint, bigint] =>
    v.family === "simon" ? [y, x ^ simonF(y, v.n) ^ k] : speckInvRound(x, y, k, v);

  const encrypt = (x: bigint, y: bigint): [bigint, bigint] => {
    for (const k of roundKeys) [x, y] = round(x, y, k);
    return [x, y];
  };
  const decrypt = (x: bigint, y: bigint): [bigint, bigint] => {
    for (let i = roundKeys.length - 1; i >= 0; i--) [x, y] = inv(x, y, roundKeys[i]);
    return [x, y];
  };

  return {
    variant: v,
    roundKeys,
    encrypt,
    decrypt,
    trace(x, y) {
      const states: [bigint, bigint][] = [[x, y]];
      for (const k of roundKeys) {
        [x, y] = round(x, y, k);
        states.push([x, y]);
      }
      return states;
    },
    encryptBlock(p) {
      const [x, y] = encrypt(p >> N, p & mask);
      return (x << N) | y;
    },
    decryptBlock(c) {
      const [x, y] = decrypt(c >> N, c & mask);
      return (x << N) | y;
    },
  };
}

// ---------------------------------------------------------------- hex helpers

/** Format an n-bit word as zero-padded hex. */
export const hexWord = (w: bigint, n: number) => w.toString(16).padStart(n / 4, "0");

/** Parse paper-style hex ("1918 1110 0908 0100"); throws a friendly error. */
export function parseHex(text: string, bits: number, label: string): bigint {
  const clean = text.replace(/\s+/g, "").toLowerCase();
  const digits = bits / 4;
  if (!/^[0-9a-f]*$/.test(clean)) throw new Error(`${label}: only the characters 0–9 and a–f are allowed.`);
  if (clean.length !== digits)
    throw new Error(`${label}: needs exactly ${digits} hex digits (${bits} bits). You typed ${clean.length}.`);
  return BigInt("0x" + clean);
}

/** Split a value into space-separated n-bit words, like the paper prints it. */
export function spacedHex(value: bigint, totalBits: number, n: number): string {
  const words: string[] = [];
  for (let i = totalBits / n - 1; i >= 0; i--) words.push(hexWord((value >> BigInt(i * n)) & maskOf(n), n));
  return words.join(" ");
}

export function popcount(x: bigint): number {
  let c = 0;
  while (x) {
    x &= x - 1n;
    c++;
  }
  return c;
}

// ---------------------------------------------------------------- paper test vectors (Appendices B, C)

export const TEST_VECTORS: Record<string, { key: string; plaintext: string; ciphertext: string }> = {
  "simon32/64": { key: "1918 1110 0908 0100", plaintext: "6565 6877", ciphertext: "c69b e9bb" },
  "simon48/72": { key: "121110 0a0908 020100", plaintext: "612067 6e696c", ciphertext: "dae5ac 292cac" },
  "simon48/96": { key: "1a1918 121110 0a0908 020100", plaintext: "726963 20646e", ciphertext: "6e06a5 acf156" },
  "simon64/96": { key: "13121110 0b0a0908 03020100", plaintext: "6f722067 6e696c63", ciphertext: "5ca2e27f 111a8fc8" },
  "simon64/128": { key: "1b1a1918 13121110 0b0a0908 03020100", plaintext: "656b696c 20646e75", ciphertext: "44c8fc20 b9dfa07a" },
  "simon96/96": { key: "0d0c0b0a0908 050403020100", plaintext: "2072616c6c69 702065687420", ciphertext: "602807a462b4 69063d8ff082" },
  "simon96/144": { key: "151413121110 0d0c0b0a0908 050403020100", plaintext: "746168742074 73756420666f", ciphertext: "ecad1c6c451e 3f59c5db1ae9" },
  "simon128/128": { key: "0f0e0d0c0b0a0908 0706050403020100", plaintext: "6373656420737265 6c6c657661727420", ciphertext: "49681b1e1e54fe3f 65aa832af84e0bbc" },
  "simon128/192": { key: "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", plaintext: "206572656874206e 6568772065626972", ciphertext: "c4ac61effcdc0d4f 6c9c8d6e2597b85b" },
  "simon128/256": { key: "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", plaintext: "74206e69206d6f6f 6d69732061207369", ciphertext: "8d2b5579afc8a3a0 3bf72a87efe7b868" },
  "speck32/64": { key: "1918 1110 0908 0100", plaintext: "6574 694c", ciphertext: "a868 42f2" },
  "speck48/72": { key: "121110 0a0908 020100", plaintext: "20796c 6c6172", ciphertext: "c049a5 385adc" },
  "speck48/96": { key: "1a1918 121110 0a0908 020100", plaintext: "6d2073 696874", ciphertext: "735e10 b6445d" },
  "speck64/96": { key: "13121110 0b0a0908 03020100", plaintext: "74614620 736e6165", ciphertext: "9f7952ec 4175946c" },
  "speck64/128": { key: "1b1a1918 13121110 0b0a0908 03020100", plaintext: "3b726574 7475432d", ciphertext: "8c6fa548 454e028b" },
  "speck96/96": { key: "0d0c0b0a0908 050403020100", plaintext: "65776f68202c 656761737520", ciphertext: "9e4d09ab7178 62bdde8f79aa" },
  "speck96/144": { key: "151413121110 0d0c0b0a0908 050403020100", plaintext: "656d6974206e 69202c726576", ciphertext: "2bf31072228a 7ae440252ee6" },
  "speck128/128": { key: "0f0e0d0c0b0a0908 0706050403020100", plaintext: "6c61766975716520 7469206564616d20", ciphertext: "a65d985179783265 7860fedf5c570d18" },
  "speck128/192": { key: "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", plaintext: "7261482066656968 43206f7420746e65", ciphertext: "1be4cf3a13135566 f9bc185de03c1886" },
  "speck128/256": { key: "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", plaintext: "65736f6874206e49 202e72656e6f6f70", ciphertext: "4109010405c0f53e 4eeeb48d9c188f43" },
};

/** Encrypt the paper's vector for a variant and report whether it matches. */
export function checkVector(id: string) {
  const v = getVariant(id);
  const tv = TEST_VECTORS[id];
  const c = makeCipher(id, parseHex(tv.key, v.key, "key"));
  const p = parseHex(tv.plaintext, v.block, "plaintext");
  const got = c.encryptBlock(p);
  return {
    got,
    ok: got === parseHex(tv.ciphertext, v.block, "ciphertext"),
    roundTrip: c.decryptBlock(got) === p,
  };
}
