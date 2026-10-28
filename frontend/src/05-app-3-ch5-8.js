// ======================================================================================
// Chapter 5 · Round keys
// ======================================================================================
const ksPos = { it: 1, st: 0 }
const lowBits = (r) => (1n << BigInt(r)) - 1n
const highBits = (r, n) => lowBits(r) << BigInt(n - r)
const keyRows = (n, cipher) =>
    S.key.map((v, i) =>
        row(`key[${i}]`, v, n, { sub: `${paperName(cipher, i)} in the paper` }),
    )

function simonKeyIters() {
    const n = S.n,
        t = D.ks,
        { m, T, j, mask } = t,
        c = (1n << BigInt(n)) - 4n
    const list = `[${S.key.map((v) => hx(v, n)).join(', ')}]`
    const iters = [
        {
            label: 'setup',
            steps: [
                {
                    line: 23,
                    say: `${C('simon_round_keys')} is called with key = ${C(list)} and n = ${n}.`,
                    body: vars(ruler(n), ...keyRows(n, 'simon')),
                },
                {
                    line: 24,
                    say: `The docstring fixes the word order: key[0] is k<sub>0</sub>, the rightmost word of the key as the paper prints it.`,
                },
                {
                    line: 25,
                    say: `${C('_check')} confirms that (${n}, ${m}) is a SIMON variant and that every key word fits in ${n} bits (see chapter 3).`,
                },
                {
                    line: 26,
                    say: `m = len(key) = ${m}. SIMON[(${n}, ${m})] = (${T}, ${j}), so T = ${T} rounds and the constant sequence is Z[${j}]. mask = 2<sup>${n}</sup> − 1 = ${hx(mask, n)}.`,
                },
                {
                    line: 27,
                    say: `k starts as a copy of the key, so the first m = ${m} round keys, k[0] to k[${m - 1}], are the key words themselves. The loop computes the other ${T - m}.`,
                    body: vars(
                        ruler(n),
                        ...S.key.map((v, i) =>
                            row(`k[${i}]`, v, n, { sub: `= key[${i}]` }),
                        ),
                    ),
                },
            ],
        },
    ]
    for (const it of t.iters) {
        const i = it.i,
            skip = m === 4 ? [] : [31]
        const zRow = row(`Z[${j}]`, BigInt('0b' + Z[j]), 62, {
            hit: 61 - it.zidx,
            hex: `index ${it.zidx}`,
            sub: `the 62-bit sequence, read left to right; the ringed bit is index ${it.zidx}`,
        })
        const tmpSoFar = vars(
            row('tmp after line 29', it.tmp29, n),
            row(
                m === 4 ? 'tmp after line 31' : 'tmp after line 31 (skipped)',
                m === 4 ? it.tmp31 : it.tmp29,
                n,
            ),
            row('tmp after line 32', it.tmp32, n),
        )
        const steps = [
            {
                line: 28,
                say: `Iteration i = ${i} builds round key k[${i}]. It reads k[i-1] = k[${i - 1}]${m === 4 ? `, k[i-3] = k[${i - 3}]` : ''} and k[i-m] = k[${i - m}].`,
                body: vars(
                    ruler(n),
                    row(`k[i-1] = k[${i - 1}]`, it.km1, n, {
                        sub: 'the previous round key',
                    }),
                    ...(m === 4
                        ? [row(`k[i-3] = k[${i - 3}]`, it.km3, n)]
                        : []),
                    row(`k[i-m] = k[${i - m}]`, it.kim, n, {
                        sub: `the key from m = ${m} places back`,
                    }),
                ),
            },
            {
                line: 29,
                say: `tmp = ror(k[i-1], 3, n) rotates k[i-1] = k[${i - 1}] right by 3 bits.`,
                body: vars(
                    ruler(n),
                    row(`k[i-1] = k[${i - 1}]`, it.km1, n),
                    row('tmp', it.tmp29, n, {
                        res: true,
                        mark: highBits(3, n),
                        sub: 'after line 29; underlined bits wrapped round',
                    }),
                ),
            },
            {
                line: 30,
                say:
                    m === 4
                        ? `m is 4, so the test m == 4 is true and line 31 runs.`
                        : `m is ${m}, so the test m == 4 is false and line 31 will be skipped.`,
            },
            m === 4
                ? {
                      line: 31,
                      say: `tmp ^= k[i-3] XORs in k[i-3] = k[${i - 3}]. Only 4-word keys do this; it lets the extra key word feed into the schedule.`,
                      body: vars(
                          ruler(n),
                          row('tmp', it.tmp29, n, { sub: 'after line 29' }),
                          row(`k[i-3] = k[${i - 3}]`, it.km3, n, { op: '^' }),
                          row('tmp', it.tmp31, n, {
                              res: true,
                              diff: it.tmp29 ^ it.tmp31,
                              sub: 'after line 31; outlined bits changed',
                          }),
                      ),
                  }
                : {
                      line: 31,
                      skip,
                      say: `Line 31 is skipped. It only runs for 4-word keys, and this key has m = ${m} words, so tmp keeps its value from line 29.`,
                      body: vars(
                          ruler(n),
                          row('tmp', it.tmp29, n, {
                              sub: 'unchanged since line 29',
                          }),
                      ),
                  },
            {
                line: 32,
                skip,
                say: `tmp ^= ror(tmp, 1, n) XORs tmp with a copy of itself rotated right by one more bit.`,
                body:
                    vars(
                        ruler(n),
                        row('tmp', it.pre32, n, {
                            sub: m === 4 ? 'after line 31' : 'after line 29',
                        }),
                        row('ror(tmp, 1, n)', it.ror1, n, { op: '^' }),
                        row('tmp', it.tmp32, n, {
                            res: true,
                            diff: it.pre32 ^ it.tmp32,
                            sub: 'after line 32; outlined bits changed',
                        }),
                    ) +
                    `<h4>tmp after each line</h4>` +
                    tmpSoFar,
            },
            {
                line: 33,
                skip,
                say: `Line 33 XORs four terms to make the new round key k[${i}]: k[i-m] = k[${i - m}] with every bit flipped, tmp, bit ${it.zidx} of Z[${j}], and the constant 3.`,
                body:
                    vars(
                        ruler(n),
                        row(`k[i-m] = k[${i - m}]`, it.kim, n, {
                            sub: 'before flipping',
                        }),
                        row('~k[i-m] & mask', it.notk, n, {
                            sep: true,
                            sub: '~ flips every bit; & mask keeps n of them',
                        }),
                        row('tmp', it.tmp32, n, { op: '^' }),
                        row(`int(Z[${j}][${it.zidx}])`, it.zbit, n, {
                            op: '^',
                            sub: `(i-m) % 62 = (${i}-${m}) % 62 = ${it.zidx}`,
                        }),
                        row('3', 3n, n, { op: '^' }),
                        row(`k[${i}]`, it.out, n, {
                            res: true,
                            sub: 'appended to k',
                        }),
                    ) +
                    `<h4>Where the Z bit comes from</h4>` +
                    `<div class="wide-scroll">${vars(zRow)}</div>`,
            },
            {
                line: 33,
                skip,
                say: `Why the ~ and the 3? (~k[i-m] &amp; mask) ^ 3 is the same as k[i-m] ^ c, where c = 2<sup>n</sup> − 4 = ${hx(c, n)} is the constant written in the paper.`,
                body:
                    vars(
                        ruler(n),
                        row('~k[i-m] & mask', it.notk, n),
                        row('3', 3n, n, { op: '^' }),
                        row('(~k[i-m] & mask) ^ 3', it.notk ^ 3n, n, {
                            res: true,
                        }),
                        row(`k[i-m] = k[${i - m}]`, it.kim, n, { sep: true }),
                        row('c = 2**n - 4', c, n, { op: '^' }),
                        row('k[i-m] ^ c', it.kim ^ c, n, { res: true }),
                    ) +
                    `<p class="${(it.notk ^ 3n) === (it.kim ^ c) ? 'match' : 'match no'}">${(it.notk ^ 3n) === (it.kim ^ c) ? '✓ The two results are equal.' : '✗ The results differ.'}</p>` +
                    `<p class="note">Flipping every bit with ${C('~v & mask')} is the same as ${C('v ^ mask')}. XOR with 3 flips the lowest two bits back again. Together that is v ^ (mask ^ 3), and mask ^ 3 = 2<sup>n</sup> − 1 − 3 = 2<sup>n</sup> − 4 = c. The paper writes the key schedule as k<sub>i</sub> = c ⊕ (z<sub>j</sub>)<sub>i−m</sub> ⊕ k<sub>i−m</sub> ⊕ (I ⊕ S<sup>−1</sup>)(…); the code writes the same thing with ~ and 3.</p>`,
            },
        ]
        iters.push({ label: `i = ${i} → k[${i}]`, steps })
    }
    iters.push({
        label: 'return',
        steps: [
            {
                line: 34,
                say: `The loop has filled k[0] to k[${T - 1}], so the function returns all T = ${T} round keys. The full list is in the table below.`,
                body: vars(
                    ruler(n),
                    row('k[0]', D.rk[0], n, { sub: 'first' }),
                    row(`k[${T - 1}]`, D.rk[T - 1], n, { sub: 'last' }),
                ),
            },
        ],
    })
    return iters
}

