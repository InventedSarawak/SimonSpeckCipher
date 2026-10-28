# SIMON and SPECK: Lightweight Block Ciphers

A complete implementation of the paper in [`dsy-paper.pdf`](dsy-paper.pdf)
([IACR ePrint 2013/404](https://eprint.iacr.org/2013/404)):

> R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks, L. Wingers.
> *The SIMON and SPECK Families of Lightweight Block Ciphers.* National Security Agency, 2013.

All 20 variants (10 SIMON, 10 SPECK) are implemented in pure Python 3 with no
dependencies, and every one is checked against the official test vectors in
the paper's appendices. The repository also contains an interactive web page
that walks through the reference code step by step, and long-form notes on the
paper in [`docs/simon-speck.md`](docs/simon-speck.md).

## Quick start

```bash
git clone https://github.com/InventedSarawak/SimonSpeckCipher.git
cd SimonSpeckCipher
python3 demo.py vectors        # should end with "All 20 variants match the paper"
```

There is nothing to compile and nothing to install. The library and demos are
plain Python using only the standard library, and the interactive page is a
single prebuilt HTML file. Every command below is run from the repository root.

## Requirements

| Tool | Needed for | Version |
|---|---|---|
| Python | the library, the demos and the tests | 3.10 or newer (tested on 3.10, 3.11, 3.14) |
| pytest | `python3 -m pytest` only; optional, since `unittest` works without it | any recent |
| A web browser | opening the interactive page | any modern browser |
| Bash and Node.js | rebuilding the page and checking it (`frontend/build.sh`, `frontend/test/run.sh`) | Node 18 or newer |
| Chromium | the headless browser test (`frontend/test/browser.mjs`) | Node 22 or newer, `chromium` on your `PATH` |

Check your Python version with `python3 --version`. On Windows, type `python`
or `py` wherever this README says `python3`, and run the `.sh` scripts from Git
Bash or WSL.

## Running the demos

`demo.py` is the command-line entry point. `python3 demo.py --help` lists the
commands, and `python3 demo.py <command> --help` shows the options for one.
Wherever a command takes a variant, it accepts any of the 20 names:
`simon32/64`, `simon48/72`, `simon48/96`, `simon64/96`, `simon64/128`,
`simon96/96`, `simon96/144`, `simon128/128`, `simon128/192`, `simon128/256`,
and the same ten sizes for `speck`.

A suggested order for presenting:

1. **`python3 demo.py vectors`**: all 20 variants reproduce the paper's ciphertexts and decrypt back. This proves the implementation is correct. Add `-v` to also print each key, plaintext and expected ciphertext.
2. **`python3 demo.py trace speck32/64`** and **`trace simon32/64`**: the round keys and the `(x, y)` state after every round, ending in the paper's ciphertext. Note how few rounds SPECK needs (22 vs 32). `--key` and `--plaintext` accept your own hex values.
3. **`python3 demo.py avalanche simon64/128`**: flip one plaintext bit, then count changed bits after each round over many random keys. The curve climbs to the ideal 50%. The demo marks the round where every output bit first depends on every input bit: 9 of 44 for SIMON64/128, and 5 of 27 for SPECK64/128. The remaining rounds are there because real attacks (differential, linear) reach well past full diffusion. Options: `--trials N` (default 50), `--seed N` and `--all` to print every round.
4. **`python3 demo.py ecb`**: a padlock image with one pixel per block is encrypted in ECB, CBC and CTR. Under ECB the picture is still visible (only 2 distinct ciphertext blocks). Under CBC and CTR it becomes noise. A block cipher alone is not an encryption scheme; the mode matters. Takes an optional variant (default `speck64/128`) and `--key`.
5. **`python3 demo.py encrypt speck128/128 --mode ctr --text "hello"`**: encrypts real data with a random key, which is printed. `decrypt` reverses it (see below).
6. **`python3 demo.py bench`**: SPECK is about 2–3× faster than SIMON in software here, which matches the paper's claim. These are pure-Python timings; the paper's absolute numbers come from AVR assembly and C. `--blocks N` sets how many blocks to time (default 2000).

### Encrypting and decrypting your own data

The key is given in hex and must be exactly the variant's key size: 32 hex
digits for a 128-bit key, 64 for a 256-bit key, and so on. If you leave out
`--key`, `encrypt` generates a random key and prints it to stderr. `--mode` is
`ecb`, `cbc` (the default) or `ctr`, and you must decrypt with the same mode
and key you encrypted with.

```bash
KEY=000102030405060708090a0b0c0d0e0f        # 128-bit key, for speck128/128

# Text in, hex out. CBC and CTR use a random IV, so the hex differs every run.
python3 demo.py encrypt speck128/128 --key $KEY --mode ctr --text "hello, world"

# Hex in, text out. Paste the hex printed by the previous command.
python3 demo.py decrypt speck128/128 --key $KEY --mode ctr --hex <ciphertext-hex>

# Both commands also read from stdin, so they can be piped together.
echo -n "hello, world" | python3 demo.py encrypt speck128/128 --key $KEY \
                       | python3 demo.py decrypt speck128/128 --key $KEY

# Files: --in reads raw input, --out writes raw output.
python3 demo.py encrypt speck128/128 --key $KEY --in notes.txt --out notes.enc
python3 demo.py decrypt speck128/128 --key $KEY --in notes.enc --out notes.txt
```

## Running the tests

```bash
python3 -m unittest discover -s tests     # standard library only
python3 -m pytest                         # same tests, if pytest is installed (pip install pytest)
```

The tests check the 20 paper vectors, regenerate the `z` constants from the
paper's LFSR matrices, run a transcription of the paper's Appendix A C code,
round-trip the ECB/CBC/CTR modes, and smoke-test every demo command.

## The interactive page

[`frontend/index.html`](frontend/index.html) is a self-contained page that
explains [`frontend/ref.py`](frontend/ref.py), a compact reference version of
both ciphers, chapter by chapter: inputs, rotations, round keys, one round, all
rounds, decryption, testing, why so many rounds are needed, and modes of
operation. You can pick any of the 20 variants, enter your own key and
plaintext, and step through the code with a debugger.

To use it, open the file in a browser. It runs offline from disk and needs no
web server:

```bash
xdg-open frontend/index.html      # Linux
open frontend/index.html          # macOS
start frontend\index.html         # Windows
```

`index.html` is generated from the files in `frontend/src/` and
`frontend/ref.py`. If you edit those, rebuild and check the page:

```bash
./frontend/build.sh               # joins frontend/src/ and ref.py into index.html
./frontend/test/run.sh            # rebuild, then compare every intermediate value the page's
                                  # JavaScript computes with ref.py (about 50,000 values)
node frontend/test/browser.mjs    # drive headless Chromium through every chapter for all
                                  # 20 variants; pass a directory to keep the screenshots
```

`run.sh` should end with `0 failures`, and `browser.mjs` with
`no console errors, all checks passed`.

## Using the library

```python
from simonspeck import new, modes

cipher = new("speck64/128", bytes.fromhex("1b1a1918131211100b0a090803020100"))
cipher.encrypt_words(0x3b726574, 0x7475432d)       # (0x8c6fa548, 0x454e028b), as in the paper
cipher.encrypt_block(bytes.fromhex("3b7265747475432d")).hex()

ct = modes.encrypt(cipher, b"any length message", mode="cbc")   # random IV prefixed
modes.decrypt(cipher, ct, mode="cbc")
```

Run this from the repository root, or add the root to `PYTHONPATH`, so that
`simonspeck` can be imported.

## Project layout

```
simonspeck/
  common.py    rotations + BlockCipher base class (word API, byte API, round trace)
  simon.py     SIMON: LFSR matrices, z constants, key schedule, round function
  speck.py     SPECK: key schedule, round function
  modes.py     ECB / CBC / CTR modes + PKCS#7 padding (not in the paper; needed for real messages)
  vectors.py   the 20 official test vectors (Appendices B and C)
demo.py        command-line demonstrations
tests/         unit tests (paper vectors, LFSR constants, Appendix A code, modes, CLI)
frontend/
  index.html   the interactive page (built; open this one)
  ref.py       compact reference implementation that the page explains
  src/         page sources, joined by build.sh
  test/        trace.py + verify.mjs (JavaScript vs Python), browser.mjs (headless Chromium)
docs/          long-form notes on the paper, with diagrams and charts
dsy-paper.pdf  the original paper
```

---

## Why these ciphers exist

Devices such as RFID tags, sensors and medical implants are tiny. The hardware
literature caps "lightweight" at about 2000 gate equivalents (GE), and even the
smallest AES needs about 2400 GE. Earlier lightweight ciphers were usually tuned
for one platform: PRESENT is good in hardware but slow on microcontrollers, for
example. The NSA designed two families that perform well on **both**:

| | SIMON | SPECK |
|---|---|---|
| Tuned for | hardware (ASIC) | software (microcontrollers) |
| Operations | AND, XOR, rotation | addition mod 2ⁿ, rotation, XOR ("ARX") |
| Source of non-linearity | bitwise AND | carries in modular addition |
| Structure | Feistel | ARX, can be split into two Feistel-like steps |

Each family supports block sizes of 32, 48, 64, 96 and 128 bits. A block is
**2n bits**, held as two n-bit words `(x, y)`. The key is **m words** (mn bits).
A variant is named `block/key`, so SIMON64/128 has a 64-bit block and a 128-bit key.

| block 2n | word n | key sizes mn | SIMON rounds (const) | SPECK rounds |
|---|---|---|---|---|
| 32 | 16 | 64 | 32 (z0) | 22 |
| 48 | 24 | 72, 96 | 36 (z0), 36 (z1) | 22, 23 |
| 64 | 32 | 96, 128 | 42 (z2), 44 (z3) | 26, 27 |
| 96 | 48 | 96, 144 | 52 (z2), 54 (z3) | 28, 29 |
| 128 | 64 | 128, 192, 256 | 68 (z2), 69 (z3), 72 (z4) | 32, 33, 34 |

Notation: `S^j` is a left rotation by j bits and `S^-j` a right rotation, `⊕` is XOR,
`&` is AND and `+` is addition mod 2ⁿ.

## SIMON (paper §3)

### Round function
```
f(x)       = (S¹x & S⁸x) ⊕ S²x
R_k(x, y)  = (y ⊕ f(x) ⊕ k,  x)
```
Each round passes the left word through `f`, mixes it into the right word along
with the round key, and swaps the two words. This is a classic **Feistel**
round, so it is invertible whatever `f` is:
```
R_k⁻¹(x, y) = (y,  x ⊕ f(y) ⊕ k)
```
Encryption applies `R_{k[0]}` through `R_{k[T-1]}`. Decryption applies the
inverse rounds with the keys in reverse order. The only non-linear operation is
the AND of two rotated copies, which is cheap in hardware (one AND gate per bit)
and easy to serialize bit by bit. This is why SIMON fits in as little as 523 GE.

### Key schedule
The first m round keys are the key words themselves, with `k[0]` the rightmost.
Each later key comes from a linear recurrence:
```
tmp  = S⁻³ k[i-1]
if m == 4:  tmp ^= k[i-3]
tmp ^= S⁻¹ tmp
k[i] = ~k[i-m] ⊕ tmp ⊕ z_j[(i-m) mod 62] ⊕ 3          (~k ⊕ 3  =  k ⊕ 0xff…fc)
```
Apart from its round key, every round is identical, and the operations treat all
bit positions the same way. Without help, that would make the cipher vulnerable
to **slide attacks** and give it **rotational symmetry**. Two constants break
both:
- `c = 2ⁿ − 4 = 0xff…fc`, which is XORed into every new round key.
- `z_j`, one of five fixed bit sequences. Variants with the same block size use
  different sequences, so they stay cryptographically separate.

The sequences `u`, `v` and `w` have period 31 and come from 5-bit LFSRs (the
matrices U, V and W in §3.2). Then `z0 = u`, `z1 = v`, and `z2, z3, z4` are
`u, v, w` XORed with `0101…`, giving period 62. The test suite regenerates all
five sequences from the matrices and checks them against the constants.

## SPECK (paper §4)

### Round function
```
x  = (S^-α x + y) ⊕ k
y  = S^β y ⊕ x
```
`(α, β) = (7, 2)` for SPECK32 and `(8, 3)` for all other block sizes. All the
non-linearity comes from the carries in `+`, which is a single instruction on
any CPU. That is why SPECK is so fast in software: one round costs about 3
instructions per word. The inverse uses subtraction:
```
y  = S^-β (x ⊕ y)
x  = S^α ((x ⊕ k) − y)
```

### Key schedule
The key is read as `K = (l[m-2], …, l[0], k[0])`. The key schedule **reuses the
round function**, with the round number `i` playing the part of the round key:
```
l[i+m-1] = (k[i] + S^-α l[i]) ⊕ i
k[i+1]   = S^β k[i] ⊕ l[i+m-1]
```
Round keys can therefore be generated on the fly with no extra code. Appendix A
of the paper shows a five-line C routine whose loop does both in one line, and
the tests run a transcription of that routine.

## Implementation notes

- **Word and byte order.** The paper prints keys as `k[m-1] … k[0]` and blocks as `x y`, most-significant first. This code reads keys and blocks big-endian in exactly that order, so the paper's hex can be pasted in directly. Some other libraries, such as those following the NSA's later implementation guide, load bytes little-endian. Their byte-level output then differs, even though the algorithm is identical.
- **Word-level API** (`encrypt_words`, `decrypt_words`, `encrypt_trace`): this is the algorithm exactly as specified, operating on n-bit integers.
- **Decryption.** SIMON uses the Feistel inverse. SPECK inverts each step, with subtraction undoing addition. The paper's hardware and AVR figures are encrypt-only, but this implementation includes both directions.

## Security notes

- The paper targets security against standard adaptive chosen-plaintext and chosen-ciphertext adversaries, and against related-key attacks. It states that SIMON and SPECK were **not** evaluated as hash functions or in the open-key model (§2).
- Small blocks have small data limits. With a 32-bit block, CBC and CTR start leaking information after about 2¹⁶ blocks (256 KB) under one key, because of the birthday bound. The paper argues that lightweight devices encrypt very little data, but this still matters in practice.
- Context: published cryptanalysis breaks reduced-round versions, but none of it breaks the full-round ciphers. Even so, adoption has been controversial. In 2018, ISO/IEC dropped SIMON and SPECK from standardization after objections from several national bodies, partly over the limited design rationale. SPECK was also added to the Linux kernel in 2018 and removed later that year. This project is for study and demonstration, not for protecting real data.
