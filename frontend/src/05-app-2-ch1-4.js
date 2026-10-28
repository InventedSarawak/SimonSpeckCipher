// ======================================================================================
// Chapter 1 · At a glance
// ======================================================================================
function chNum(id) {
    return CH.findIndex((c) => c.id === id) + 1
}
function chLink(id) {
    const i = chNum(id)
    return `<a href="#${id}" data-go="${id}">${i}. ${esc(CH[i - 1].title)}</a>`
}

function renderGlance(el) {
    const { cipher, n } = S,
        w = (v) => hexw(v, n),
        simon = cipher === 'simon'
    let sn = 0
    const box = (id, title, lines) =>
        `<button type="button" class="step-btn" data-go="${id}"><b><span class="sn">${++sn}</span>${title}</b>${lines.map((l) => `<code>${l}</code>`).join('')}<span class="go">Chapter ${chNum(id)} →</span></button>`
    const arrow = `<span class="arrow" aria-hidden="true">→</span>`
    const map = [
        [
            '1–5',
            "Z: five fixed 62-bit sequences that SIMON's key schedule mixes in",
            'round-keys',
        ],
        [
            '7–8',
            'SIMON table: for each (n, m), the number of rounds T and which Z sequence j to use',
            'inputs',
        ],
        [
            '9–10',
            'SPECK table: for each (n, m), the number of rounds T',
            'inputs',
        ],
        [
            '12–13',
            'rol and ror: rotate an n-bit word left or right',
            'rotations',
        ],
        [
            '15–21',
            "_check: reject unsupported variants and values that don't fit",
            'check',
        ],
        [
            '23–34',
            'simon_round_keys: expand the key into T round keys',
            'round-keys',
        ],
        ['36', "simon_f: SIMON's mixing function", 'one-round'],
        ['38–42', 'simon_encrypt', 'all-rounds'],
        ['44–48', 'simon_decrypt', 'decryption'],
        ['50–59', 'speck_round_keys', 'round-keys'],
        ['61–67', 'speck_encrypt', 'all-rounds'],
        ['69–75', 'speck_decrypt', 'decryption'],
        ['77–100', 'VECTORS: the 20 published test vectors', 'testing'],
        [
            '102–110',
            'The test block that runs them when you execute the file',
            'testing',
        ],
    ]
    const sw = (v, w2, o = {}) => bits(v, w2, o)
    el.innerHTML = `
  <p class="lede">ref.py implements two families of <dfn>block ciphers</dfn> (a block cipher scrambles a fixed-size block of bits using a secret key, and the same key unscrambles it) from the 2013 NSA paper <i>The SIMON and SPECK Families of Lightweight Block Ciphers</i>. Each family has ten <dfn>variants</dfn> (pairs of block size and key size), and the file supports all twenty in about 75 lines of code.</p>
  <div class="fams">
    <div class="fam c-simon"><h4>SIMON</h4>
      <p>A <dfn>Feistel cipher</dfn>: each round changes one half of the block using the other half, then swaps the halves. Its only nonlinear operation is bitwise AND. It was tuned for hardware.</p>
      <ul><li>${C('simon_round_keys')} · lines 23–34</li><li>${C('simon_encrypt')} · lines 38–42</li><li>${C('simon_decrypt')} · lines 44–48</li><li>helper ${C('simon_f')} · line 36</li></ul></div>
    <div class="fam c-speck"><h4>SPECK</h4>
      <p>An <dfn>ARX cipher</dfn>: built only from Addition, Rotation and XOR. Its only nonlinear operation is addition. It was tuned for software.</p>
      <ul><li>${C('speck_round_keys')} · lines 50–59</li><li>${C('speck_encrypt')} · lines 61–67</li><li>${C('speck_decrypt')} · lines 69–75</li></ul></div>
  </div>
  <p class="prose">Both families share the constant tables (lines 1–10), the rotation helpers ${C('rol')} and ${C('ror')} (12–13) and the validator ${C('_check')} (15–21). A test block at the bottom (lines 77–110) runs all 20 published test vectors when you execute the file with ${C('python3 ref.py')}.</p>

  <h3>The pipeline, with your numbers</h3>
  <p class="prose">This is what one call to ${C(cipher + '_encrypt')} and then ${C(cipher + '_decrypt')} does with the current inputs (${D.name}). Click a stage to open its chapter.</p>
  <div class="pipe" role="list">
    ${[
        box('inputs', 'Inputs', [
            `key ${paperKey()}`,
            `x y = ${w(S.x)} ${w(S.y)}`,
        ]),
        box('check', '_check', ['both checks pass']),
        box('round-keys', 'Round keys', [
            `T = ${D.T} keys`,
            `k[0] = ${w(D.rk[0])}`,
            `k[${D.T - 1}] = ${w(D.rk[D.T - 1])}`,
        ]),
        box('one-round', `${D.T} rounds`, [
            `after round 1: ${w(D.states[1][0])} ${w(D.states[1][1])}`,
        ]),
        box('all-rounds', 'Ciphertext', [
            `${w(D.cx)} ${w(D.cy)}`,
            D.isPaper ? 'matches the paper ✓' : 'your own inputs',
        ]),
        box('decryption', 'Decrypt back', [
            `${w(D.px)} ${w(D.py)}`,
            D.px === S.x && D.py === S.y ? '= plaintext ✓' : '≠ plaintext ✗',
        ]),
    ]
        .map(
            (b) => `<span role="listitem" style="display:contents">${b}</span>`,
        )
        .join(arrow)}
  </div>

  <h3>Map of the file</h3>
  <div class="tbl"><table>
    <thead><tr><th scope="col">Lines</th><th scope="col">What is there</th><th scope="col">Explained in</th></tr></thead>
    <tbody>${map.map(([l, what, id]) => `<tr><td class="nowrap mono">${l}</td><td>${esc(what)}</td><td class="nowrap">${chLink(id)}</td></tr>`).join('')}</tbody>
  </table></div>

  <h3>How to read this page</h3>
  <ul class="prose">
    <li>Pick a cipher and its inputs in ${chLink('inputs')}. Every number on every page is computed live from them, in your browser.</li>
    <li>Code excerpts use the same line numbers as ref.py. The highlighted line is the one being explained.</li>
    <li>Chapters 3, 5, 6 and 8 are step-through debuggers. The slider picks a loop iteration; <b>Next</b> and <b>Previous</b> walk through the lines inside it; <b>Play</b> steps automatically.</li>
    <li>Every value is drawn as a strip of bits, most significant bit on the left (the same order as the hex digits beside it).</li>
    <li>Move between chapters with the list on the left, the buttons at the bottom, or the ← and → keys.</li>
  </ul>

  <h3>Colour legend</h3>
  <ul class="legend">
    <li><span class="sw">${sw(0xa5n, 8)}</span><span>A word, most significant bit first. Solid cells are 1s and pale cells are 0s, so this is <code>0xa5</code> = 1010 0101.</span></li>
    <li><span class="sw">${sw(0xa5n, 8, { diff: 0x0fn })}</span><span>Outlined cells changed compared with the step's input.</span></li>
    <li><span class="sw">${sw(0x1a5n, 8, { over: 1 })}</span><span>Hatched cells sit beyond the n-bit word; <code>&amp; mask</code> cuts them off.</span></li>
    <li><span class="sw">${sw(0xa5n, 8, { mark: 0x07n })}</span><span>Underlined cells are bits that wrapped around in a rotation.</span></li>
    <li><span class="sw">${sw(0x36n, 8, { acc: true })}</span><span>Coloured cells in a "carries" or "borrows" row mark where a carry or borrow happened.</span></li>
    <li><span class="sw"><span class="sw-line"></span></span><span>The highlighted code line is the one being explained. A struck-through line is skipped this time.</span></li>
    <li><span class="sw"><span class="sw-acc" style="background:var(--simon)"></span>&nbsp;<span class="sw-acc" style="background:var(--speck)"></span></span><span>Blue marks SIMON and orange marks SPECK. The whole page takes the colour of the cipher you pick.</span></li>
    <li><span class="sw">${tag('nonlinear')}</span><span>Marks the one operation in each cipher that is not linear.</span></li>
  </ul>

  <h3>Words used on this page</h3>
  <dl class="glossary">
    <dt>bit, word</dt><dd>A bit is a 0 or a 1. A word is n bits handled as one number; n is 16, 24, 32, 48 or 64.</dd>
    <dt>hex</dt><dd>Base 16. Each hex digit stands for exactly 4 bits, so a 16-bit word is 4 hex digits.</dd>
    <dt>block</dt><dd>The unit the cipher encrypts: two words, x and y, so 2n bits.</dd>
    <dt>key words</dt><dd>The secret key, split into m words of n bits each.</dd>
    <dt>round, round key</dt><dd>A round is one pass of the same scrambling step. Each round mixes in its own round key, derived from the key.</dd>
    <dt>XOR (⊕, <code>^</code>)</dt><dd>Bitwise "exclusive or": 1 where the two inputs differ. XOR with the same value twice cancels out.</dd>
    <dt>AND (<code>&amp;</code>)</dt><dd>Bitwise "and": 1 only where both inputs are 1.</dd>
    <dt>rotation</dt><dd>Shifting a word's bits left or right, with the bits that fall off one end coming back in at the other.</dd>
    <dt>addition mod 2<sup>n</sup></dt><dd>Ordinary addition that throws away any carry out of the top bit, so the result still fits in n bits.</dd>
    <dt>mask</dt><dd>A word with all n bits set (2<sup>n</sup> − 1). <code>v &amp; mask</code> keeps only the low n bits of v.</dd>
    <dt>linear, nonlinear</dt><dd>XOR and rotation are linear: they can be undone and predicted with simple algebra. A cipher needs at least one nonlinear step, or it can be solved like a system of equations.</dd>
    <dt>test vector</dt><dd>A published key, plaintext and correct ciphertext, used to check an implementation.</dd>
  </dl>`
}

