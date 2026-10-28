"""Word-level helpers and the interface shared by SIMON and SPECK.

Conventions (chosen to match the paper's test vectors, Appendices B and C):
  * A 2n-bit block is the word pair (x, y); x is the high (left) word.
  * An mn-bit key is m words written most-significant first, so the
    rightmost (least significant) word is k[0].
  * Byte strings map to blocks and keys big-endian, i.e. exactly the way
    the hex is printed in the paper.
"""


def rotl(x, r, n):
    """Left circular shift S^r of an n-bit word."""
    return ((x << r) | (x >> (n - r))) & ((1 << n) - 1)


def rotr(x, r, n):
    """Right circular shift S^-r of an n-bit word."""
    return ((x >> r) | (x << (n - r))) & ((1 << n) - 1)


class BlockCipher:
    """Base class: subclasses supply PARAMS, _expand_key, _round and _inv_round."""

    family = None
    PARAMS = {}  # (block size, key size) -> family-specific parameters

    def __init__(self, key, block_size, key_size):
        if (block_size, key_size) not in self.PARAMS:
            sizes = ", ".join(f"{b}/{k}" for b, k in self.PARAMS)
            raise ValueError(f"{self.family} has no {block_size}/{key_size} variant (choose from {sizes})")
        self.block_size = block_size
        self.key_size = key_size
        self.n = block_size // 2
        self.m = key_size // self.n
        self.mask = (1 << self.n) - 1

        if isinstance(key, (bytes, bytearray)):
            if len(key) * 8 != key_size:
                raise ValueError(f"{self.name} needs a {key_size // 8}-byte key, got {len(key)} bytes")
            key = int.from_bytes(key, "big")
        if not 0 <= key < 1 << key_size:
            raise ValueError(f"{self.name} needs a key of at most {key_size} bits")
        key_words = [(key >> (self.n * i)) & self.mask for i in range(self.m)]
        self.round_keys = self._expand_key(key_words)

    @property
    def name(self):
        return f"{self.family}{self.block_size}/{self.key_size}"

    @property
    def rounds(self):
        return len(self.round_keys)

    @property
    def block_bytes(self):
        return self.block_size // 8

    # -- word level: the algorithm exactly as specified in the paper --

    def encrypt_words(self, x, y):
        """Apply R_{k[T-1]} o ... o R_{k[0]} to the word pair (x, y)."""
        for k in self.round_keys:
            x, y = self._round(x, y, k)
        return x, y

    def decrypt_words(self, x, y):
        """Apply the inverse rounds with the round keys in reverse order."""
        for k in reversed(self.round_keys):
            x, y = self._inv_round(x, y, k)
        return x, y

    def encrypt_trace(self, x, y):
        """Return the state before round 1 followed by the state after every round."""
        states = [(x, y)]
        for k in self.round_keys:
            x, y = self._round(x, y, k)
            states.append((x, y))
        return states

    # -- block level: one block of bytes in, one block of bytes out --

    def encrypt_block(self, block):
        return self._join(*self.encrypt_words(*self._split(block)))

    def decrypt_block(self, block):
        return self._join(*self.decrypt_words(*self._split(block)))

    def _split(self, block):
        if len(block) != self.block_bytes:
            raise ValueError(f"{self.name} blocks are {self.block_bytes} bytes, got {len(block)}")
        value = int.from_bytes(block, "big")
        return value >> self.n, value & self.mask

    def _join(self, x, y):
        return ((x << self.n) | y).to_bytes(self.block_bytes, "big")