function speckKeyIters() {
    const n = S.n,
        t = D.ks,
        { m, T, a, b, mask } = t
    const list = `[${S.key.map((v) => hx(v, n)).join(', ')}]`
    const iters = [
        {
            label: 'setup',
            steps: [
                {
                    line: 50,
                    say: `${C('speck_round_keys')} is called with key = ${C(list)} and n = ${n}.`,
                    body: vars(ruler(n), ...keyRows(n, 'speck')),
                },
                {
                    line: 51,
                    say: `The docstring fixes the word order: key[0] is k<sub>0</sub> and the rest are ℓ<sub>0</sub>, ℓ<sub>1</sub>, …, with k<sub>0</sub> rightmost in the paper's printout.`,
                },
                {
                    line: 52,
                    say: `${C('_check')} confirms that (${n}, ${m}) is a SPECK variant and that every key word fits in ${n} bits (see chapter 3).`,
                },
                {
                    line: 53,
                    say: `m = len(key) = ${m}. SPECK[(${n}, ${m})] = ${T}, so T = ${T} rounds. mask = 2<sup>${n}</sup> − 1 = ${hx(mask, n)}.`,
                },
                {
                    line: 54,
                    say: `n is ${n}, so the rotation amounts are a = ${a} and b = ${b}${n === 16 ? ' (the 32-bit block uses smaller rotations)' : ''}.`,
                },
                {
                    line: 55,
                    say: `k = [key[0]] holds the first round key. l = key[1:] holds the other ${plural(m - 1, 'key word')}, which never become round keys themselves: they only feed the schedule.`,
                    body: vars(
                        ruler(n),
                        row('k[0]', S.key[0], n, { sub: '= key[0] = k0' }),
                        ...S.key
                            .slice(1)
                            .map((v, i) =>
                                row(`l[${i}]`, v, n, {
                                    sub: `= key[${i + 1}] = ℓ${sub(i)}`,
                                }),
                            ),
                    ),
                },
            ],
        },
    ]
    for (const it of t.iters) {
        const i = it.i,
            li = i + m - 1,
            cols = n + 1
        iters.push({
            label: `i = ${i} → k[${i + 1}]`,
            steps: [
                {
                    line: 56,
                    say: `Iteration i = ${i} makes l[i+m-1] = l[${li}] and k[i+1] = k[${i + 1}]. Lines 57–58 are SPECK's own round function, with the counter i in place of a round key.`,
                    body: vars(
                        ruler(n),
                        row(`k[i] = k[${i}]`, it.ki, n),
                        row(`l[i] = l[${i}]`, it.li, n),
                    ),
                },
                {
                    line: 57,
                    say: `First, ror(l[i], a, n) rotates l[i] = l[${i}] right by a = ${a}.`,
                    body: vars(
                        ruler(n),
                        row(`l[i] = l[${i}]`, it.li, n),
                        row('ror(l[i], a, n)', it.rorl, n, {
                            res: true,
                            mark: highBits(a, n),
                            sub: 'underlined bits wrapped round',
                        }),
                    ),
                },
                {
                    line: 57,
                    say: `Then k[i] = k[${i}] is added to it. The sum can need ${n + 1} bits, so & mask drops the carry out of the top. ${NONLIN}`,
                    body: vars(
                        ruler(n, cols),
                        row(`k[i] = k[${i}]`, it.ki, n, { cols }),
                        row('ror(l[i], a, n)', it.rorl, n, { cols, op: '+' }),
                        row('carries', it.carries, n, {
                            cols,
                            over: 1,
                            acc: true,
                            sub: 'a coloured cell is a carry into that bit',
                        }),
                        row('k[i] + ror(l[i], a, n)', it.sum, n, {
                            cols,
                            over: 1,
                            res: true,
                            sub:
                                it.sum >> BigInt(n)
                                    ? 'the hatched top bit is the carry out'
                                    : 'no carry out of the top this time',
                        }),
                        row('(…) & mask', it.masked, n, { cols, res: true }),
                    ),
                },
                {
                    line: 57,
                    say: `^ i XORs in the counter i = ${i}, and l.append stores the result as l[${li}].`,
                    body: vars(
                        ruler(n),
                        row('(k[i] + ror(l[i], a, n)) & mask', it.masked, n),
                        row('i', BigInt(i), n, { op: '^' }),
                        row(`l[${li}]`, it.lnew, n, {
                            res: true,
                            diff: it.masked ^ it.lnew,
                            sub: 'appended to l',
                        }),
                    ),
                },
                {
                    line: 58,
                    say: `rol(k[i], b, n) rotates k[i] = k[${i}] left by b = ${b}, and XOR with the word just made, l[i+m-1] = l[${li}], gives the next round key k[${i + 1}].`,
                    body: vars(
                        ruler(n),
                        row(`k[i] = k[${i}]`, it.ki, n),
                        row('rol(k[i], b, n)', it.rolk, n, {
                            mark: lowBits(b),
                            sub: 'underlined bits wrapped round',
                        }),
                        row(`l[i+m-1] = l[${li}]`, it.lnew, n, { op: '^' }),
                        row(`k[${i + 1}]`, it.knew, n, {
                            res: true,
                            sub: 'appended to k',
                        }),
                    ),
                },
            ],
        })
    }
    iters.push({
        label: 'return',
        steps: [
            {
                line: 59,
                say: `The loop ran T − 1 = ${T - 1} times, adding one key each time to k[0], so the function returns T = ${T} round keys. The l list is thrown away.`,
                body: vars(
                    ruler(n),
                    row('k[0]', D.rk[0], n, { sub: 'first' }),
                    row(`k[${T - 1}]`, D.rk[T - 1], n, { sub: 'last' }),
                ),
            },
        ],
    })
    return iters
}

