#!/usr/bin/env python3
"""Demonstrations of the SIMON and SPECK block ciphers.

    python demo.py vectors               check all 20 test vectors from the paper
    python demo.py trace speck32/64      every round of one encryption
    python demo.py encrypt / decrypt     encrypt real text or files (ECB, CBC, CTR)
    python demo.py avalanche simon64/128 how fast one flipped bit spreads
    python demo.py ecb                   why ECB mode leaks patterns
    python demo.py bench                 SIMON vs SPECK software speed
"""

import argparse
import os
import random
import sys
import time

from simonspeck import FAMILIES, VARIANTS, modes, new, parse_variant
from simonspeck.vectors import TEST_VECTORS, hex_to_int, paper_vector

COLOR = sys.stdout.isatty() and "NO_COLOR" not in os.environ


def paint(text, code):
    return f"\033[{code}m{text}\033[0m" if COLOR else text


def bold(text):
    return paint(text, "1")


def dim(text):
    return paint(text, "2")


def green(text):
    return paint(text, "32")


def red(text):
    return paint(text, "31")


def cyan(text):
    return paint(text, "36")


def heading(text):
    print(bold(text))
    print(dim("─" * len(text)))


def words_hex(value, n, count):
    """Format an integer as `count` n-bit hex words, most significant first (paper style)."""
    mask = (1 << n) - 1
    return " ".join(f"{(value >> (n * i)) & mask:0{n // 4}x}" for i in reversed(range(count)))


def parse_hex(text):
    return int(text.replace(" ", "").replace(":", ""), 16)


def halves(cipher, value):
    return value >> cipher.n, value & cipher.mask


def joined(cipher, x, y):
    return (x << cipher.n) | y


def variant_arg(text):
    text = text.strip().lower()
    if text not in VARIANTS:
        raise argparse.ArgumentTypeError(f"unknown variant {text!r}; choose from {', '.join(VARIANTS)}")
    return text


def check(ok):
    return green("✓") if ok else red("✗")


# ---------------------------------------------------------------- vectors

def cmd_vectors(args):
    heading("Official test vectors: Appendix B (SIMON) and Appendix C (SPECK)")
    print(f"{'variant':<14}{'rounds':>7}  {'computed ciphertext':<35} enc dec")
    failures = 0
    for variant, key_hex, pt_hex, ct_hex in TEST_VECTORS:
        cipher = new(variant, hex_to_int(key_hex))
        pt, ct = hex_to_int(pt_hex), hex_to_int(ct_hex)
        got = joined(cipher, *cipher.encrypt_words(*halves(cipher, pt)))
        back = joined(cipher, *cipher.decrypt_words(*halves(cipher, ct)))
        enc_ok, dec_ok = got == ct, back == pt
        failures += not (enc_ok and dec_ok)
        print(f"{variant:<14}{cipher.rounds:>7}  {words_hex(got, cipher.n, 2):<35}  {check(enc_ok)}   {check(dec_ok)}")
        if args.verbose:
            print(dim(f"    key {key_hex}\n    pt  {pt_hex}\n    ct  {ct_hex} (paper)"))
    print()
    if failures:
        print(red(f"{failures} of {len(TEST_VECTORS)} variants FAILED"))
        return 1
    print(green(f"All {len(TEST_VECTORS)} variants match the paper, for both encryption and decryption."))
    return 0


# ---------------------------------------------------------------- trace