// ======================================================================================
// Chapter 2 · Inputs
// ======================================================================================
let inputsMsg = null // {text, ok}: shown after the chapter re-renders
const VARIANTS = [...SIMON.keys()].map((k) => k.split(',').map(Number)) // [[16,4], [24,3], ...]

function wordField(id, label, value) {
    return `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" value="${value}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${id}-err"><p class="err" id="${id}-err" hidden></p></div>`
}
function showErr(inp, msg) {
    const p = $('#' + inp.id + '-err')
    p.hidden = !msg
    p.textContent = msg || ''
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false')
}
function readWord(inp, n) {
    const t = inp.value.trim().replace(/^0x/i, '').replace(/[\s_]/g, '')
    let err = null,
        v = null
    if (!t)
        err =
            'Enter a value in hex, for example ' +
            '1a2b3c4d5e6f7081'.slice(0, n / 4) +
            '.'
    else if (!/^[0-9a-f]+$/i.test(t)) err = 'Use hex digits only: 0–9 and a–f.'
    else {
        v = BigInt('0x' + t)
        if (v >> BigInt(n))
            err = `Too big for a ${n}-bit word. Use at most ${n / 4} hex digits; the largest allowed value is ${'f'.repeat(n / 4)}.`
    }
    showErr(inp, err)
    return err ? null : v
}
function randomWord(n) {
    const b = new Uint8Array(n / 8)
    crypto.getRandomValues(b)
    return b.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n)
}