function renderRoundKeys(el) {
    const { n, cipher } = S,
        simon = cipher === 'simon',
        m = S.m,
        T = D.T
    const rkRows = D.rk
        .map((v, i) => {
            const fromKey = simon ? i < m : i === 0
            const src = fromKey
                ? `key[${i}] = ${paperName(cipher, i)}, straight from the key`
                : simon
                  ? `line 33, iteration i = ${i}`
                  : `line 58, iteration i = ${i - 1}`
            return `<tr${fromKey ? ' class="cur"' : ''}><td class="num">${i}</td><td class="hex">${hexw(v, n)}</td><td>${src}${fromKey ? ' <span class="tag">from the key</span>' : ''}</td></tr>`
        })
        .join('')
    const lRows = simon
        ? ''
        : D.ks.l
              .map((v, i) => {
                  const fromKey = i < m - 1
                  return `<tr${fromKey ? ' class="cur"' : ''}><td class="num">${i}</td><td class="hex">${hexw(v, n)}</td><td>${fromKey ? `key[${i + 1}] = ℓ${sub(i)}, straight from the key` : `line 57, iteration i = ${i - (m - 1)}`}</td></tr>`
              })
              .join('')
    el.innerHTML = `
  <p class="prose">A cipher with T rounds needs T <dfn>round keys</dfn> (one n-bit word mixed in per round), but the key only has m words. The <dfn>key schedule</dfn> stretches the key: ${
      simon
          ? `${C('simon_round_keys')} (lines 23–34) uses the key words as k[0] to k[${m - 1}], then computes each later key from earlier ones with rotations, XOR and one bit of a fixed sequence Z[${D.j}].`
          : `${C('speck_round_keys')} (lines 50–59) uses key[0] as k[0], then runs SPECK's own round function on the pair (l[i], k[i]) with the counter i as its "round key".`
  }</p>
  ${
      simon
          ? `<p class="prose">Z[${D.j}] adds a different 0 or 1 to each new key. Without it, keys built by the same rule could repeat in a pattern, which some attacks exploit. The five sequences are the first lines of the file; this variant uses the highlighted one, Z[${D.j}]:</p>
  ${codeView([[1, 5]], { on: D.j + 1 })}`
          : ''
  }
  <div id="ksDbg"></div>
  <details><summary>All ${T} round keys</summary><div class="inner">
    <p class="muted">Highlighted rows come straight from the key; every other key is computed by the loop.</p>
    <div class="tbl"><table><thead><tr><th scope="col" class="num">i</th><th scope="col">k[i] (hex)</th><th scope="col">Where it comes from</th></tr></thead><tbody>${rkRows}</tbody></table></div>
  </div></details>
  ${
      simon
          ? ''
          : `<details><summary>The l words (${D.ks.l.length} of them)</summary><div class="inner">
    <p class="muted">The schedule's second list. Its first m − 1 = ${m - 1} entries come from the key; the loop appends one per iteration.</p>
    <div class="tbl"><table><thead><tr><th scope="col" class="num">index</th><th scope="col">l[index] (hex)</th><th scope="col">Where it comes from</th></tr></thead><tbody>${lRows}</tbody></table></div>
  </div></details>`
  }`
    const st = new Stepper($('#ksDbg', el), {
        name: 'ks',
        label: 'Loop iteration',
        pos: ksPos,
        codeLabel: simon
            ? 'ref.py lines 23–34, simon_round_keys'
            : 'ref.py lines 50–59, speck_round_keys',
    })
    st.setIters(
        simon ? simonKeyIters() : speckKeyIters(),
        simon ? [[23, 34]] : [[50, 59]],
    )
}

// ======================================================================================
// Chapter 6 · One round
// ======================================================================================
const roundPos = { it: 0, st: 0 }

function changedNote(a, b, n) {
    const d = popcount(a ^ b)
    return `${d} of ${n} bits changed`
}
function roundSummary(R, n) {
    return `<p class="note">Round ${R.r}: (x, y) = (${hx(R.x, n)}, ${hx(R.y, n)}) → (${hx(R.nx, n)}, ${hx(R.ny, n)}). ${popcount(R.nx ^ R.x) + popcount(R.ny ^ R.y)} of the block's ${2 * n} bits changed.</p>`
}

