"""SIMON and SPECK lightweight block ciphers (Beaulieu et al., NSA, 2013)."""

import re

from .simon import Simon
from .speck import Speck

FAMILIES = {"simon": Simon, "speck": Speck}
VARIANTS = [f"{name}{block}/{key}" for name, cls in FAMILIES.items() for block, key in cls.PARAMS]


def parse_variant(variant):
    """Split a name like 'speck64/128' into (cipher class, block size, key size)."""
    match = re.fullmatch(r"(simon|speck)(\d+)/(\d+)", variant.strip().lower())
    if not match:
        raise ValueError(f"unknown variant {variant!r}; expected a name like 'simon64/128'")
    return FAMILIES[match[1]], int(match[2]), int(match[3])


def new(variant, key):
    """Build a cipher from a variant name and a key (int or big-endian bytes)."""
    cls, block_size, key_size = parse_variant(variant)
    return cls(key, block_size, key_size)