function renderInputs(el) {
    const { cipher, n, m } = S,
        simon = cipher === 'simon',
        T = simon ? 'SIMON' : 'SPECK'
    const keyOpts = VARIANTS.filter(([nn]) => nn === n).map(([, mm]) => mm)
    const fields = []
    for (let idx = m - 1; idx >= 0; idx--)
        fields.push(
            wordField(
                `kw${idx}`,
                `${paperName(cipher, idx)} <span class="hint">→ key[${idx}]</span>`,
                hexw(S.key[idx], n),
            ),
        )
    const [a, b] = speckAB(n),
        [Ts, js] = SIMON.get(`${n},${m}`),
        Tp = SPECK.get(`${n},${m}`)
    const keyList = `[${S.key.map((v) => hx(v, n)).join(', ')}]`
    const vt = `(${n}, "${D.vec[1]}", "${D.vec[2]}", "${D.vec[3]}")`
    const tbl = (head, rows) =>
        `<tr><th scope="colgroup" colspan="4">${head}</th></tr>` +
        rows
            .map(
                (r) =>
                    `<tr><td class="nowrap" data-label="Name in the code">${r[0]}</td><td data-label="What it is">${r[1]}</td><td data-label="Allowed values">${r[2]}</td><td class="mono" data-label="Your current value" style="word-break:break-all;font-size:.82rem">${r[3]}</td></tr>`,
            )
            .join('')
    const sevenTen = { 7: [], 8: [], 9: [], 10: [] }
    const simonEntry = `(${n}, ${m}): (${Ts}, ${js})`,
        speckEntry = `(${n}, ${m}): ${Tp}`
    const sLine = LINES[6].includes(simonEntry) ? 7 : 8,
        pLine = LINES[8].includes(speckEntry) ? 9 : 10
    sevenTen[sLine].push(simonEntry)
    sevenTen[pLine].push(speckEntry)
    const paperOrder = [...S.key.keys()].reverse()

    el.innerHTML = `
  <form id="inForm" class="panel" novalidate>
    <div class="form-row">
      <fieldset><legend>Cipher</legend><div class="seg">
        <input type="radio" name="cipher" id="ciSimon" value="simon"${simon ? ' checked' : ''}><label for="ciSimon">SIMON</label>
        <input type="radio" name="cipher" id="ciSpeck" value="speck"${simon ? '' : ' checked'}><label for="ciSpeck">SPECK</label>
      </div></fieldset>
      <div class="field"><label for="selBlock">Block size (2n)</label><select id="selBlock">${[16, 24, 32, 48, 64].map((nn) => `<option value="${nn}"${nn === n ? ' selected' : ''}>${2 * nn} bits (n = ${nn})</option>`).join('')}</select></div>
      <div class="field"><label for="selKey">Key size (m·n)</label><select id="selKey">${keyOpts.map((mm) => `<option value="${mm}"${mm === m ? ' selected' : ''}>${mm * n} bits (m = ${mm})</option>`).join('')}</select></div>
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:0">Changing the cipher, block size or key size loads that variant's test vector from the paper straight away.</p>
    <fieldset><legend>Key words in the paper's order, most significant first (hex)</legend><div class="words">${fields.join('')}</div></fieldset>
    <fieldset style="margin-top:.9rem"><legend>Plaintext block (hex)</legend><div class="words">
      ${wordField('ptx', `x <span class="hint">left / high word</span>`, hexw(S.x, n))}
      ${wordField('pty', `y <span class="hint">right / low word</span>`, hexw(S.y, n))}
    </div></fieldset>
    <div class="btn-row">
      <button type="submit" class="btn primary" id="btnApply">Apply</button>
      <button type="button" class="btn" id="btnPaper">Use the paper's test vector</button>
      <button type="button" class="btn" id="btnRandom">Use random values</button>
    </div>
    <p class="status${inputsMsg ? (inputsMsg.ok ? ' ok' : ' bad') : ''}" id="inStatus" role="status">${inputsMsg ? esc(inputsMsg.text) : ''}</p>
  </form>

  <h3>Every input, explained</h3>
  <p class="prose">The public functions all take the same four arguments, ${C(`${cipher}_encrypt(x, y, key, n)`)}. Everything else is derived from them inside the function.</p>
  <div class="tbl stack"><table>
    <thead><tr><th scope="col">Name in the code</th><th scope="col">What it is</th><th scope="col">Allowed values</th><th scope="col">Your current value</th></tr></thead>
    <tbody>
    ${tbl('You supply these', [
        [
            C('n'),
            `Word size in bits. A block is two words, so 2n bits.`,
            `16, 24, 32, 48 or 64`,
            `${n} (block = ${2 * n} bits)`,
        ],
        [
            C('key'),
            `A Python list of m words, <b>least significant word first</b>. ${simon ? 'For SIMON it is <code>[k0, k1, …, k_{m−1}]</code>, and these words are also the first m round keys.' : 'For SPECK it is <code>[k0, l0, …, l_{m−2}]</code>: k0 is the first round key and the l words feed the key schedule.'} Key size is m·n bits.`,
            `m words, each 0 ≤ w &lt; 2<sup>${n}</sup>`,
            `${keyList}`,
        ],
        [
            C('x'),
            `The plaintext's left (high) word, written first in the paper. The function returns the ciphertext's left word in the same place.`,
            `0 ≤ x &lt; 2<sup>${n}</sup>`,
            hx(S.x, n),
        ],
        [
            C('y'),
            `The plaintext's right (low) word, written second. Returned as the ciphertext's right word.`,
            `0 ≤ y &lt; 2<sup>${n}</sup>`,
            hx(S.y, n),
        ],
    ])}
    ${tbl('Derived inside the functions', [
        [
            C('m'),
            `Number of key words, <code>len(key)</code> (lines 26, 53). Together with n it selects the variant.`,
            `${keyOpts.join(' or ')} when n = ${n}`,
            `${m} (key = ${m * n} bits)`,
        ],
        [
            C('T'),
            `Number of rounds, looked up in the ${C('SIMON')} table (line 26) or the ${C('SPECK')} table (line 53).`,
            `22 to 72, depending on the variant`,
            `${D.T}`,
        ],
        [
            C('j'),
            `Which Z constant sequence SIMON's key schedule uses, from the same table as T (line 26).`,
            `0 to 4 (SIMON only)`,
            simon
                ? `${D.j}, so Z[${D.j}]`
                : `not used by SPECK (SIMON would use ${js})`,
        ],
        [
            `${C('a')}, ${C('b')}`,
            `SPECK's rotation amounts, α and β in the paper (lines 54, 63, 71).`,
            `(7, 2) if n = 16, otherwise (8, 3)`,
            simon
                ? `not used by SIMON (SPECK would use ${a}, ${b})`
                : `${a}, ${b}`,
        ],
        [
            C('mask'),
            `2<sup>n</sup> − 1: all n bits set. <code>&amp; mask</code> keeps the low n bits, since Python integers never overflow on their own.`,
            `<code>(1 &lt;&lt; n) − 1</code>`,
            hx(D.mask, n),
        ],
        [
            C('i'),
            `Loop counter in the key schedule.`,
            simon
                ? `m to T − 1 (computes k[i])`
                : `0 to T − 2 (computes l[i+m−1] and k[i+1])`,
            simon ? `${m} … ${D.T - 1}` : `0 … ${D.T - 2}`,
        ],
        [
            `${C('k')}, ${C('l')}, ${C('tmp')}`,
            `Inside <code>*_round_keys</code>, <code>k</code> is the list of round keys being built, <code>l</code> is SPECK's list of extra key-schedule words and <code>tmp</code> is SIMON's scratch word. Inside the encrypt and decrypt loops, <code>k</code> is one round key.`,
            `n-bit words`,
            `see chapter 5`,
        ],
    ])}
    ${tbl('Helper parameters', [
        [
            `${C('rol(v, r, n)')}<br>${C('ror(v, r, n)')}`,
            `Rotate the n-bit word v left (rol) or right (ror) by r places.`,
            `0 ≤ v &lt; 2<sup>n</sup>, 0 &lt; r &lt; n`,
            `rol(x, 1, ${n}) = ${hx(rol(S.x, 1, n), n)}`,
        ],
        [
            C('_check(words, n, table, *block)'),
            `<code>words</code> is the key list, <code>n</code> the word size and <code>table</code> the SIMON or SPECK dict listing valid (n, m) pairs. <code>*block</code> collects any extra arguments (x and y) into a tuple so they are range-checked too.`,
            `table is ${C('SIMON')} or ${C('SPECK')}`,
            `_check(key, ${n}, ${T}, x, y) passes`,
        ],
        [
            C('simon_f(v, n)'),
            `SIMON's mixing function. v is the word being mixed: x when encrypting, y when decrypting.`,
            `0 ≤ v &lt; 2<sup>n</sup>`,
            `simon_f(x, ${n}) = ${hx(simon_f(S.x, n), n)}`,
        ],
        [
            `${C('VECTORS')} entry`,
            `A tuple <code>(n, key text, plaintext text, ciphertext text)</code>. The texts are hex words separated by spaces, in the paper's order (most significant word first).`,
            `20 entries, one per variant`,
            esc(vt),
        ],
    ])}
    </tbody>
  </table></div>

  <h3>From the paper's order to the code's order</h3>
  <p class="prose">The paper writes the key with the most significant word on the left. The code wants the least significant word first, so line 106 reverses the list with ${C('[::-1]')}. ${simon ? 'For SIMON, key[i] is k<sub>i</sub>.' : 'For SPECK, key[0] is k<sub>0</sub> and key[i] is ℓ<sub>i−1</sub>.'}</p>
  <div class="rev" style="--m:${m}">
    <div class="cap"><span>paper order (as typed above, and in VECTORS)</span></div>
    <div class="rev-row">${paperOrder.map((idx) => `<div class="chip"><span class="nm">${paperName(cipher, idx)}</span><code>${hexw(S.key[idx], n)}</code></div>`).join('')}</div>
    <svg viewBox="0 0 ${m * 100} 48" preserveAspectRatio="none" aria-hidden="true">${paperOrder.map((idx, pos) => `<line x1="${pos * 100 + 50}" y1="2" x2="${idx * 100 + 50}" y2="46" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}</svg>
    <div class="rev-row">${S.key.map((v, idx) => `<div class="chip code-order"><span class="nm">key[${idx}] = ${codeName(cipher, idx)}</span><code>${hexw(v, n)}</code></div>`).join('')}</div>
    <div class="cap"><span>code order, after <code>[::-1]</code> on line 106</span></div>
  </div>
  ${codeView([[105, 108]], { on: 106, marks: { 106: '[::-1]' } })}
  <p class="prose">With your inputs, line 106 turns ${C(`"${paperKey()}"`)} into ${C(`[${S.key.map((v) => hx(v, n)).join(', ')}]`)}, and line 107 reads x = ${hx(S.x, n)} and y = ${hx(S.y, n)}. The docstrings on lines 24 and 51 record the same rule:</p>
  ${codeView(
      [
          [24, 24],
          [51, 51],
      ],
      { on: simon ? 24 : 51 },
  )}

  <h3>The parameter tables</h3>
  <p class="prose">Lines 7–10 list every supported (n, m) pair. The outlined entries are the ones your variant looks up.</p>
  ${codeView([[7, 10]], { on: simon ? sLine : pLine, marks: sevenTen })}
  <div class="tbl"><table>
    <thead><tr><th scope="col">Block / key</th><th scope="col" class="num">n</th><th scope="col" class="num">m</th><th scope="col" class="num">SIMON T</th><th scope="col" class="num">SIMON j</th><th scope="col" class="num">SPECK T</th><th scope="col">SPECK (a, b)</th></tr></thead>
    <tbody>${VARIANTS.map(([nn, mm]) => {
        const [t, j] = SIMON.get(`${nn},${mm}`),
            [aa, bb] = speckAB(nn),
            curRow = nn === n && mm === m
        return `<tr${curRow ? ' class="cur" aria-current="true"' : ''}><td class="nowrap">${2 * nn}/${nn * mm}${curRow ? ' <span class="sr">(your variant)</span>' : ''}</td><td class="num">${nn}</td><td class="num">${mm}</td><td class="num">${t}</td><td class="num">${j}</td><td class="num">${SPECK.get(`${nn},${mm}`)}</td><td>(${aa}, ${bb})</td></tr>`
    }).join('')}</tbody>
  </table></div>
  <p class="prose">Inside the functions, these lines read the table and set up the derived values:</p>
  ${codeView(simon ? [[26, 26]] : [[53, 54]], { on: simon ? 26 : [53, 54] })}`

    inputsMsg = null // a message is shown once
    // ---- events ----
    const form = $('#inForm', el)
    const loadVariant = (c, nn, mm, how) => {
        inputsMsg = {
            ok: true,
            text: `Loaded the paper's test vector for ${vname(c, nn, mm)}${how || ''}.`,
        }
        setState(vectorState(c, nn, mm))
    }
    form.addEventListener('change', (e) => {
        const t = e.target
        if (t.name === 'cipher') loadVariant(t.value, n, m)
        else if (t.id === 'selBlock') {
            const nn = +t.value,
                opts = VARIANTS.filter(([x]) => x === nn).map(([, x]) => x)
            loadVariant(cipher, nn, opts.includes(m) ? m : opts[0])
        } else if (t.id === 'selKey') loadVariant(cipher, n, +t.value)
    })
    form.addEventListener('input', (e) => {
        if (e.target.getAttribute('aria-invalid') === 'true')
            showErr(e.target, null)
    })
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        const key = [],
            bad = []
        for (let idx = 0; idx < m; idx++) {
            const inp = $('#kw' + idx, form),
                v = readWord(inp, n)
            if (v === null) bad.push(inp)
            key.push(v)
        }
        const xi = $('#ptx', form),
            yi = $('#pty', form),
            x = readWord(xi, n),
            y = readWord(yi, n)
        if (x === null) bad.push(xi)
        if (y === null) bad.push(yi)
        if (bad.length) {
            const first = [
                ...form.querySelectorAll('input[aria-invalid=true]'),
            ][0]
            const st = $('#inStatus', form)
            st.className = 'status bad'
            st.textContent = `Nothing was applied: ${plural(bad.length, 'field needs', 'fields need')} fixing.`
            first.focus()
            return
        }
        const [cx, cy] = (cipher === 'simon' ? simon_encrypt : speck_encrypt)(
            x,
            y,
            key,
            n,
        )
        inputsMsg = {
            ok: true,
            text: `Applied. ${D.name} encrypts ${hexw(x, n)} ${hexw(y, n)} to ${hexw(cx, n)} ${hexw(cy, n)}.`,
        }
        setState({ key, x, y })
    })
    $('#btnPaper', el).addEventListener('click', () =>
        loadVariant(cipher, n, m),
    )
    $('#btnRandom', el).addEventListener('click', () => {
        inputsMsg = { ok: true, text: `Loaded random values for ${D.name}.` }
        setState({
            key: Array.from({ length: m }, () => randomWord(n)),
            x: randomWord(n),
            y: randomWord(n),
        })
    })
}