function simonRoundSteps(R) {
    const n = S.n,
        T = D.T,
        kn = `k = k[${R.r - 1}]`
    return [
        {
            line: 40,
            say: `Round ${R.r} of ${T}: the loop hands this round its key, ${kn}. The state coming in is ${R.r === 1 ? 'the plaintext' : `the output of round ${R.r - 1}`}.`,
            body: vars(
                ruler(n),
                row('x', R.x, n),
                row('y', R.y, n),
                row(kn, R.k, n),
            ),
        },
        {
            line: 36,
            say: `${C('simon_f(x, n)')} is called with v = x. It starts with rol(v, 1, n): x rotated left by 1.`,
            body: vars(
                ruler(n),
                row('v = x', R.x, n),
                row('rol(v, 1, n)', R.s1, n, {
                    res: true,
                    mark: lowBits(1),
                    sub: 'underlined bit wrapped round',
                }),
            ),
        },
        {
            line: 36,
            say: `rol(v, 8, n) rotates the same v left by 8.`,
            body: vars(
                ruler(n),
                row('v = x', R.x, n),
                row('rol(v, 8, n)', R.s8, n, {
                    res: true,
                    mark: lowBits(8),
                    sub: 'underlined bits wrapped round',
                }),
            ),
        },
        {
            line: 36,
            say: `rol(v, 1, n) & rol(v, 8, n) keeps a 1 only where both rotated copies have a 1. ${NONLIN}`,
            body:
                vars(
                    ruler(n),
                    row('rol(v, 1, n)', R.s1, n),
                    row('rol(v, 8, n)', R.s8, n, { op: '&' }),
                    row('rol(v, 1, n) & rol(v, 8, n)', R.and, n, { res: true }),
                ) +
                `<p class="note">XOR and rotation are linear: flipping one input bit always flips the same output bits, whatever the other bits are. AND is not: flipping a bit of one input matters only where the other input has a 1. Without this step, SIMON could be solved like a set of linear equations.</p>`,
        },
        {
            line: 36,
            say: `rol(v, 2, n) rotates v left by 2.`,
            body: vars(
                ruler(n),
                row('v = x', R.x, n),
                row('rol(v, 2, n)', R.s2, n, {
                    res: true,
                    mark: lowBits(2),
                    sub: 'underlined bits wrapped round',
                }),
            ),
        },
        {
            line: 36,
            say: `simon_f returns the AND XORed with rol(v, 2, n), so f(x) = ${hx(R.f, n)}.`,
            body: vars(
                ruler(n),
                row('rol(v, 1, n) & rol(v, 8, n)', R.and, n),
                row('rol(v, 2, n)', R.s2, n, { op: '^' }),
                row('simon_f(x, n)', R.f, n, { res: true }),
            ),
        },
        {
            line: 41,
            say: `The new x is y ^ simon_f(x, n) ^ k. Python evaluates the whole right-hand side with the old x before it assigns anything. Outlined bits differ from the old x.`,
            body: vars(
                ruler(n),
                row('y', R.y, n),
                row('simon_f(x, n)', R.f, n, { op: '^' }),
                row(kn, R.k, n, { op: '^' }),
                row('new x', R.nx, n, {
                    res: true,
                    diff: R.nx ^ R.x,
                    sub: changedNote(R.nx, R.x, n) + ' vs old x',
                }),
            ),
        },
        {
            line: 41,
            say: `The new y is the old x, copied unchanged. Swapping the halves like this is what makes SIMON a Feistel cipher. Outlined bits differ from the old y.`,
            body:
                vars(
                    ruler(n),
                    row('old x', R.x, n),
                    row('new y', R.ny, n, {
                        res: true,
                        diff: R.ny ^ R.y,
                        sub: changedNote(R.ny, R.y, n) + ' vs old y',
                    }),
                ) + roundSummary(R, n),
        },
    ]
}

function speckRoundSteps(R) {
    const n = S.n,
        T = D.T,
        [a, b] = speckAB(n),
        kn = `k = k[${R.r - 1}]`,
        cols = n + 1
    return [
        {
            line: 64,
            say: `Round ${R.r} of ${T}: the loop hands this round its key, ${kn}. The state coming in is ${R.r === 1 ? 'the plaintext' : `the output of round ${R.r - 1}`}.`,
            body: vars(
                ruler(n),
                row('x', R.x, n),
                row('y', R.y, n),
                row(kn, R.k, n),
            ),
        },
        {
            line: 65,
            say: `ror(x, a, n) rotates x right by a = ${a}.`,
            body: vars(
                ruler(n),
                row('x', R.x, n),
                row('ror(x, a, n)', R.rorx, n, {
                    res: true,
                    mark: highBits(a, n),
                    sub: 'underlined bits wrapped round',
                }),
            ),
        },
        {
            line: 65,
            say: `ror(x, a, n) + y adds y to it. The sum can need ${n + 1} bits, so & mask drops the carry out of the top. ${NONLIN}`,
            body:
                vars(
                    ruler(n, cols),
                    row('ror(x, a, n)', R.rorx, n, { cols }),
                    row('y', R.y, n, { cols, op: '+' }),
                    row('carries', R.carries, n, {
                        cols,
                        over: 1,
                        acc: true,
                        sub: 'a coloured cell is a carry into that bit',
                    }),
                    row('ror(x, a, n) + y', R.sum, n, {
                        cols,
                        over: 1,
                        res: true,
                        sub:
                            R.sum >> BigInt(n)
                                ? 'the hatched top bit is the carry out'
                                : 'no carry out of the top this time',
                    }),
                    row('(…) & mask', R.masked, n, { cols, res: true }),
                ) +
                `<p class="note">Each bit of a sum depends on every lower bit, through the chain of carries. That dependence is not linear, and it is the only nonlinear step in SPECK; everything else is rotation and XOR.</p>`,
        },
        {
            line: 65,
            say: `XOR with the round key gives the new x. Outlined bits differ from the old x.`,
            body: vars(
                ruler(n),
                row('(ror(x, a, n) + y) & mask', R.masked, n),
                row(kn, R.k, n, { op: '^' }),
                row('new x', R.nx, n, {
                    res: true,
                    diff: R.nx ^ R.x,
                    sub: changedNote(R.nx, R.x, n) + ' vs old x',
                }),
            ),
        },
        {
            line: 66,
            say: `rol(y, b, n) rotates the old y left by b = ${b}.`,
            body: vars(
                ruler(n),
                row('y', R.y, n),
                row('rol(y, b, n)', R.roly, n, {
                    res: true,
                    mark: lowBits(b),
                    sub: 'underlined bits wrapped round',
                }),
            ),
        },
        {
            line: 66,
            say: `XOR with x, which line 65 has already replaced with the new x, gives the new y. Outlined bits differ from the old y.`,
            body:
                vars(
                    ruler(n),
                    row('rol(y, b, n)', R.roly, n),
                    row('x (new)', R.nx, n, { op: '^' }),
                    row('new y', R.ny, n, {
                        res: true,
                        diff: R.ny ^ R.y,
                        sub: changedNote(R.ny, R.y, n) + ' vs old y',
                    }),
                ) + roundSummary(R, n),
        },
    ]
}

