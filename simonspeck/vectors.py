"""Official test vectors: Appendix B (SIMON) and Appendix C (SPECK) of the paper.

Words are written most-significant first, exactly as printed: the key lists
k[m-1] ... k[0], and plaintext/ciphertext list x then y.
"""

TEST_VECTORS = [
    # variant        key                                                                   plaintext                            ciphertext
    ("simon32/64",   "1918 1110 0908 0100",                                                 "6565 6877",                         "c69b e9bb"),
    ("simon48/72",   "121110 0a0908 020100",                                                "612067 6e696c",                     "dae5ac 292cac"),
    ("simon48/96",   "1a1918 121110 0a0908 020100",                                         "726963 20646e",                     "6e06a5 acf156"),
    ("simon64/96",   "13121110 0b0a0908 03020100",                                          "6f722067 6e696c63",                 "5ca2e27f 111a8fc8"),
    ("simon64/128",  "1b1a1918 13121110 0b0a0908 03020100",                                 "656b696c 20646e75",                 "44c8fc20 b9dfa07a"),
    ("simon96/96",   "0d0c0b0a0908 050403020100",                                           "2072616c6c69 702065687420",         "602807a462b4 69063d8ff082"),
    ("simon96/144",  "151413121110 0d0c0b0a0908 050403020100",                              "746168742074 73756420666f",         "ecad1c6c451e 3f59c5db1ae9"),
    ("simon128/128", "0f0e0d0c0b0a0908 0706050403020100",                                   "6373656420737265 6c6c657661727420", "49681b1e1e54fe3f 65aa832af84e0bbc"),
    ("simon128/192", "1716151413121110 0f0e0d0c0b0a0908 0706050403020100",                  "206572656874206e 6568772065626972", "c4ac61effcdc0d4f 6c9c8d6e2597b85b"),
    ("simon128/256", "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "74206e69206d6f6f 6d69732061207369", "8d2b5579afc8a3a0 3bf72a87efe7b868"),
    ("speck32/64",   "1918 1110 0908 0100",                                                 "6574 694c",                         "a868 42f2"),
    ("speck48/72",   "121110 0a0908 020100",                                                "20796c 6c6172",                     "c049a5 385adc"),
    ("speck48/96",   "1a1918 121110 0a0908 020100",                                         "6d2073 696874",                     "735e10 b6445d"),
    ("speck64/96",   "13121110 0b0a0908 03020100",                                          "74614620 736e6165",                 "9f7952ec 4175946c"),
    ("speck64/128",  "1b1a1918 13121110 0b0a0908 03020100",                                 "3b726574 7475432d",                 "8c6fa548 454e028b"),
    ("speck96/96",   "0d0c0b0a0908 050403020100",                                           "65776f68202c 656761737520",         "9e4d09ab7178 62bdde8f79aa"),
    ("speck96/144",  "151413121110 0d0c0b0a0908 050403020100",                              "656d6974206e 69202c726576",         "2bf31072228a 7ae440252ee6"),
    ("speck128/128", "0f0e0d0c0b0a0908 0706050403020100",                                   "6c61766975716520 7469206564616d20", "a65d985179783265 7860fedf5c570d18"),
    ("speck128/192", "1716151413121110 0f0e0d0c0b0a0908 0706050403020100",                  "7261482066656968 43206f7420746e65", "1be4cf3a13135566 f9bc185de03c1886"),
    ("speck128/256", "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", "65736f6874206e49 202e72656e6f6f70", "4109010405c0f53e 4eeeb48d9c188f43"),
]


def hex_to_int(text):
    """Parse paper-style hex with spaces between words, e.g. '1918 1110 0908 0100'."""
    return int(text.replace(" ", ""), 16)


def paper_vector(variant):
    """Return (key, plaintext, ciphertext) hex strings for a variant such as 'speck64/128'."""
    for name, key, plaintext, ciphertext in TEST_VECTORS:
        if name == variant:
            return key, plaintext, ciphertext
    raise KeyError(variant)