// ======================================================================================
// Chapter 3 · Checking the inputs
// ======================================================================================
const checkUI = { demo: 'pass', custom: '' }

function checkScenario() {
    const { cipher, n, m, key, x, y } = S,
        table = cipher === 'simon' ? SIMON : SPECK
    let words = key,
        block = [x, y],
        title = 'Your inputs',
        what = ''
    if (checkUI.demo === 'count') {
        const mm = [m - 1, m + 1, 1, 5].find(
            (k) => k >= 1 && !table.has(`${n},${k}`),
        )
        words = mm < m ? key.slice(0, mm) : [...key, ...Array(mm - m).fill(0n)]
        title = 'Wrong number of key words'
        what =
            mm < m
                ? `the key loses its last ${plural(m - mm, 'word')}, leaving ${mm}`
                : `${plural(mm - m, 'zero word')} ${mm - m === 1 ? 'is' : 'are'} added, making ${mm}`
    } else if (checkUI.demo === 'big') {
        block = [1n << BigInt(n), y]
        title = 'Oversized word'
        what = `x is replaced by 2<sup>${n}</sup> = ${hx(1n << BigInt(n), n)}, one more than the largest ${n}-bit value`
    } else if (checkUI.demo === 'custom') {
        block = [checkUI.customV, y]
        title = 'Your own value for x'
        what = `x is replaced by ${esc(pyHex(checkUI.customV))}`
    }
    let error = null
    try {
        _check(words, n, table, ...block)
    } catch (e) {
        error = e
    }
    return {
        words,
        block,
        title,
        what,
        error,
        table,
        tname: cipher === 'simon' ? 'SIMON' : 'SPECK',
    }
}