function renderOneRound(el) {
    const simon = S.cipher === 'simon',
        [a, b] = speckAB(S.n)
    el.innerHTML = `
  <p class="prose">The loop body in ${C(S.cipher + '_encrypt')} is one <dfn>round</dfn>. Pick a round with the slider and step through it. In the paper's notation, where S<sup>j</sup> means rotate left by j and S<sup>−j</sup> rotate right:</p>
  <div class="callout"><p class="mono" style="margin:0">${
      simon
          ? `f(x) = (S<sup>1</sup>x &amp; S<sup>8</sup>x) ⊕ S<sup>2</sup>x<br>(x, y) → (y ⊕ f(x) ⊕ k, x)`
          : `x → (S<sup>−${a}</sup>x + y) ⊕ k<br>y → S<sup>${b}</sup>y ⊕ x   (using the new x)`
  }</p></div>
  <div id="roundDbg"></div>`
    const st = new Stepper($('#roundDbg', el), {
        name: 'round',
        label: 'Round',
        pos: roundPos,
        codeLabel: simon
            ? 'ref.py lines 36–42, simon_f and simon_encrypt'
            : 'ref.py lines 61–67, speck_encrypt',
    })
    st.setIters(
        D.rounds.map((R) => ({
            label: `round ${R.r} of ${D.T}`,
            steps: (simon ? simonRoundSteps : speckRoundSteps)(R),
        })),
        simon ? [[36, 42]] : [[61, 67]],
    )
}

// ======================================================================================
// Chapter 7 · All rounds
// ======================================================================================
const filmUI = { changes: false, sel: 1, hover: -1 }

function encryptCallSteps() {
    const { n, cipher, x, y } = S,
        simon = cipher === 'simon',
        T = D.T,
        w = (v) => hx(v, n)
    const list = `[${S.key.map(w).join(', ')}]`,
        cmp = D.isPaper ? ` It matches the paper's test vector.` : ''
    return simon
        ? [
              {
                  line: 38,
                  say: `${C('simon_encrypt')} is called with x = ${w(x)}, y = ${w(y)}, key = ${C(list)} and n = ${n}.`,
              },
              {
                  line: 39,
                  say: `${C('_check')} passes; this time it also checks that x and y fit in ${n} bits.`,
              },
              {
                  line: 40,
                  say: `${C('simon_round_keys(key, n)')} runs once and returns ${T} round keys. The for loop then takes them one at a time, so the body runs ${T} times.`,
              },
              {
                  line: 41,
                  say: `Each pass is one round: the new pair (x, y) replaces the old one. The film strip below shows the state after every pass.`,
              },
              {
                  line: 42,
                  say: `After ${T} rounds the function returns (x, y) = (${w(D.cx)}, ${w(D.cy)}): the ciphertext.${cmp}`,
              },
          ]
        : [
              {
                  line: 61,
                  say: `${C('speck_encrypt')} is called with x = ${w(x)}, y = ${w(y)}, key = ${C(list)} and n = ${n}.`,
              },
              {
                  line: 62,
                  say: `${C('_check')} passes; this time it also checks that x and y fit in ${n} bits.`,
              },
              {
                  line: 63,
                  say: `a, b = ${D.a}, ${D.b} since n is ${n}, and mask = ${w(D.mask)}.`,
              },
              {
                  line: 64,
                  say: `${C('speck_round_keys(key, n)')} runs once and returns ${T} round keys. The for loop then takes them one at a time, so the body runs ${T} times.`,
              },
              { line: 65, say: `Each pass replaces x first (line 65)…` },
              {
                  line: 66,
                  say: `…and then y, using the new x (line 66). The film strip below shows the state after every pass.`,
              },
              {
                  line: 67,
                  say: `After ${T} rounds the function returns (x, y) = (${w(D.cx)}, ${w(D.cy)}): the ciphertext.${cmp}`,
              },
          ]
}

