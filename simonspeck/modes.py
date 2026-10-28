"""Modes of operation for messages longer than one block.

The paper defines only the block ciphers themselves. These are the standard
NIST SP 800-38A constructions (with PKCS#7 padding for ECB and CBC), built on
any cipher exposing encrypt_block, decrypt_block and block_bytes.
"""

import os

MODES = ("ecb", "cbc", "ctr")


def pad(data, size):
    count = size - len(data) % size
    return data + bytes([count]) * count


def unpad(data, size):
    if not data or len(data) % size:
        raise ValueError("invalid padding")
    count = data[-1]
    if not 1 <= count <= size or data[-count:] != bytes([count]) * count:
        raise ValueError("invalid padding (wrong key or corrupted ciphertext?)")
    return data[:-count]


def _blocks(data, size):
    return [data[i:i + size] for i in range(0, len(data), size)]


def _xor(a, b):
    return bytes(p ^ q for p, q in zip(a, b))


def _check_length(cipher, data):
    if len(data) % cipher.block_bytes:
        raise ValueError(f"ciphertext length must be a multiple of {cipher.block_bytes} bytes")


def ecb_encrypt(cipher, plaintext):
    size = cipher.block_bytes
    return b"".join(cipher.encrypt_block(block) for block in _blocks(pad(plaintext, size), size))


def ecb_decrypt(cipher, ciphertext):
    _check_length(cipher, ciphertext)
    size = cipher.block_bytes
    return unpad(b"".join(cipher.decrypt_block(block) for block in _blocks(ciphertext, size)), size)


def cbc_encrypt(cipher, plaintext, iv):
    size = cipher.block_bytes
    out, previous = [], iv
    for block in _blocks(pad(plaintext, size), size):
        previous = cipher.encrypt_block(_xor(block, previous))
        out.append(previous)
    return b"".join(out)


def cbc_decrypt(cipher, ciphertext, iv):
    _check_length(cipher, ciphertext)
    size = cipher.block_bytes
    out, previous = [], iv
    for block in _blocks(ciphertext, size):
        out.append(_xor(cipher.decrypt_block(block), previous))
        previous = block
    return unpad(b"".join(out), size)


def ctr_crypt(cipher, data, nonce):
    """CTR mode: XOR with E(nonce), E(nonce+1), ...; encryption and decryption are identical."""
    size = cipher.block_bytes
    counter = int.from_bytes(nonce, "big")
    out = bytearray()
    for i, chunk in enumerate(_blocks(data, size)):
        block = ((counter + i) % (1 << cipher.block_size)).to_bytes(size, "big")
        out += _xor(chunk, cipher.encrypt_block(block))
    return bytes(out)


def encrypt(cipher, plaintext, mode="cbc", iv=None):
    """Encrypt a message. CBC and CTR use a random IV (or nonce), prefixed to the output."""
    mode = mode.lower()
    if mode not in MODES:
        raise ValueError(f"unknown mode {mode!r} (choose from {', '.join(MODES)})")
    if mode == "ecb":
        return ecb_encrypt(cipher, plaintext)
    iv = os.urandom(cipher.block_bytes) if iv is None else iv
    if len(iv) != cipher.block_bytes:
        raise ValueError(f"IV must be {cipher.block_bytes} bytes")
    body = cbc_encrypt(cipher, plaintext, iv) if mode == "cbc" else ctr_crypt(cipher, plaintext, iv)
    return iv + body


def decrypt(cipher, data, mode="cbc"):
    """Inverse of encrypt(): reads the IV (or nonce) from the front for CBC and CTR."""
    mode = mode.lower()
    if mode not in MODES:
        raise ValueError(f"unknown mode {mode!r} (choose from {', '.join(MODES)})")
    if mode == "ecb":
        return ecb_decrypt(cipher, data)
    size = cipher.block_bytes
    if len(data) < size:
        raise ValueError("ciphertext is shorter than the IV")
    iv, body = data[:size], data[size:]
    return cbc_decrypt(cipher, body, iv) if mode == "cbc" else ctr_crypt(cipher, body, iv)