function checkIters(sc) {
    const { n, cipher } = S,
        { words, block, tname, table } = sc,
        steps = []
    const caller = cipher === 'simon' ? 39 : 62,
        fn = cipher + '_encrypt'
    const all = [...words, ...block],
        labels = [...words.map((_, i) => `key[${i}]`), 'x', 'y']
    const listTxt = `[${words.map((v) => hx(v, n)).join(', ')}]`
    const lim = 1n << BigInt(n)
    steps.push({
        line: 15,
        say: `Line ${caller} of ${C(fn)} calls ${C('_check')} with words = ${C(listTxt)}, n = ${n}, table = ${C(tname)} and *block = (${block.map((v) => esc(pyHex(v))).join(', ')}). The <code>*</code> gathers the extra arguments x and y into the tuple <code>block</code>.`,
    })
    steps.push({
        line: 16,
        say: `The docstring states the job: reject unsupported variants and values that don't fit in an n-bit word.`,
    })
    const inTable = table.has(`${n},${words.length}`)
    steps.push({
        line: 17,
        say: `len(words) = ${words.length}, so the test is whether (${n}, ${words.length}) is a key of ${C(tname)}. ${inTable ? 'It is, so the condition is false and line 18 is skipped.' : 'It is not, so the condition is true.'}`,
        body: `<div class="tbl"><table><thead><tr><th>(n, m) pairs in ${tname} with n = ${n}</th><th>matches (${n}, ${words.length})?</th></tr></thead><tbody>${VARIANTS.filter(
            ([nn]) => nn === n,
        )
            .map(
                ([nn, mm]) =>
                    `<tr${mm === words.length ? ' class="cur"' : ''}><td class="mono">(${nn}, ${mm})</td><td>${mm === words.length ? '<span class="pass">yes</span>' : 'no'}</td></tr>`,
            )
            .join('')}</tbody></table></div>`,
    })
    if (!inTable) {
        steps.push({
            line: 18,
            say: `Line 18 raises ${C('ValueError')}. Lines 19–21 never run.`,
            skip: [19, 20, 21],
            body: traceback(sc, 18),
        })
        return [{ label: sc.title, steps }]
    }
    steps.push({
        line: 18,
        skip: [18],
        say: `Line 18 is skipped because the variant exists.`,
    })
    steps.push({
        line: 19,
        say: `The loop will look at ${plural(all.length, 'value')}: the ${words.length} key words, then the ${block.length} words of *block.`,
        skip: [18],
    })
    const table2 = (upto) =>
        `<div class="tbl"><table><thead><tr><th>v</th><th>value</th><th>0 ≤ v</th><th>v &lt; 2<sup>${n}</sup></th><th>result</th></tr></thead><tbody>${all
            .map((v, i) => {
                const done = i <= upto,
                    ok = 0n <= v && v < lim
                return `<tr${i === upto ? ' class="cur"' : ''}><td class="mono">${labels[i]}</td><td class="hex">${esc(pyHex(v))}</td><td>${done ? (0n <= v ? 'yes' : '<span class="fail">no</span>') : ''}</td><td>${done ? (v < lim ? 'yes' : '<span class="fail">no</span>') : ''}</td><td>${done ? (ok ? '<span class="pass">fits</span>' : '<span class="fail">does not fit</span>') : '<span class="muted">not checked yet</span>'}</td></tr>`
            })
            .join('')}</tbody></table></div>`
    for (let i = 0; i < all.length; i++) {
        const v = all[i],
            ok = 0n <= v && v < lim
        const over = v >= lim ? v.toString(2).length - n : 0
        const strip =
            v >= 0n
                ? vars(
                      row(labels[i], v, n, {
                          over,
                          sub: ok
                              ? `fits in ${n} bits`
                              : `needs ${v.toString(2).length} bits`,
                      }),
                  )
                : ''
        steps.push({
            line: 20,
            skip: [18],
            say: `v = ${labels[i]} = ${esc(pyHex(v))}. Is 0 ≤ v &lt; 2<sup>${n}</sup> (${hx(lim, n + 1)})? ${ok ? 'Yes, so the loop moves on.' : v < 0n ? 'No: it is negative.' : 'No: it needs more than ' + n + ' bits.'}`,
            body: strip + table2(i),
        })
        if (!ok) {
            steps.push({
                line: 21,
                skip: [18],
                say: `Line 21 raises ${C('ValueError')} and the loop stops early.`,
                body: traceback(sc, 21),
            })
            return [{ label: sc.title, steps }]
        }
    }
    steps.push({
        line: 19,
        skip: [18, 21],
        say: `The loop has checked every value without raising, so ${C('_check')} returns ${C('None')} and line ${caller} carries on to encrypt.`,
        body: `<pre class="out good">_check(...) returned None: the inputs are accepted.</pre>`,
    })
    return [{ label: sc.title, steps }]
}

