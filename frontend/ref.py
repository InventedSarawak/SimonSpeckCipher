Z = ["11111010001001010110000111001101111101000100101011000011100110",
     "10001110111110010011000010110101000111011111001001100001011010",
     "10101111011100000011010010011000101000010001111110010110110011",
     "11011011101011000110010111100000010010001010011100110100001111",
     "11010001111001101011011000100000010111000011001010010011101111"]

SIMON = {(16, 4): (32, 0), (24, 3): (36, 0), (24, 4): (36, 1), (32, 3): (42, 2), (32, 4): (44, 3),
         (48, 2): (52, 2), (48, 3): (54, 3), (64, 2): (68, 2), (64, 3): (69, 3), (64, 4): (72, 4)}
SPECK = {(16, 4): 22, (24, 3): 22, (24, 4): 23, (32, 3): 26, (32, 4): 27,
         (48, 2): 28, (48, 3): 29, (64, 2): 32, (64, 3): 33, (64, 4): 34}

def rol(v, r, n): return ((v << r) | (v >> (n - r))) & ((1 << n) - 1)
def ror(v, r, n): return ((v >> r) | (v << (n - r))) & ((1 << n) - 1)

def _check(words, n, table, *block):
    """Reject unsupported variants and values that don't fit in an n-bit word."""
    if (n, len(words)) not in table:
        raise ValueError(f"unsupported variant: {n}-bit words with {len(words)} key words")
    for v in (*words, *block):
        if not 0 <= v < (1 << n):
            raise ValueError(f"value {v:#x} does not fit in a {n}-bit word")

def simon_round_keys(key, n):
    """key = [k0, k1, ..., k_{m-1}]  (k0 is the RIGHTMOST word in the paper's test vectors)"""
    _check(key, n, SIMON)
    m = len(key); T, j = SIMON[(n, m)]; mask = (1 << n) - 1
    k = list(key)
    for i in range(m, T):
        tmp = ror(k[i - 1], 3, n)
        if m == 4:
            tmp ^= k[i - 3]
        tmp ^= ror(tmp, 1, n)
        k.append((~k[i - m] & mask) ^ tmp ^ int(Z[j][(i - m) % 62]) ^ 3)
    return k

def simon_f(v, n): return (rol(v, 1, n) & rol(v, 8, n)) ^ rol(v, 2, n)

def simon_encrypt(x, y, key, n):
    _check(key, n, SIMON, x, y)
    for k in simon_round_keys(key, n):
        x, y = y ^ simon_f(x, n) ^ k, x
    return x, y

def simon_decrypt(x, y, key, n):
    _check(key, n, SIMON, x, y)
    for k in reversed(simon_round_keys(key, n)):
        x, y = y, x ^ simon_f(y, n) ^ k
    return x, y

def speck_round_keys(key, n):
    """key = [k0, l0, l1, ..., l_{m-2}]  (k0 is the RIGHTMOST word in the paper's test vectors)"""
    _check(key, n, SPECK)
    m = len(key); T = SPECK[(n, m)]; mask = (1 << n) - 1
    a, b = (7, 2) if n == 16 else (8, 3)
    k, l = [key[0]], list(key[1:])
    for i in range(T - 1):
        l.append(((k[i] + ror(l[i], a, n)) & mask) ^ i)
        k.append(rol(k[i], b, n) ^ l[i + m - 1])
    return k

def speck_encrypt(x, y, key, n):
    _check(key, n, SPECK, x, y)
    a, b = (7, 2) if n == 16 else (8, 3); mask = (1 << n) - 1
    for k in speck_round_keys(key, n):
        x = ((ror(x, a, n) + y) & mask) ^ k
        y = rol(y, b, n) ^ x
    return x, y

def speck_decrypt(x, y, key, n):
    _check(key, n, SPECK, x, y)
    a, b = (7, 2) if n == 16 else (8, 3); mask = (1 << n) - 1
    for k in reversed(speck_round_keys(key, n)):
        y = ror(x ^ y, b, n)
        x = rol(((x ^ k) - y) & mask, a, n)
    return x, y

# Test vectors from Appendices B and C: (n, key words left-to-right, plaintext, ciphertext)
VECTORS = {
 "simon": [
  (16, "1918 1110 0908 0100", "6565 6877", "c69b e9bb"),
  (24, "121110 0a0908 020100", "612067 6e696c", "dae5ac 292cac"),
  (24, "1a1918 121110 0a0908 020100", "726963 20646e", "6e06a5 acf156"),
  (32, "13121110 0b0a0908 03020100", "6f722067 6e696c63", "5ca2e27f 111a8fc8"),
  (32, "1b1a1918 13121110 0b0a0908 03020100", "656b696c 20646e75", "44c8fc20 b9dfa07a"),
  (48, "0d0c0b0a0908 050403020100", "2072616c6c69 702065687420", "602807a462b4 69063d8ff082"),
  (48, "151413121110 0d0c0b0a0908 050403020100", "746168742074 73756420666f", "ecad1c6c451e 3f59c5db1ae9"),
  (64, "0f0e0d0c0b0a0908 0706050403020100", "6373656420737265 6c6c657661727420", "49681b1e1e54fe3f 65aa832af84e0bbc"),
  (64, "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "206572656874206e 6568772065626972", "c4ac61effcdc0d4f 6c9c8d6e2597b85b"),
  (64, "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "74206e69206d6f6f 6d69732061207369", "8d2b5579afc8a3a0 3bf72a87efe7b868")],
 "speck": [
  (16, "1918 1110 0908 0100", "6574 694c", "a868 42f2"),
  (24, "121110 0a0908 020100", "20796c 6c6172", "c049a5 385adc"),
  (24, "1a1918 121110 0a0908 020100", "6d2073 696874", "735e10 b6445d"),
  (32, "13121110 0b0a0908 03020100", "74614620 736e6165", "9f7952ec 4175946c"),
  (32, "1b1a1918 13121110 0b0a0908 03020100", "3b726574 7475432d", "8c6fa548 454e028b"),
  (48, "0d0c0b0a0908 050403020100", "65776f68202c 656761737520", "9e4d09ab7178 62bdde8f79aa"),
  (48, "151413121110 0d0c0b0a0908 050403020100", "656d6974206e 69202c726576", "2bf31072228a 7ae440252ee6"),
  (64, "0f0e0d0c0b0a0908 0706050403020100", "6c61766975716520 7469206564616d20", "a65d985179783265 7860fedf5c570d18"),
  (64, "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "7261482066656968 43206f7420746e65", "1be4cf3a13135566 f9bc185de03c1886"),
  (64, "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "65736f6874206e49 202e72656e6f6f70", "4109010405c0f53e 4eeeb48d9c188f43")]}

if __name__ == "__main__":
    ciphers = {"simon": (simon_encrypt, simon_decrypt), "speck": (speck_encrypt, speck_decrypt)}
    for name, (enc, dec) in ciphers.items():
        for n, key, pt, ct in VECTORS[name]:
            words = [int(w, 16) for w in key.split()][::-1]      # -> [k0, k1, ...]
            x, y = (int(w, 16) for w in pt.split())
            cx, cy = enc(x, y, words, n)
            ok = f"{cx:0{n//4}x} {cy:0{n//4}x}" == ct and dec(cx, cy, words, n) == (x, y)
            print(f"{name.upper()}{2*n}/{n*len(words):<4} {'OK' if ok else 'FAIL'}")