function drawFilm(canvas) {
    const n = S.n,
        states = D.states,
        cols = 2 * n,
        rows = states.length
    const avail = Math.max(240, canvas.parentElement.clientWidth - 2)
    const labelW = 30,
        gap = 6,
        head = 16
    const cell = clamp(Math.floor((avail - labelW - gap) / cols), 3, 14)
    const rowH = clamp(cell, 5, 12)
    const W = labelW + cols * cell + gap,
        H = head + rows * rowH
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const col = {
        b1: cssVar('--bit1'),
        b0: cssVar('--bit0'),
        acc: cssVar('--accent'),
        ink: cssVar('--ink-3'),
        bg: cssVar('--panel'),
    }
    g.fillStyle = col.bg
    g.fillRect(0, 0, W, H)
    g.font = '10px ' + cssVar('--mono', document.documentElement)
    g.fillStyle = col.ink
    g.textBaseline = 'middle'
    g.textAlign = 'center'
    g.fillText('x', labelW + (n * cell) / 2, head / 2)
    g.fillText('y', labelW + gap + n * cell + (n * cell) / 2, head / 2)
    g.textAlign = 'right'
    const every = rowH >= 10 ? 1 : rowH >= 7 ? 2 : 4
    for (let r = 0; r < rows; r++) {
        const [x, y] = states[r],
            v = (x << BigInt(n)) | y
        const prev = r ? (states[r - 1][0] << BigInt(n)) | states[r - 1][1] : v,
            d = v ^ prev
        const top = head + r * rowH
        if (r % every === 0 || r === rows - 1) {
            g.fillStyle = col.ink
            g.fillText(r === 0 ? 'in' : String(r), labelW - 6, top + rowH / 2)
        }
        for (let c = 0; c < cols; c++) {
            const p = BigInt(cols - 1 - c),
                bit = (v >> p) & 1n,
                ch = (d >> p) & 1n
            g.fillStyle =
                filmUI.changes && r > 0
                    ? ch
                        ? col.acc
                        : bit
                          ? col.b1
                          : col.b0
                    : bit
                      ? col.b1
                      : col.b0
            if (filmUI.changes && r > 0 && !ch) g.globalAlpha = 0.35
            g.fillRect(
                labelW + c * cell + (c >= n ? gap : 0),
                top,
                Math.max(1, cell - 1),
                Math.max(1, rowH - 1),
            )
            g.globalAlpha = 1
        }
    }
    for (const [r, style, wdt] of [
        [filmUI.hover, col.ink, 1.5],
        [filmUI.sel, col.acc, 2.5],
    ]) {
        if (r < 0 || r >= rows) continue
        g.strokeStyle = style
        g.lineWidth = wdt
        g.strokeRect(
            labelW - 2,
            head + r * rowH - 1,
            cols * cell + gap + 3,
            rowH + 1,
        )
    }
    canvas._geo = { head, rowH, rows }
}