function traceback(sc, line) {
    const caller = S.cipher === 'simon' ? 39 : 62
    return `<pre class="out bad">Traceback (most recent call last):
  File "ref.py", line ${caller}, in ${S.cipher}_encrypt
    ${esc(LINES[caller - 1].trim())}
  File "ref.py", line ${line}, in _check
    ${esc(LINES[line - 1].trim())}
${esc(sc.error.name)}: ${esc(sc.error.message)}</pre>`
}

function renderCheck(el) {
    const { cipher } = S,
        callers = cipher === 'simon' ? '25, 39 and 45' : '52, 62 and 70'
    const sc = checkScenario()
    el.innerHTML = `
  <p class="prose">${C('_check')} is the first line of all six public functions (for ${cipher.toUpperCase()}, lines ${callers}). It makes two checks and raises ${C('ValueError')} (Python's error for a value of the right type but the wrong size or content) if either fails:</p>
  <ol class="prose"><li>Line 17: does the table list this (n, m) pair? Otherwise line 18 raises.</li><li>Lines 19–20: does every key word, and x and y, fit in n bits? Otherwise line 21 raises.</li></ol>
  <div class="btn-row" role="group" aria-label="Choose what to check">
    <button type="button" class="btn${checkUI.demo === 'pass' ? ' primary' : ''}" data-demo="pass" aria-pressed="${checkUI.demo === 'pass'}">Your inputs</button>
    <button type="button" class="btn${checkUI.demo === 'count' ? ' primary' : ''}" data-demo="count" aria-pressed="${checkUI.demo === 'count'}">Wrong number of key words (line 18)</button>
    <button type="button" class="btn${checkUI.demo === 'big' ? ' primary' : ''}" data-demo="big" aria-pressed="${checkUI.demo === 'big'}">Oversized word (line 21)</button>
  </div>
  <form class="btn-row" id="customForm" novalidate>
    <div class="field" style="flex:0 1 22rem;margin:0"><label for="customX">Or try your own x (hex; may be negative)</label><input type="text" id="customX" value="${esc(checkUI.custom)}" placeholder="-5 or 1ffff" aria-describedby="customX-err" autocomplete="off" spellcheck="false"><p class="err" id="customX-err" hidden></p></div>
    <button type="submit" class="btn" style="align-self:flex-end">Check it</button>
  </form>
  <p class="callout" id="checkSummary">${sc.what ? `Demo: ${sc.what}. ` : ''}${sc.error ? `Result: <b>${esc(sc.error.name)}: ${esc(sc.error.message)}</b> (raised on line ${sc.error.message.startsWith('unsupported') ? 18 : 21}).` : 'Result: both checks pass, so the function carries on.'}</p>
  <div id="checkDbg"></div>
  <p class="prose">The error messages above come from running the page's translation of ${C('_check')}. They match Python's output character for character, including Python's ${C('{v:#x}')} format, which writes negative numbers as <code>-0x5</code>.</p>`
    const checkStepper = new Stepper($('#checkDbg', el), {
        name: 'check',
        label: 'Scenario',
        noSlider: true,
        codeLabel: 'ref.py lines 15–21, _check',
    })
    const iters = checkIters(sc)
    checkStepper.setIters(iters, [[15, 21]])
    if (sc.error) checkStepper.go(0, iters[0].steps.length - 1) // jump straight to the raising line

    el.querySelectorAll('[data-demo]').forEach((b) =>
        b.addEventListener('click', () => {
            checkUI.demo = b.dataset.demo
            renderChapter(CH[2])
            $(`[data-demo="${checkUI.demo}"]`, el)?.focus()
        }),
    )
    $('#customForm', el).addEventListener('submit', (e) => {
        e.preventDefault()
        const inp = $('#customX', el),
            raw = inp.value.trim(),
            neg = raw.startsWith('-')
        const t = raw
            .replace(/^-/, '')
            .replace(/^0x/i, '')
            .replace(/[\s_]/g, '')
        if (!/^[0-9a-f]+$/i.test(t)) {
            showErr(
                inp,
                'Use hex digits only, optionally with a leading minus sign.',
            )
            inp.focus()
            return
        }
        checkUI.custom = raw
        checkUI.customV = (neg ? -1n : 1n) * BigInt('0x' + t)
        checkUI.demo = 'custom'
        renderChapter(CH[2])
        $('#customX', el)?.focus()
    })
    $('#customX', el).addEventListener('input', (e) => showErr(e.target, null))
}

