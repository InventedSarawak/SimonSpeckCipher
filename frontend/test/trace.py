"""Dump every intermediate value of ref.py as JSON, for checking the JavaScript port."""
import json, random, sys
sys.path.insert(0, sys.argv[1])
from ref import *  # noqa
from ref import _check

H = lambda v: format(v, "x")


def simon_ks(key, n):
    m = len(key); T, j = SIMON[(n, m)]; mask = (1 << n) - 1
    k = list(key); out = []
    for i in range(m, T):
        tmp = ror(k[i - 1], 3, n); t29 = tmp
        t31 = None
        if m == 4:
            tmp ^= k[i - 3]; t31 = tmp
        tmp ^= ror(tmp, 1, n)
        k.append((~k[i - m] & mask) ^ tmp ^ int(Z[j][(i - m) % 62]) ^ 3)
        out.append(dict(i=i, tmp29=H(t29), tmp31=None if t31 is None else H(t31), tmp32=H(tmp),
                        notk=H(~k[i - m] & mask), zbit=int(Z[j][(i - m) % 62]), out=H(k[i])))
    assert k == simon_round_keys(key, n)
    return out


def speck_ks(key, n):
    m = len(key); T = SPECK[(n, m)]; mask = (1 << n) - 1
    a, b = (7, 2) if n == 16 else (8, 3)
    k, l = [key[0]], list(key[1:]); out = []
    for i in range(T - 1):
        r = ror(l[i], a, n); s = k[i] + r
        l.append((s & mask) ^ i)
        k.append(rol(k[i], b, n) ^ l[i + m - 1])
        out.append(dict(i=i, rorl=H(r), sum=H(s), lnew=H(l[-1]), rolk=H(rol(k[i], b, n)), knew=H(k[-1])))
    assert k == speck_round_keys(key, n)
    return out


def simon_rounds(x, y, key, n):
    out = []
    for k in simon_round_keys(key, n):
        s1, s8, s2 = rol(x, 1, n), rol(x, 8, n), rol(x, 2, n)
        f = simon_f(x, n)
        x, y = y ^ f ^ k, x
        out.append(dict(s1=H(s1), s8=H(s8), andv=H(s1 & s8), s2=H(s2), f=H(f), x=H(x), y=H(y)))
    return out


def speck_rounds(x, y, key, n):
    a, b = (7, 2) if n == 16 else (8, 3); mask = (1 << n) - 1; out = []
    for k in speck_round_keys(key, n):
        r = ror(x, a, n); s = r + y
        x = (s & mask) ^ k
        ry = rol(y, b, n)
        y = ry ^ x
        out.append(dict(rorx=H(r), sum=H(s), roly=H(ry), x=H(x), y=H(y)))
    return out


def simon_dec(x, y, key, n):
    out = []
    for k in reversed(simon_round_keys(key, n)):
        f = simon_f(y, n)
        x, y = y, x ^ f ^ k
        out.append(dict(f=H(f), x=H(x), y=H(y)))
    return out


def speck_dec(x, y, key, n):
    a, b = (7, 2) if n == 16 else (8, 3); mask = (1 << n) - 1; out = []
    for k in reversed(speck_round_keys(key, n)):
        xy = x ^ y
        y = ror(xy, b, n)
        xk = x ^ k
        d = (xk - y) & mask
        x = rol(d, a, n)
        out.append(dict(xy=H(xy), xk=H(xk), diff=H(d), x=H(x), y=H(y)))
    return out


def case(name, n, words, x, y):
    enc, dec = (simon_encrypt, simon_decrypt) if name == "simon" else (speck_encrypt, speck_decrypt)
    cx, cy = enc(x, y, words, n)
    rk = (simon_round_keys if name == "simon" else speck_round_keys)(words, n)
    d = dict(cipher=name, n=n, key=[H(w) for w in words], x=H(x), y=H(y), ct=[H(cx), H(cy)],
             rk=[H(v) for v in rk], dec=[H(v) for v in dec(cx, cy, words, n)])
    if name == "simon":
        d.update(ks=simon_ks(words, n), rounds=simon_rounds(x, y, words, n), decsteps=simon_dec(cx, cy, words, n))
    else:
        d.update(ks=speck_ks(words, n), rounds=speck_rounds(x, y, words, n), decsteps=speck_dec(cx, cy, words, n))
    return d


cases = []
for name in ("simon", "speck"):
    for n, key, pt, ct in VECTORS[name]:
        words = [int(w, 16) for w in key.split()][::-1]
        x, y = (int(w, 16) for w in pt.split())
        cases.append(case(name, n, words, x, y))

rng = random.Random(2013)
for name, table in (("simon", SIMON), ("speck", SPECK)):
    for (n, m) in table:
        for _ in range(3):
            words = [rng.getrandbits(n) for _ in range(m)]
            cases.append(case(name, n, words, rng.getrandbits(n), rng.getrandbits(n)))

errors = []
for words, n, block in [([1, 2, 3], 16, ()), ([1] * 5, 32, ()), ([1, 2, 3, 4], 16, (1 << 16, 0)),
                        ([1, 2, 3, 0x1ffff], 16, ()), ([1, 2, 3, 4], 16, (-5, 0)), ([0] * 2, 48, (0, 1 << 48)),
                        ([1, 2, 3], 24, (0x1000000, 0))]:
    for tname, table in (("SIMON", SIMON), ("SPECK", SPECK)):
        try:
            _check(words, n, table, *block); msg = None
        except ValueError as e:
            msg = str(e)
        errors.append(dict(words=[str(w) for w in words], n=n, table=tname, block=[str(v) for v in block], msg=msg))

json.dump(dict(cases=cases, errors=errors), sys.stdout)
