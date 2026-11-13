"""Precompute avalanche curves for all 20 variants with the project's Python library.

Run from the repository root:  python3 Project-crypto/scripts/avalanche.py
Writes Project-crypto/src/data/avalanche.json (same method as `demo.py avalanche`).
"""
import json, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from simonspeck import new  # noqa: E402

TRIALS, SEED = 50, 0
SIZES = [(32, 64), (48, 72), (48, 96), (64, 96), (64, 128), (96, 96), (96, 144), (128, 128), (128, 192), (128, 256)]

out = []
for family in ("simon", "speck"):
    for block, key in SIZES:
        name = f"{family}{block}/{key}"
        rng = random.Random(SEED)
        n = block // 2
        full = (1 << block) - 1
        totals, reach, samples = None, None, 0
        for _ in range(TRIALS):
            c = new(name, rng.getrandbits(key))
            p = rng.getrandbits(block)
            base = [(x << n) | y for x, y in c.encrypt_trace(p >> n, p & ((1 << n) - 1))]
            if totals is None:
                totals = [0] * len(base)
                reach = [[0] * len(base) for _ in range(block)]
            for bit in range(block):
                q = p ^ (1 << bit)
                for r, (x, y) in enumerate(c.encrypt_trace(q >> n, q & ((1 << n) - 1))):
                    d = base[r] ^ ((x << n) | y)
                    totals[r] += bin(d).count("1")
                    reach[bit][r] |= d
                samples += 1
        rounds = len(totals) - 1
        full_round = next(r for r in range(rounds + 1) if all(reach[b][r] == full for b in range(block)))
        out.append({
            "variant": name, "family": family, "block": block, "key": key, "rounds": rounds,
            "fullDiffusionRound": full_round,
            "percent": [round(100 * t / samples / block, 2) for t in totals],
        })
        print(name, full_round, "/", rounds, f"{full_round / rounds:.0%}")

(ROOT / "Project-crypto/src/data/avalanche.json").write_text(json.dumps(out))