// ======================================================================================
// Chapter 4 · Rotations
// ======================================================================================
const rotUI = { fn: 'rol', r: 3, src: 'x' }

function rotationBody() {
    const n = S.n,
        { fn, src } = rotUI,
        r = clamp(rotUI.r, 1, n - 1),
        R = BigInt(r),
        N = BigInt(n)
    const v = src === 'x' ? S.x : src === 'y' ? S.y : S.key[0],
        mask = D.mask
    const left = fn === 'rol'
    const a = left ? v << R : v >> R,
        b = left ? v >> (N - R) : v << (N - R),
        or = a | b,
        res = or & mask
    const expect = (left ? rol : ror)(v, r, n)
    const cols = left ? n + r : 2 * n - r
    const wrapped = left ? (1n << R) - 1n : ((1n << R) - 1n) << (N - R)
    const srcName = src === 'key0' ? 'key[0]' : src
    const rows = left
        ? [
              row('v', v, n, { cols, sub: `${srcName}` }),
              row('v << r', a, n, {
                  cols,
                  over: r,
                  sub: `shift left by ${r}; ${r} zeros enter on the right`,
              }),
              row('v >> (n - r)', b, n, {
                  cols,
                  op: '|',
                  sub: `shift right by n − r = ${n - r}; the top ${r} bits land at the bottom`,
              }),
              row('(v << r) | (v >> (n - r))', or, n, {
                  cols,
                  over: r,
                  res: true,
                  sub: `${r} hatched bits stick out past bit ${n - 1}`,
              }),
              row('(1 << n) - 1', mask, n, { cols, op: '&', sub: 'mask' }),
              row(`rol(v, ${r}, ${n})`, res, n, {
                  cols,
                  res: true,
                  mark: wrapped,
                  sub: `underlined: the ${plural(r, 'bit')} that wrapped around`,
              }),
          ]
        : [
              row('v', v, n, { cols, sub: `${srcName}` }),
              row('v >> r', a, n, {
                  cols,
                  sub: `shift right by ${r}; the low ${plural(r, 'bit')} fall off`,
              }),
              row('v << (n - r)', b, n, {
                  cols,
                  over: n - r,
                  op: '|',
                  sub: `shift left by n − r = ${n - r}; the low ${r} bits move to the top of the word`,
              }),
              row('(v >> r) | (v << (n - r))', or, n, {
                  cols,
                  over: n - r,
                  res: true,
                  sub: `${n - r} hatched bits stick out past bit ${n - 1}`,
              }),
              row('(1 << n) - 1', mask, n, { cols, op: '&', sub: 'mask' }),
              row(`ror(v, ${r}, ${n})`, res, n, {
                  cols,
                  res: true,
                  mark: wrapped,
                  sub: `underlined: the ${plural(r, 'bit')} that wrapped around`,
              }),
          ]
    const inv = (left ? ror : rol)(res, r, n)
    return `<p class="say"><span class="lnref">line ${left ? 12 : 13}</span>${C(`${fn}(${hx(v, n)}, ${r}, ${n})`)} moves every bit ${r} ${r === 1 ? 'place' : 'places'} to the ${left ? 'left' : 'right'}; the ${plural(r, 'bit')} pushed off the ${left ? 'top' : 'bottom'} come back in at the ${left ? 'bottom' : 'top'}.</p>
    <div class="wide-scroll">${vars(ruler(n, cols), ...rows)}</div>
    <p class="note">${res === expect ? "✓ Same as calling the page's translation of " + C(fn) + '.' : '✗ Mismatch with ' + C(fn) + '.'} Rotating back with ${C(`${left ? 'ror' : 'rol'}(…, ${r}, ${n})`)} gives ${hx(inv, n)}${inv === v ? ', the original v: a rotation loses nothing.' : '.'}</p>`
}

