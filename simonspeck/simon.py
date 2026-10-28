"""SIMON: the hardware-optimised family (Section 3 of the paper).

Round function, a Feistel step (Figure 3.1):
    f(x)     = (S^1 x & S^8 x) ^ S^2 x
    R_k(x,y) = (y ^ f(x) ^ k, x)
"""

from .common import BlockCipher, rotl, rotr

# 5x5 matrices over GF(2) whose LFSRs generate the period-31 sequences u, v, w (Section 3.2)
U = ((0, 1, 0, 0, 0),
     (0, 0, 1, 0, 0),
     (1, 0, 0, 1, 0),
     (0, 0, 0, 0, 1),
     (1, 0, 0, 0, 1))
V = ((0, 1, 1, 0, 0),
     (0, 0, 1, 0, 0),
     (1, 0, 0, 1, 0),
     (0, 0, 0, 0, 1),
     (1, 0, 0, 0, 0))
W = ((0, 1, 0, 0, 0),
     (0, 0, 1, 0, 0),
     (1, 0, 0, 1, 0),
     (0, 0, 0, 0, 1),
     (1, 0, 0, 0, 0))

# Constant sequences z0..z4 exactly as printed in Figure 3.3 (62 bits each)
Z = [[int(bit) for bit in row] for row in (
    "11111010001001010110000111001101111101000100101011000011100110",
    "10001110111110010011000010110101000111011111001001100001011010",
    "10101111011100000011010010011000101000010001111110010110110011",
    "11011011101011000110010111100000010010001010011100110100001111",
    "11010001111001101011011000100000010111000011001010010011101111",
)]


def lfsr_sequence(matrix, length):
    """Bits (0,0,0,0,1) M^i (0,0,0,0,1)^t for i = 0..length-1.

    That is: start a 5-bit LFSR at 00001, step it with M, and read off the
    right-hand bit each time.
    """
    state = (0, 0, 0, 0, 1)
    bits = []
    for _ in range(length):
        bits.append(state[4])
        state = tuple(sum(state[r] & matrix[r][c] for r in range(5)) % 2 for c in range(5))
    return bits


class Simon(BlockCipher):
    family = "SIMON"
    # (block size 2n, key size mn) -> (rounds T, constant sequence index j), Table 3.1
    PARAMS = {
        (32, 64): (32, 0),
        (48, 72): (36, 0),
        (48, 96): (36, 1),
        (64, 96): (42, 2),
        (64, 128): (44, 3),
        (96, 96): (52, 2),
        (96, 144): (54, 3),
        (128, 128): (68, 2),
        (128, 192): (69, 3),
        (128, 256): (72, 4),
    }

    @property
    def z_index(self):
        return self.PARAMS[self.block_size, self.key_size][1]

    def _expand_key(self, key_words):
        """Key expansion from Figure 3.3; key_words[0] is k[0], the rightmost key word."""
        n, m = self.n, self.m
        rounds, j = self.PARAMS[self.block_size, self.key_size]
        c = self.mask ^ 3  # 2^n - 4 = 0xff...fc
        k = list(key_words)
        for i in range(m, rounds):
            tmp = rotr(k[i - 1], 3, n)
            if m == 4:
                tmp ^= k[i - 3]
            tmp ^= rotr(tmp, 1, n)
            k.append(c ^ Z[j][(i - m) % 62] ^ k[i - m] ^ tmp)
        return k

    def _f(self, x):
        n = self.n
        return (rotl(x, 1, n) & rotl(x, 8, n)) ^ rotl(x, 2, n)

    def _round(self, x, y, k):
        return y ^ self._f(x) ^ k, x

    def _inv_round(self, x, y, k):
        return y, x ^ self._f(y) ^ k
