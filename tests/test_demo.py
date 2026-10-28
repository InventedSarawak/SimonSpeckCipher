"""Smoke tests: every demo command runs and reports success."""

import contextlib
import io
import os
import tempfile
import unittest

import demo


def run(*argv):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
        code = demo.main(list(argv))
    return code, out.getvalue()


class DemoCommands(unittest.TestCase):
    def test_vectors(self):
        code, out = run("vectors")
        self.assertEqual(code, 0)
        self.assertIn("All 20 variants match the paper", out)

    def test_trace_matches_paper(self):
        for variant in ("simon32/64", "speck128/256"):
            code, out = run("trace", variant)
            self.assertEqual(code, 0)
            self.assertNotIn("✗", out)

    def test_encrypt_then_decrypt_text(self):
        key = "1b1a1918131211100b0a090803020100"
        for mode in ("ecb", "cbc", "ctr"):
            _, hex_ct = run("encrypt", "simon64/128", "--key", key, "--mode", mode, "--text", "Lightweight!")
            code, out = run("decrypt", "simon64/128", "--key", key, "--mode", mode, "--hex", hex_ct.strip())
            self.assertEqual((code, out.strip()), (0, "Lightweight!"))

    def test_encrypt_then_decrypt_file(self):
        data = os.urandom(1000)
        key = "0f0e0d0c0b0a09080706050403020100"
        with tempfile.TemporaryDirectory() as tmp:
            paths = [os.path.join(tmp, name) for name in ("plain", "enc", "dec")]
            with open(paths[0], "wb") as f:
                f.write(data)
            run("encrypt", "speck128/128", "--key", key, "--in", paths[0], "--out", paths[1])
            run("decrypt", "speck128/128", "--key", key, "--in", paths[1], "--out", paths[2])
            with open(paths[2], "rb") as f:
                self.assertEqual(f.read(), data)

    def test_decrypt_with_wrong_key_fails_cleanly(self):
        _, hex_ct = run("encrypt", "speck64/128", "--key", "00" * 16, "--mode", "ecb", "--text", "x" * 40)
        code, _ = run("decrypt", "speck64/128", "--key", "11" * 16, "--mode", "ecb", "--hex", hex_ct.strip())
        # The wrong key yields a garbage final block, which fails the padding check
        self.assertEqual(code, 1)

    def test_avalanche_reaches_full_diffusion(self):
        code, out = run("avalanche", "speck32/64", "--trials", "10")
        self.assertEqual(code, 0)
        self.assertIn("Full diffusion after", out)

    def test_ecb_leaks_and_cbc_does_not(self):
        code, out = run("ecb")
        self.assertEqual(code, 0)
        self.assertIn("ECB:   2 distinct", out)
        self.assertIn("CBC: 144 distinct", out)

    def test_bench(self):
        code, out = run("bench", "--blocks", "5")
        self.assertEqual(code, 0)
        self.assertIn("128/256", out)


if __name__ == "__main__":
    unittest.main()