function renderRotations(el) {
    const n = S.n
    rotUI.r = clamp(rotUI.r, 1, n - 1)
    const places = [
        [29, 'ror(k[i - 1], 3, n)', 'ror', '3', 'SIMON key schedule'],
        [32, 'ror(tmp, 1, n)', 'ror', '1', 'SIMON key schedule'],
        [36, 'rol(v, 1, n)', 'rol', '1', 'SIMON f (encrypt and decrypt)'],
        [36, 'rol(v, 8, n)', 'rol', '8', 'SIMON f'],
        [36, 'rol(v, 2, n)', 'rol', '2', 'SIMON f'],
        [
            57,
            'ror(l[i], a, n)',
            'ror',
            `a = ${speckAB(n)[0]}`,
            'SPECK key schedule',
        ],
        [
            58,
            'rol(k[i], b, n)',
            'rol',
            `b = ${speckAB(n)[1]}`,
            'SPECK key schedule',
        ],
        [65, 'ror(x, a, n)', 'ror', `a = ${speckAB(n)[0]}`, 'SPECK encrypt'],
        [66, 'rol(y, b, n)', 'rol', `b = ${speckAB(n)[1]}`, 'SPECK encrypt'],
        [
            73,
            'ror(x ^ y, b, n)',
            'ror',
            `b = ${speckAB(n)[1]}`,
            'SPECK decrypt (undoes line 66)',
        ],
        [
            74,
            'rol(…, a, n)',
            'rol',
            `a = ${speckAB(n)[0]}`,
            'SPECK decrypt (undoes line 65)',
        ],
    ]
    el.innerHTML = `
  <p class="prose">A <dfn>shift</dfn> moves bits and throws away the ones that fall off the end. A <dfn>rotation</dfn> moves bits around a circle instead, so nothing is lost. Python has no rotate operator, so lines 12–13 build one from two shifts, an OR and a mask:</p>
  ${codeView([[12, 13]], { on: rotUI.fn === 'rol' ? 12 : 13 })}
  <div class="panel">
    <div class="form-row" style="margin-top:0">
      <fieldset><legend>Function</legend><div class="seg">
        <input type="radio" name="rotfn" id="rfRol" value="rol"${rotUI.fn === 'rol' ? ' checked' : ''}><label for="rfRol">rol (left)</label>
        <input type="radio" name="rotfn" id="rfRor" value="ror"${rotUI.fn === 'ror' ? ' checked' : ''}><label for="rfRor">ror (right)</label>
      </div></fieldset>
      <div class="field"><label for="rotR">Amount r: <span id="rotRout" class="mono">${rotUI.r}</span></label><input type="range" id="rotR" min="1" max="${n - 1}" value="${rotUI.r}"></div>
      <div class="field"><label for="rotSrc">Word to rotate (v)</label><select id="rotSrc">
        <option value="x"${rotUI.src === 'x' ? ' selected' : ''}>x = ${hx(S.x, n)}</option>
        <option value="y"${rotUI.src === 'y' ? ' selected' : ''}>y = ${hx(S.y, n)}</option>
        <option value="key0"${rotUI.src === 'key0' ? ' selected' : ''}>key[0] = ${hx(S.key[0], n)}</option></select></div>
    </div>
    <div id="rotOut">${rotationBody()}</div>
  </div>
  <p class="prose">Why the mask? Python integers grow as needed and never overflow, so ${C('v << r')} really is n + r bits long. ${C('& ((1 << n) - 1)')} keeps only the low n bits, which is what a fixed-size n-bit register would do on its own.</p>

  <h3>Every rotation in ref.py</h3>
  <p class="prose">With n = ${n}. Choose "Try it" to load a row into the demo above.</p>
  <div class="tbl stack"><table>
    <thead><tr><th scope="col">Line</th><th scope="col">Code</th><th scope="col">Direction</th><th scope="col">By</th><th scope="col">Where</th><th scope="col"><span class="sr">Action</span></th></tr></thead>
    <tbody>${places.map(([l, code, fn, by, where]) => `<tr><td class="num" data-label="Line">${l}</td><td data-label="Code">${C(code)}</td><td data-label="Direction">${fn === 'rol' ? 'left' : 'right'}</td><td class="nowrap" data-label="By">${by}</td><td data-label="Where">${where}</td><td><button type="button" class="btn small" data-try="${fn},${by.replace(/\D/g, '')},${l}">Try it</button></td></tr>`).join('')}</tbody>
  </table></div>`

    const redraw = () => {
        $('#rotOut', el).innerHTML = rotationBody()
        setLines(el, rotUI.fn === 'rol' ? 12 : 13)
        $('#rotRout', el).textContent = rotUI.r
    }
    $('.panel', el).addEventListener('change', (e) => {
        if (e.target.name === 'rotfn') {
            rotUI.fn = e.target.value
            redraw()
        }
        if (e.target.id === 'rotSrc') {
            rotUI.src = e.target.value
            redraw()
        }
    })
    $('#rotR', el).addEventListener('input', (e) => {
        rotUI.r = +e.target.value
        redraw()
    })
    el.querySelectorAll('[data-try]').forEach((b) =>
        b.addEventListener('click', () => {
            const [fn, r] = b.dataset.try.split(',')
            rotUI.fn = fn
            rotUI.r = clamp(+r, 1, n - 1)
            $('#rotR', el).value = rotUI.r
            $(fn === 'rol' ? '#rfRol' : '#rfRor', el).checked = true
            redraw()
            $('#rotOut', el)
                .closest('.panel')
                .scrollIntoView({
                    behavior: reduceMotion.matches ? 'auto' : 'smooth',
                    block: 'start',
                })
        }),
    )
}