function renderAllRounds(el) {
    const { n, cipher } = S,
        simon = cipher === 'simon',
        T = D.T
    filmUI.sel = clamp(filmUI.sel, 0, T)
    const pc = D.paperCt,
        match = D.cx === pc[0] && D.cy === pc[1]
    el.innerHTML = `
  <p class="prose">${C(cipher + '_encrypt')} is short: check the inputs, build the round keys, run the round T = ${T} times, return the result. Step through it:</p>
  <div id="encDbg"></div>
  <h3>Film strip: the state after every round</h3>
  <p class="prose">Each row is the ${2 * n}-bit block (x then y) after one round; the top row, "in", is the plaintext. Click a row, or focus the strip and use ↑ ↓ and Enter, to open that round in chapter 6.</p>
  <label class="nowrap" style="font-size:.9rem"><input type="checkbox" id="filmChanges"${filmUI.changes ? ' checked' : ''}> Colour the bits that changed since the previous row</label>
  <div class="canvas-wrap"><canvas class="strip" id="film" tabindex="0" role="img" aria-label="Film strip of ${T + 1} states, ${2 * n} bits each. Use the arrow keys to choose a round and Enter to open it."></canvas></div>
  <p id="filmInfo" class="note" aria-live="polite"></p>
  <h3>The result</h3>
  <dl class="kv">
    <dt>returned</dt><dd>(x, y) = (${hx(D.cx, n)}, ${hx(D.cy, n)})</dd>
    <dt>as the paper writes it</dt><dd>${hexw(D.cx, n)} ${hexw(D.cy, n)}</dd>
    <dt>paper's test vector</dt><dd>${D.vec[3]}${D.isPaper ? '' : ' (for different inputs)'}</dd>
  </dl>
  ${
      D.isPaper
          ? `<p class="${match ? 'match' : 'match no'}">${match ? "✓ Matches the paper's test vector for " + D.name + '.' : "✗ Does not match the paper's test vector."}</p>`
          : `<p class="note">Your inputs differ from the paper's test vector for ${D.name}, so there is no published answer to compare with. Choose "Use the paper's test vector" in ${chLink('inputs')} to check against the paper.</p>`
  }
  <details><summary>Table of all ${T} rounds</summary><div class="inner"><div class="tbl"><table>
    <thead><tr><th scope="col" class="num">Round</th><th scope="col">Round key k</th><th scope="col">x after</th><th scope="col">y after</th><th scope="col"><span class="sr">Open</span></th></tr></thead>
    <tbody><tr><td class="num">in</td><td class="muted">—</td><td class="hex">${hexw(S.x, n)}</td><td class="hex">${hexw(S.y, n)}</td><td></td></tr>
    ${D.rounds.map((R) => `<tr><td class="num">${R.r}</td><td class="hex">${hexw(R.k, n)}</td><td class="hex">${hexw(R.nx, n)}</td><td class="hex">${hexw(R.ny, n)}</td><td><button type="button" class="btn small" data-round="${R.r}">Open</button></td></tr>`).join('')}</tbody>
  </table></div></div></details>`

    const st = new Stepper($('#encDbg', el), {
        name: 'enc',
        label: 'Call',
        noSlider: true,
        codeLabel: simon
            ? 'ref.py lines 38–42, simon_encrypt'
            : 'ref.py lines 61–67, speck_encrypt',
    })
    st.setIters(
        [{ label: 'call', steps: encryptCallSteps() }],
        simon ? [[38, 42]] : [[61, 67]],
    )

    const cv = $('#film', el),
        info = $('#filmInfo', el)
    const openRound = (r) => {
        roundPos.it = clamp(r, 1, T) - 1
        roundPos.st = 0
        CH[5].v = -1
        go('one-round')
    }
    const describe = (r) => {
        const [x, y] = D.states[r]
        info.textContent =
            r === 0
                ? `Plaintext: x = ${hx(x, n)}, y = ${hx(y, n)}.`
                : `After round ${r} (key k[${r - 1}] = ${hx(D.rk[r - 1], n)}): x = ${hx(x, n)}, y = ${hx(y, n)}.`
    }
    const rowAt = (e) => {
        const g = cv._geo,
            rect = cv.getBoundingClientRect()
        const r = Math.floor((e.clientY - rect.top - g.head) / g.rowH)
        return r >= 0 && r < g.rows ? r : -1
    }
    drawFilm(cv)
    describe(filmUI.sel)
    cv.addEventListener('mousemove', (e) => {
        const r = rowAt(e)
        if (r !== filmUI.hover) {
            filmUI.hover = r
            drawFilm(cv)
            if (r >= 0) describe(r)
        }
    })
    cv.addEventListener('mouseleave', () => {
        filmUI.hover = -1
        drawFilm(cv)
        describe(filmUI.sel)
    })
    cv.addEventListener('click', (e) => {
        const r = rowAt(e)
        if (r >= 0) openRound(Math.max(1, r))
    })
    cv.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            filmUI.sel = clamp(
                filmUI.sel + (e.key === 'ArrowDown' ? 1 : -1),
                0,
                T,
            )
            drawFilm(cv)
            describe(filmUI.sel)
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openRound(Math.max(1, filmUI.sel))
        }
    })
    $('#filmChanges', el).addEventListener('change', (e) => {
        filmUI.changes = e.target.checked
        drawFilm(cv)
    })
    el.querySelectorAll('[data-round]').forEach((b) =>
        b.addEventListener('click', () => openRound(+b.dataset.round)),
    )
    CH[6].redraw = () => drawFilm(cv)
}

// ======================================================================================
// Chapter 8 · Decryption
// ======================================================================================
const decPos = { it: 1, st: 0 }

function matchLine(s) {
    const n = S.n,
        [ex, ey] = D.states[s.kidx],
        ok = s.nx === ex && s.ny === ey
    const what =
        s.kidx === 0
            ? 'the plaintext'
            : `the encryption state after round ${s.kidx}`
    return `<p class="${ok ? 'match' : 'match no'}">${ok ? '✓' : '✗'} (${hx(s.nx, n)}, ${hx(s.ny, n)}) ${ok ? 'equals' : 'differs from'} ${what}.</p>`
}

function simonDecIters() {
    const n = S.n,
        T = D.T,
        w = (v) => hx(v, n)
    const iters = [
        {
            label: 'setup',
            steps: [
                {
                    line: 44,
                    say: `${C('simon_decrypt')} is called with the ciphertext x = ${w(D.cx)}, y = ${w(D.cy)}, and the same key and n.`,
                },
                {
                    line: 45,
                    say: `${C('_check')} passes, exactly as it did for encryption.`,
                },
                {
                    line: 46,
                    say: `${C('reversed(simon_round_keys(key, n))')} builds the same ${T} round keys and hands them out last first: k[${T - 1}], k[${T - 2}], …, k[0].`,
                },
            ],
        },
    ]
    for (const s of D.dec) {
        const kn = `k = k[${s.kidx}]`
        iters.push({
            label: `step ${s.s} · undo round ${s.kidx + 1}`,
            steps: [
                {
                    line: 46,
                    say: `Step ${s.s} of ${T} uses ${kn}, the key of encryption round ${s.kidx + 1}. The state coming in is the output of that round.`,
                    body: vars(
                        ruler(n),
                        row('x', s.x, n),
                        row('y', s.y, n),
                        row(kn, s.k, n),
                    ),
                },
                {
                    line: 36,
                    say: `${C('simon_f(y, n)')} recomputes the f that encryption round ${s.kidx + 1} used: that round copied its input x into y, so y holds exactly the value f was computed from.`,
                    body: vars(
                        ruler(n),
                        row('v = y', s.y, n),
                        row('rol(v, 1, n) & rol(v, 8, n)', s.and, n, {
                            sub: 'the AND, as in chapter 6',
                        }),
                        row('rol(v, 2, n)', s.s2, n, { op: '^' }),
                        row('simon_f(y, n)', s.f, n, { res: true }),
                    ),
                },
                {
                    line: 47,
                    say: `The new y is x ^ simon_f(y, n) ^ k. Encryption made x = y<sub>old</sub> ^ f ^ k, so XORing f and k in again cancels them and leaves y<sub>old</sub>.`,
                    body: vars(
                        ruler(n),
                        row('x', s.x, n),
                        row('simon_f(y, n)', s.f, n, { op: '^' }),
                        row(kn, s.k, n, { op: '^' }),
                        row('new y', s.ny, n, { res: true, diff: s.ny ^ s.y }),
                    ),
                },
                {
                    line: 47,
                    say: `The new x is the old y, which undoes the swap.`,
                    body:
                        vars(
                            ruler(n),
                            row('old y', s.y, n),
                            row('new x', s.nx, n, {
                                res: true,
                                diff: s.nx ^ s.x,
                            }),
                        ) + matchLine(s),
                },
            ],
        })
    }
    iters.push({
        label: 'return',
        steps: [
            {
                line: 48,
                say: `After ${T} steps the function returns (${w(D.px)}, ${w(D.py)}).`,
                body: `<p class="${D.px === S.x && D.py === S.y ? 'match' : 'match no'}">${D.px === S.x && D.py === S.y ? '✓ This is the original plaintext.' : '✗ This is not the plaintext.'}</p>`,
            },
        ],
    })
    return iters
}

function speckDecIters() {
    const n = S.n,
        T = D.T,
        [a, b] = speckAB(n),
        w = (v) => hx(v, n),
        cols = n + 1
    const iters = [
        {
            label: 'setup',
            steps: [
                {
                    line: 69,
                    say: `${C('speck_decrypt')} is called with the ciphertext x = ${w(D.cx)}, y = ${w(D.cy)}, and the same key and n.`,
                },
                {
                    line: 70,
                    say: `${C('_check')} passes, exactly as it did for encryption.`,
                },
                {
                    line: 71,
                    say: `a, b = ${a}, ${b} and mask = ${w(D.mask)}, as in encryption.`,
                },
                {
                    line: 72,
                    say: `${C('reversed(speck_round_keys(key, n))')} builds the same ${T} round keys and hands them out last first: k[${T - 1}], k[${T - 2}], …, k[0].`,
                },
            ],
        },
    ]
    for (const s of D.dec) {
        const kn = `k = k[${s.kidx}]`,
            R = D.rounds[s.kidx]
        iters.push({
            label: `step ${s.s} · undo round ${s.kidx + 1}`,
            steps: [
                {
                    line: 72,
                    say: `Step ${s.s} of ${T} uses ${kn}, the key of encryption round ${s.kidx + 1}. The state coming in is the output of that round. Decryption undoes line 66 first, then line 65.`,
                    body: vars(
                        ruler(n),
                        row('x', s.x, n),
                        row('y', s.y, n),
                        row(kn, s.k, n),
                    ),
                },
                {
                    line: 73,
                    say: `x ^ y cancels the x that line 66 XORed into y, leaving rol(y<sub>old</sub>, b, n).`,
                    body: vars(
                        ruler(n),
                        row('x', s.x, n),
                        row('y', s.y, n, { op: '^' }),
                        row('x ^ y', s.xy, n, { res: true }),
                    ),
                },
                {
                    line: 73,
                    say: `ror(…, b, n) rotates right by b = ${b}, undoing the left rotation, so the new y is y<sub>old</sub>.`,
                    body:
                        vars(
                            ruler(n),
                            row('x ^ y', s.xy, n),
                            row('new y', s.ny, n, {
                                res: true,
                                mark: highBits(b, n),
                                sub: `= y before round ${s.kidx + 1}`,
                            }),
                        ) +
                        `<p class="${s.ny === R.y ? 'match' : 'match no'}">${s.ny === R.y ? '✓' : '✗'} matches y before encryption round ${s.kidx + 1}.</p>`,
                },
                {
                    line: 74,
                    say: `x ^ k removes the round key, leaving the masked sum that line 65 produced.`,
                    body: vars(
                        ruler(n),
                        row('x', s.x, n),
                        row(kn, s.k, n, { op: '^' }),
                        row('x ^ k', s.xk, n, { res: true }),
                    ),
                },
                {
                    line: 74,
                    say: `Subtracting the new y undoes the addition. If the result is negative, & mask wraps it back into ${n} bits, just as the addition wrapped. Coloured cells are borrows.`,
                    body: vars(
                        ruler(n, cols),
                        row('x ^ k', s.xk, n, { cols }),
                        row('y (new)', s.ny, n, { cols, op: '-' }),
                        row('borrows', s.borrows, n, {
                            cols,
                            over: 1,
                            acc: true,
                            sub: 'a coloured cell borrows from the bit to its left',
                        }),
                        row('(x ^ k) - y', s.diff, n, {
                            cols,
                            over: 1,
                            res: true,
                            hex: hx(s.diff, n),
                            sub:
                                s.diff < 0n
                                    ? 'negative: Python has no fixed width'
                                    : 'not negative this time',
                        }),
                        row('(…) & mask', s.masked, n, {
                            cols,
                            res: true,
                            sub: `= ror(x, a, n) from round ${s.kidx + 1}`,
                        }),
                    ),
                },
                {
                    line: 74,
                    say: `rol(…, a, n) rotates left by a = ${a}, undoing the right rotation, so the new x is x<sub>old</sub>.`,
                    body:
                        vars(
                            ruler(n),
                            row('(…) & mask', s.masked, n),
                            row('new x', s.nx, n, {
                                res: true,
                                mark: lowBits(a),
                            }),
                        ) + matchLine(s),
                },
            ],
        })
    }
    iters.push({
        label: 'return',
        steps: [
            {
                line: 75,
                say: `After ${T} steps the function returns (${w(D.px)}, ${w(D.py)}).`,
                body: `<p class="${D.px === S.x && D.py === S.y ? 'match' : 'match no'}">${D.px === S.x && D.py === S.y ? '✓ This is the original plaintext.' : '✗ This is not the plaintext.'}</p>`,
            },
        ],
    })
    return iters
}

function renderDecryption(el) {
    const { n, cipher } = S,
        simon = cipher === 'simon',
        T = D.T
    const okAll = D.dec.every(
        (s) => s.nx === D.states[s.kidx][0] && s.ny === D.states[s.kidx][1],
    )
    el.innerHTML = `
  <p class="prose">To decrypt, ${C(cipher + '_decrypt')} uses the same round keys in reverse order and undoes each round. ${
      simon
          ? "SIMON's round is easy to reverse: the swap is undone by swapping back, and XOR undoes itself. The same simon_f is used in both directions; it never needs to be inverted."
          : "SPECK's round must be undone operation by operation, in reverse order: XOR undoes XOR, ror undoes rol, rol undoes ror, and subtraction undoes addition."
  }</p>
  <p class="prose">Decryption step s uses key k[T − s] and should land on the encryption state after round T − s. Every step below checks this.</p>
  <div id="decDbg"></div>
  <p class="${okAll ? 'match' : 'match no'}">${okAll ? `✓ All ${T} steps reproduce the matching encryption state, ending on the plaintext.` : '✗ At least one step does not match.'}</p>
  <details><summary>Table of all ${T} decryption steps</summary><div class="inner"><div class="tbl"><table>
    <thead><tr><th scope="col" class="num">Step</th><th scope="col">Key used</th><th scope="col">x after</th><th scope="col">y after</th><th scope="col">Equals encryption state</th></tr></thead>
    <tbody>${D.dec
        .map((s) => {
            const ok =
                s.nx === D.states[s.kidx][0] && s.ny === D.states[s.kidx][1]
            return `<tr><td class="num">${s.s}</td><td class="mono">k[${s.kidx}]</td><td class="hex">${hexw(s.nx, n)}</td><td class="hex">${hexw(s.ny, n)}</td><td>${s.kidx === 0 ? 'plaintext' : 'after round ' + s.kidx} <span class="${ok ? 'pass' : 'fail'}">${ok ? '✓' : '✗'}</span></td></tr>`
        })
        .join('')}</tbody>
  </table></div></div></details>`
    const st = new Stepper($('#decDbg', el), {
        name: 'dec',
        label: 'Decryption step',
        pos: decPos,
        codeLabel: simon
            ? 'ref.py lines 36 and 44–48'
            : 'ref.py lines 69–75, speck_decrypt',
    })
    st.setIters(
        simon ? simonDecIters() : speckDecIters(),
        simon
            ? [
                  [36, 36],
                  [44, 48],
              ]
            : [[69, 75]],
    )
}
