"""SPECK: the software-optimised family (Section 4 of the paper).

Round function, an ARX step (Figure 4.1), where + is addition mod 2^n:
    x = (S^-alpha x + y) ^ k
    y = S^beta y ^ x
"""

from .common import BlockCipher, rotl, rotr


class Speck(BlockCipher):
    family = "SPECK"
    # (block size 2n, key size mn) -> rounds T, Table 4.1
    PARAMS = {
        (32, 64): 22,
        (48, 72): 22,
        (48, 96): 23,
        (64, 96): 26,
        (64, 128): 27,
        (96, 96): 28,
        (96, 144): 29,
        (128, 128): 32,
        (128, 192): 33,
        (128, 256): 34,
    }

    def __init__(self, key, block_size, key_size):
        # Rotation amounts: (7, 2) for the 32-bit block, (8, 3) otherwise
        self.alpha, self.beta = (7, 2) if block_size == 32 else (8, 3)
        super().__init__(key, block_size, key_size)

    def _expand_key(self, key_words):
        """Section 4.2: the round function itself, keyed by the round index i (Figure 4.3).

        key_words = [k0, l0, l1, ..., l(m-2)], i.e. K = (l(m-2), ..., l0, k0).
        """
        rounds = self.PARAMS[self.block_size, self.key_size]
        k = [key_words[0]]
        l = list(key_words[1:])
        for i in range(rounds - 1):
            # l[i+m-1] = (k[i] + S^-alpha l[i]) ^ i ;  k[i+1] = S^beta k[i] ^ l[i+m-1]
            next_l, next_k = self._round(l[i], k[i], i)
            l.append(next_l)
            k.append(next_k)
        return k

    def _round(self, x, y, k):
        n = self.n
        x = ((rotr(x, self.alpha, n) + y) & self.mask) ^ k
        y = rotl(y, self.beta, n) ^ x
        return x, y

    def _inv_round(self, x, y, k):
        n = self.n
        y = rotr(x ^ y, self.beta, n)
        x = rotl(((x ^ k) - y) & self.mask, self.alpha, n)
        return x, y