def cmd_trace(args):
    key_hex, pt_hex, ct_hex = paper_vector(args.variant)
    key = parse_hex(args.key) if args.key else hex_to_int(key_hex)
    pt = parse_hex(args.plaintext) if args.plaintext else hex_to_int(pt_hex)
    cipher = new(args.variant, key)
    n, m = cipher.n, cipher.m

    heading(f"{cipher.name}: {n}-bit words, {m} key words, {cipher.rounds} rounds")
    if cipher.family == "SIMON":
        print(f"round:  x' = y ⊕ f(x) ⊕ k,  y' = x      where f(x) = (S¹x & S⁸x) ⊕ S²x")
        print(f"key schedule constant sequence: z{cipher.z_index}")
    else:
        print(f"round:  x' = (S^-{cipher.alpha} x + y) ⊕ k,  y' = S^{cipher.beta} y ⊕ x'      (+ is mod 2^{n})")
    print(f"key        {words_hex(key, n, m)}")
    print(f"plaintext  {words_hex(pt, n, 2)}")
    print()

    width = n // 4
    print(f"{'round':>5}  {'round key':>{max(width, 9)}}   {'x':>{width}}  {'y':>{width}}  {dim('bits changed')}")
    states = cipher.encrypt_trace(*halves(cipher, pt))
    print(f"{'in':>5}  {'':>{max(width, 9)}}   {states[0][0]:0{width}x}  {states[0][1]:0{width}x}")
    for i, k in enumerate(cipher.round_keys):
        (px, py), (x, y) = states[i], states[i + 1]
        changed = (x ^ px).bit_count() + (y ^ py).bit_count()
        print(f"{i + 1:>5}  {f'{k:0{width}x}':>{max(width, 9)}}   {cyan(f'{x:0{width}x}')}  {y:0{width}x}  {dim(str(changed).rjust(3))}")

    ct = joined(cipher, *states[-1])
    print()
    print(f"ciphertext {bold(words_hex(ct, n, 2))}")
    if not args.key and not args.plaintext:
        print(f"paper      {ct_hex}   {check(ct == hex_to_int(ct_hex))}")
    back = joined(cipher, *cipher.decrypt_words(*states[-1]))
    print(f"decrypted  {words_hex(back, n, 2)}   {check(back == pt)}")
    return 0


# ---------------------------------------------------------------- encrypt / decrypt

