"""Tests for the SIMON and SPECK implementations, anchored to the paper."""

import os
import random
import unittest

from simonspeck import VARIANTS, Simon, Speck, modes, new
from simonspeck.common import rotl, rotr
from simonspeck.simon import U, V, W, Z, lfsr_sequence
from simonspeck.vectors import TEST_VECTORS, hex_to_int, paper_vector


def split(cipher, value):
    return value >> cipher.n, value & cipher.mask


def join(cipher, x, y):
    return (x << cipher.n) | y


class PaperTestVectors(unittest.TestCase):
    """Appendices B and C: one official vector per variant."""

    def test_every_variant_has_a_vector(self):
        self.assertEqual(sorted(v for v, *_ in TEST_VECTORS), sorted(VARIANTS))
        self.assertEqual(len(VARIANTS), 20)

    def test_encrypt(self):
        for variant, key, pt, ct in TEST_VECTORS:
            with self.subTest(variant):
                cipher = new(variant, hex_to_int(key))
                self.assertEqual(join(cipher, *cipher.encrypt_words(*split(cipher, hex_to_int(pt)))), hex_to_int(ct))

    def test_decrypt(self):
        for variant, key, pt, ct in TEST_VECTORS:
            with self.subTest(variant):
                cipher = new(variant, hex_to_int(key))
                self.assertEqual(join(cipher, *cipher.decrypt_words(*split(cipher, hex_to_int(ct)))), hex_to_int(pt))

    def test_byte_interface_matches_paper(self):
        for variant, key, pt, ct in TEST_VECTORS:
            with self.subTest(variant):
                cipher = new(variant, bytes.fromhex(key.replace(" ", "")))
                self.assertEqual(cipher.encrypt_block(bytes.fromhex(pt.replace(" ", ""))).hex(), ct.replace(" ", ""))

    def test_round_counts_match_tables_3_1_and_4_1(self):
        expected = {
            "simon32/64": 32, "simon48/72": 36, "simon48/96": 36, "simon64/96": 42, "simon64/128": 44,
            "simon96/96": 52, "simon96/144": 54, "simon128/128": 68, "simon128/192": 69, "simon128/256": 72,
            "speck32/64": 22, "speck48/72": 22, "speck48/96": 23, "speck64/96": 26, "speck64/128": 27,
            "speck96/96": 28, "speck96/144": 29, "speck128/128": 32, "speck128/192": 33, "speck128/256": 34,
        }
        for variant, rounds in expected.items():
            with self.subTest(variant):
                self.assertEqual(new(variant, 0).rounds, rounds)

    def test_first_round_keys_are_the_key_words(self):
        # SIMON: k[0..m-1] are the key words, k[0] rightmost (Section 3.2)
        cipher = new("simon64/128", hex_to_int("1b1a1918 13121110 0b0a0908 03020100"))
        self.assertEqual(cipher.round_keys[:4], [0x03020100, 0x0b0a0908, 0x13121110, 0x1b1a1918])
        # SPECK: K = (l2, l1, l0, k0), so only k0 is used directly (Section 4.2)
        cipher = new("speck64/128", hex_to_int("1b1a1918 13121110 0b0a0908 03020100"))
        self.assertEqual(cipher.round_keys[0], 0x03020100)


class RoundTrips(unittest.TestCase):
    def test_random_blocks_and_keys(self):
        rng = random.Random(1)
        for variant in VARIANTS:
            key_size = new(variant, 0).key_size
            for _ in range(20):
                cipher = new(variant, rng.getrandbits(key_size))
                x, y = rng.getrandbits(cipher.n), rng.getrandbits(cipher.n)
                with self.subTest(variant=variant, x=x, y=y):
                    self.assertEqual(cipher.decrypt_words(*cipher.encrypt_words(x, y)), (x, y))

    def test_trace_ends_at_ciphertext(self):
        for variant in VARIANTS:
            cipher = new(variant, 12345)
            states = cipher.encrypt_trace(1, 2)
            self.assertEqual(len(states), cipher.rounds + 1)
            self.assertEqual(states[-1], cipher.encrypt_words(1, 2))

    def test_inverse_round_undoes_round(self):
        rng = random.Random(2)
        for variant in VARIANTS:
            cipher = new(variant, 0)
            x, y, k = (rng.getrandbits(cipher.n) for _ in range(3))
            with self.subTest(variant):
                self.assertEqual(cipher._inv_round(*cipher._round(x, y, k), k), (x, y))