def load_key(args):
    _, _, key_size = parse_variant(args.variant)
    if args.key:
        return parse_hex(args.key)
    key = int.from_bytes(os.urandom(key_size // 8), "big")
    print(f"generated random key: {key:0{key_size // 4}x}", file=sys.stderr)
    return key


def cmd_encrypt(args):
    cipher = new(args.variant, load_key(args))
    if args.text is not None:
        data = args.text.encode()
    elif args.infile:
        with open(args.infile, "rb") as f:
            data = f.read()
    else:
        data = sys.stdin.buffer.read()
    out = modes.encrypt(cipher, data, args.mode)
    if args.outfile:
        with open(args.outfile, "wb") as f:
            f.write(out)
        print(f"wrote {len(out)} bytes ({cipher.name}, {args.mode.upper()}) to {args.outfile}", file=sys.stderr)
    else:
        print(out.hex())
    return 0


def cmd_decrypt(args):
    if not args.key:
        print(red("decrypt needs --key"), file=sys.stderr)
        return 2
    cipher = new(args.variant, parse_hex(args.key))
    if args.hex is not None:
        data = bytes.fromhex(args.hex)
    elif args.infile:
        with open(args.infile, "rb") as f:
            data = f.read()
    else:
        data = bytes.fromhex(sys.stdin.read())
    try:
        out = modes.decrypt(cipher, data, args.mode)
    except ValueError as e:
        print(red(f"decryption failed: {e}"), file=sys.stderr)
        return 1
    if args.outfile:
        with open(args.outfile, "wb") as f:
            f.write(out)
        print(f"wrote {len(out)} bytes to {args.outfile}", file=sys.stderr)
    else:
        try:
            print(out.decode())
        except UnicodeDecodeError:
            print(out.hex())
    return 0


# ---------------------------------------------------------------- avalanche

def cmd_avalanche(args):
    rng = random.Random(args.seed)
    _, block_size, key_size = parse_variant(args.variant)
    full = (1 << block_size) - 1
    totals = None
    # reach[bit][r]: OR of the output differences at round r caused by flipping input `bit`
    reach = [None] * block_size
    samples = 0

    for _ in range(args.trials):
        cipher = new(args.variant, rng.getrandbits(key_size))
        p = rng.getrandbits(block_size)
        base = [joined(cipher, x, y) for x, y in cipher.encrypt_trace(*halves(cipher, p))]
        if totals is None:
            totals = [0] * len(base)
            reach = [[0] * len(base) for _ in range(block_size)]
        for bit in range(block_size):
            flipped = cipher.encrypt_trace(*halves(cipher, p ^ (1 << bit)))
            for r, state in enumerate(flipped):
                diff = base[r] ^ joined(cipher, *state)
                totals[r] += diff.bit_count()
                reach[bit][r] |= diff
            samples += 1

    rounds = len(totals) - 1
    full_round = next((r for r in range(rounds + 1) if all(reach[b][r] == full for b in range(block_size))), None)

    heading(f"Avalanche in {args.variant.upper()}: flip 1 plaintext bit, count ciphertext bits that change")
    print(dim(f"{args.trials} random keys/plaintexts × all {block_size} input bits = {samples} samples per round"))
    print(dim("ideal for a random permutation: half the block, " f"{block_size // 2} of {block_size} bits"))
    print()
    bar_width = 40
    shown_until = rounds if args.all or full_round is None else min(rounds, full_round + 3)
    for r, total in enumerate(totals):
        if shown_until < r < rounds:
            if r == shown_until + 1:
                print(dim(f"{'⋮':>9}  (rounds {r}–{rounds - 1} stay at ~50%; --all shows them)"))
            continue
        avg = total / samples
        frac = avg / block_size
        filled = round(frac * bar_width)
        bar = "█" * filled + " " * (bar_width - filled)
        half = bar_width // 2
        bar = bar[:half] + ("│" if filled <= half else bar[half]) + bar[half + 1:]
        tag = cyan(" ← every output bit now depends on every input bit") if r == full_round else ""
        print(f"round {r:>3}  {avg:6.2f} bits {frac:6.1%}  {bar}{tag}")
    print()
    if full_round is None:
        print(f"Full diffusion was not observed in {rounds} rounds with {args.trials} trials.")
    else:
        print(f"Full diffusion after {bold(str(full_round))} of {rounds} rounds.")
        print(dim("Full diffusion is only a floor: differential and linear attacks reach well past it,"))
        print(dim(f"which is why the designers chose {rounds} rounds rather than {full_round}."))
    return 0


# ---------------------------------------------------------------- ECB pattern leak

LOCK = [
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
]
GLYPHS = "@%&$#*+=?!~^:;<>{}[]()/|"


def render_cells(blocks, width):
    rows = []
    for start in range(0, len(blocks), width):
        cells = []
        for block in blocks[start:start + width]:
            value = int.from_bytes(block, "big")
            if COLOR:
                cells.append(f"\033[38;5;{16 + value % 216}m██\033[0m")
            else:
                cells.append(GLYPHS[value % len(GLYPHS)] * 2)
        rows.append("".join(cells))
    return rows


def cmd_ecb(args):
    key_hex = args.key or paper_vector(args.variant)[0]
    cipher = new(args.variant, parse_hex(key_hex))
    size = cipher.block_bytes
    pixel = {".": bytes(size), "#": b"\xff" * size}
    plaintext = b"".join(pixel[c] for row in LOCK for c in row)
    width, count = len(LOCK[0]), len(plaintext) // size
    iv = os.urandom(size)

    ciphertexts = {
        "ECB": modes.ecb_encrypt(cipher, plaintext),
        "CBC": modes.cbc_encrypt(cipher, plaintext, iv),
        "CTR": modes.ctr_crypt(cipher, plaintext, iv),
    }
    blocks = {mode: [ct[i * size:(i + 1) * size] for i in range(count)] for mode, ct in ciphertexts.items()}

    heading(f"An image encrypted with {cipher.name}: one pixel = one {size}-byte block")
    panels = [
        ("plaintext", ["".join("██" if c == "#" else "░░" for c in row) for row in LOCK]),
        ("ECB", render_cells(blocks["ECB"], width)),
        ("CBC", render_cells(blocks["CBC"], width)),
        ("CTR", render_cells(blocks["CTR"], width)),
    ]
    gap = "   "
    print(gap.join(title.center(2 * width) for title, _ in panels))
    for row in range(len(LOCK)):
        print(gap.join(rows[row] for _, rows in panels))
    print()
    for mode, bs in blocks.items():
        distinct = len(set(bs))
        verdict = red("pattern leaks") if distinct < count else green("no repeats")
        print(f"{mode}: {distinct:>3} distinct ciphertext blocks out of {count}   {verdict}")
    print()
    print("ECB encrypts equal plaintext blocks to equal ciphertext blocks, so the picture survives.")
    print("CBC chains each block into the next, and CTR encrypts a running counter, so every block differs.")
    return 0


# ---------------------------------------------------------------- benchmark

def cmd_bench(args):
    rng = random.Random(0)
    heading(f"Software speed in pure Python ({args.blocks} blocks per variant, round keys precomputed)")
    print(f"{'size':<9}{'SIMON rounds':>13}{'µs/block':>10}{'SPECK rounds':>14}{'µs/block':>10}{'SPECK speedup':>15}")
    for block_size, key_size in FAMILIES["simon"].PARAMS:
        timings = {}
        for family in FAMILIES:
            cipher = new(f"{family}{block_size}/{key_size}", rng.getrandbits(key_size))
            x, y = halves(cipher, rng.getrandbits(block_size))
            start = time.perf_counter()
            for _ in range(args.blocks):
                x, y = cipher.encrypt_words(x, y)
            timings[family] = (cipher.rounds, (time.perf_counter() - start) / args.blocks * 1e6)
        (simon_rounds, simon_us), (speck_rounds, speck_us) = timings["simon"], timings["speck"]
        print(f"{block_size}/{key_size:<{8 - len(str(block_size))}}{simon_rounds:>13}{simon_us:>10.1f}"
              f"{speck_rounds:>14}{speck_us:>10.1f}{simon_us / speck_us:>14.2f}×")
    print()
    print(dim("The paper's claim (Table 1.1, Section 7) is that SPECK is faster in software: it needs fewer"))
    print(dim("rounds, and its modular addition gives a lot of non-linearity in a single CPU instruction."))
    return 0


# ---------------------------------------------------------------- CLI

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Demonstrations of the SIMON and SPECK lightweight block ciphers.",
        epilog="variants: " + ", ".join(VARIANTS),
    )
    sub = parser.add_subparsers(dest="command", required=True, metavar="command")

    p = sub.add_parser("vectors", help="check all 20 official test vectors from the paper")
    p.add_argument("-v", "--verbose", action="store_true", help="also print key, plaintext and expected ciphertext")
    p.set_defaults(func=cmd_vectors)

    p = sub.add_parser("trace", help="show the state after every round of one encryption")
    p.add_argument("variant", type=variant_arg, help="e.g. simon32/64 or speck128/256")
    p.add_argument("--key", help="hex key (default: the paper's test key)")
    p.add_argument("--plaintext", help="hex plaintext block (default: the paper's test plaintext)")
    p.set_defaults(func=cmd_trace)

    for name, func, helptext in (("encrypt", cmd_encrypt, "encrypt text or a file"),
                                 ("decrypt", cmd_decrypt, "decrypt hex or a file")):
        p = sub.add_parser(name, help=helptext)
        p.add_argument("variant", type=variant_arg)
        p.add_argument("--key", help="hex key" + (" (default: random, printed to stderr)" if name == "encrypt" else ""))
        p.add_argument("--mode", choices=modes.MODES, default="cbc", help="mode of operation (default: cbc)")
        source = p.add_mutually_exclusive_group()
        if name == "encrypt":
            source.add_argument("--text", help="plaintext string (default: read stdin)")
        else:
            source.add_argument("--hex", help="ciphertext as hex (default: read hex from stdin)")
        source.add_argument("--in", dest="infile", help="read input from a file")
        p.add_argument("--out", dest="outfile", help="write raw output to a file")
        p.set_defaults(func=func)

    p = sub.add_parser("avalanche", help="measure how one flipped plaintext bit spreads round by round")
    p.add_argument("variant", type=variant_arg, nargs="?", default="simon64/128")
    p.add_argument("--trials", type=int, default=50, help="random keys/plaintexts to average over (default: 50)")
    p.add_argument("--seed", type=int, default=2013, help="RNG seed for reproducible numbers")
    p.add_argument("--all", action="store_true", help="print every round, not just up to full diffusion")
    p.set_defaults(func=cmd_avalanche)

    p = sub.add_parser("ecb", help="show why ECB mode leaks patterns while CBC and CTR do not")
    p.add_argument("variant", type=variant_arg, nargs="?", default="speck64/128")
    p.add_argument("--key", help="hex key (default: the paper's test key)")
    p.set_defaults(func=cmd_ecb)

    p = sub.add_parser("bench", help="compare SIMON and SPECK encryption speed")
    p.add_argument("--blocks", type=int, default=2000)
    p.set_defaults(func=cmd_bench)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