class SimonConstants(unittest.TestCase):
    """Section 3.2: z0..z4 come from 5-bit LFSRs defined by the matrices U, V, W."""

    def setUp(self):
        self.u, self.v, self.w = (lfsr_sequence(M, 62) for M in (U, V, W))
        self.t = [i % 2 for i in range(62)]  # t = 0101...

    def test_printed_period_31_sequences(self):
        self.assertEqual("".join(map(str, self.u[:31])), "1111101000100101011000011100110")
        self.assertEqual("".join(map(str, self.v[:31])), "1000111011111001001100001011010")
        self.assertEqual("".join(map(str, self.w[:31])), "1000010010110011111000110111010")

    def test_period_is_31(self):
        for seq in (self.u, self.v, self.w):
            self.assertEqual(seq[:31], seq[31:])

    def test_z_sequences_match_figure_3_3(self):
        self.assertEqual(Z[0], self.u)
        self.assertEqual(Z[1], self.v)
        for j, seq in ((2, self.u), (3, self.v), (4, self.w)):
            self.assertEqual(Z[j], [a ^ b for a, b in zip(self.t, seq)], f"z{j}")


class AppendixAReferenceCode(unittest.TestCase):
    """The C reference routines from Appendix A, transcribed, must agree with the classes."""

    M64 = (1 << 64) - 1

    def test_simon128_two_rounds_per_step(self):
        # #define R2(x,y,k1,k2) (y^=f(x), y^=k1, x^=f(y), x^=k2)
        def f(x):
            return (rotl(x, 1, 64) & rotl(x, 8, 64)) ^ rotl(x, 2, 64)

        key, pt, ct = map(hex_to_int, paper_vector("simon128/128"))
        k = Simon(key, 128, 128).round_keys
        ct1, ct0 = pt >> 64, pt & self.M64
        for i in range(0, 68, 2):
            ct0 ^= f(ct1) ^ k[i]
            ct1 ^= f(ct0) ^ k[i + 1]
        self.assertEqual((ct1 << 64) | ct0, ct)

    def test_speck128_on_the_fly_key_expansion(self):
        # Speck128ExpandKeyAndEncrypt: for(i=0;i<32;i++){R(ct[1],ct[0],A); R(B,A,i);}
        def R(x, y, k):
            x = ((rotr(x, 8, 64) + y) & self.M64) ^ k
            y = rotl(y, 3, 64) ^ x
            return x, y

        key, pt, ct = map(hex_to_int, paper_vector("speck128/128"))
        B, A = key >> 64, key & self.M64
        ct1, ct0 = pt >> 64, pt & self.M64
        for i in range(32):
            ct1, ct0 = R(ct1, ct0, A)
            B, A = R(B, A, i)
        self.assertEqual((ct1 << 64) | ct0, ct)


class Modes(unittest.TestCase):
    def setUp(self):
        self.cipher = new("speck64/128", hex_to_int(paper_vector("speck64/128")[0]))

    def test_round_trip_every_mode_and_length(self):
        for mode in modes.MODES:
            for length in range(0, 3 * self.cipher.block_bytes + 2):
                message = os.urandom(length)
                with self.subTest(mode=mode, length=length):
                    self.assertEqual(modes.decrypt(self.cipher, modes.encrypt(self.cipher, message, mode), mode), message)

    def test_ecb_repeats_equal_blocks_cbc_does_not(self):
        message = b"SAMEBLOK" * 4
        ecb = modes.ecb_encrypt(self.cipher, message)
        cbc = modes.cbc_encrypt(self.cipher, message, bytes(8))
        self.assertEqual(len({ecb[i:i + 8] for i in range(0, 32, 8)}), 1)
        self.assertEqual(len({cbc[i:i + 8] for i in range(0, 32, 8)}), 4)

    def test_ctr_adds_no_padding_and_is_its_own_inverse(self):
        nonce = os.urandom(8)
        message = b"thirteen byte"
        ct = modes.ctr_crypt(self.cipher, message, nonce)
        self.assertEqual(len(ct), len(message))
        self.assertEqual(modes.ctr_crypt(self.cipher, ct, nonce), message)

    def test_fresh_iv_each_time(self):
        a = modes.encrypt(self.cipher, b"hello", "cbc")
        b = modes.encrypt(self.cipher, b"hello", "cbc")
        self.assertNotEqual(a, b)

    def test_bad_padding_is_rejected(self):
        with self.assertRaises(ValueError):
            modes.unpad(b"ABCDEFG\x09", 8)
        with self.assertRaises(ValueError):
            modes.unpad(b"ABCDEF\x01\x02", 8)
        with self.assertRaises(ValueError):
            modes.ecb_decrypt(self.cipher, b"short")


class Validation(unittest.TestCase):
    def test_unsupported_sizes(self):
        with self.assertRaises(ValueError):
            Simon(0, 64, 80)
        with self.assertRaises(ValueError):
            Speck(0, 32, 128)

    def test_key_must_fit(self):
        with self.assertRaises(ValueError):
            new("speck32/64", 1 << 64)
        with self.assertRaises(ValueError):
            new("simon32/64", b"\x00" * 7)

    def test_unknown_variant_name(self):
        with self.assertRaises(ValueError):
            new("aes128/128", 0)

    def test_wrong_block_length(self):
        with self.assertRaises(ValueError):
            new("simon64/128", 0).encrypt_block(b"\x00" * 7)


if __name__ == "__main__":
    unittest.main()
