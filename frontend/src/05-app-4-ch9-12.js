
// ======================================================================================
// Chapter 9 · Testing
// ======================================================================================
const TESTS = run_tests();             // the test block, run on page load
const TRACE_BAD = checkTracers();      // the step-through tracers must agree with the plain functions
let testMsg = "";

function renderTesting(el) {
  const { cipher, n, m } = S, simon = cipher === "simon";
  const [, keyText, pt, ct] = D.vec;
  const words = splitHex(keyText).reverse(), [x, y] = splitHex(pt);
  const [cx, cy] = (simon ? simon_encrypt : speck_encrypt)(x, y, words, n);
  const [dx, dy] = (simon ? simon_decrypt : speck_decrypt)(cx, cy, words, n);
  const got = `${hexw(cx, n)} ${hexw(cy, n)}`, me = TESTS.find(t => t.name === cipher && t.n === n && t.m === m);
  const lines = [
    [102, `Python sets ${C("__name__")} to ${C('"__main__"')} only when the file is run directly (${C("python3 ref.py")}). Importing ref.py from other code skips this block.`, "—"],
    [103, `Maps each cipher's name to its pair of functions (encrypt, decrypt).`, `"${cipher}" → (${cipher}_encrypt, ${cipher}_decrypt)`],
    [104, `Loops over both ciphers, unpacking each pair into ${C("enc")} and ${C("dec")}.`, `name = "${cipher}", enc = ${cipher}_encrypt`],
    [105, `Loops over that cipher's 10 test vectors, unpacking each tuple.`, `n = ${n}, key = "${keyText}", pt = "${pt}", ct = "${ct}"`],
    [106, `Splits the key text at the spaces, reads each word as hex (base 16) and reverses the list into code order with ${C("[::-1]")}.`, `words = [${words.map(v => hx(v, n)).join(", ")}]`],
    [107, `Reads the two plaintext words the same way.`, `x = ${hx(x, n)}, y = ${hx(y, n)}`],
    [108, `Encrypts.`, `cx = ${hx(cx, n)}, cy = ${hx(cy, n)}`],
    [109, `Formats each word as hex padded with zeros to n//4 = ${n / 4} digits and compares the result with ct. It also decrypts and checks that this gives back (x, y). Both must hold.`, `"${got}" == "${ct}" → ${got === ct ? "True" : "False"}; decrypt → (${hx(dx, n)}, ${hx(dy, n)}) == (x, y) → ${dx === x && dy === y ? "True" : "False"}`],
    [110, `Prints the variant name (block size 2n / key size n·len(words), padded to 4 characters) and OK or FAIL.`, `${me.line.replace(/ /g, "&nbsp;")}`],
  ];
  const nOk = TESTS.filter(t => t.ok).length;
  el.innerHTML = `
  <p class="prose">A <dfn>test vector</dfn> is a published key, plaintext and correct ciphertext. The paper's appendices give one for each of the 20 variants; lines 78–100 copy them into ${C("VECTORS")}. The block at the end of the file runs them all:</p>
  ${codeView([[102, 110]], { on: 106 })}
  <div class="tbl stack"><table>
    <thead><tr><th scope="col" class="num">Line</th><th scope="col">What it does</th><th scope="col">For the ${D.name} vector</th></tr></thead>
    <tbody>${lines.map(([l, what, val]) => `<tr data-line="${l}"><td class="num" data-label="Line">${l}</td><td data-label="What it does">${what}</td><td class="mono" data-label="For the ${D.name} vector" style="font-size:.8rem;word-break:break-all">${val}</td></tr>`).join("")}</tbody>
  </table></div>
  <p class="muted" style="font-size:.85rem">Hover over or focus a row to highlight its line in the code above.</p>
  <details><summary>The VECTORS table (lines 77–100)</summary><div class="inner">
    <p class="prose">Each tuple is (n, key words, plaintext, ciphertext), with every multi-word value written most significant word first, as in the paper. The highlighted line is the vector for ${D.name}.</p>
    ${codeView([[77, 100]], { on: (simon ? 80 : 91) + VECTORS[cipher].indexOf(D.vec) })}
  </div></details>

  <h3>Live results</h3>
  <p class="prose">These rows were computed when the page loaded, by running the page's translation of the test block. Click a row to load that vector as the current inputs.</p>
  <p class="${nOk === 20 ? "match" : "match no"}">${nOk === 20 ? "✓" : "✗"} ${nOk} of 20 test vectors pass, encrypting and decrypting.</p>
  <p id="testStatus" class="status ok" role="status">${esc(testMsg)}</p>
  <div class="tbl"><table>
    <thead><tr><th scope="col">Variant</th><th scope="col">Expected ciphertext</th><th scope="col">Computed ciphertext</th><th scope="col">Decrypts back</th><th scope="col">Result</th></tr></thead>
    <tbody>${TESTS.map(t => {
      const curRow = t.name === cipher && t.n === n && t.m === m, id = `tv-${t.name}-${t.n}-${t.m}`;
      return `<tr class="click${curRow ? " cur" : ""} c-${t.name}" data-tv="${t.name},${t.n},${t.m}"${curRow ? ' aria-current="true"' : ""}>
        <td><button type="button" class="btn small" id="${id}" data-tv="${t.name},${t.n},${t.m}">${vname(t.name, t.n, t.m)}</button></td>
        <td class="hex">${t.ct}</td><td class="hex">${t.got}</td>
        <td>${t.back ? '<span class="pass">✓ yes</span>' : '<span class="fail">✗ no</span>'}</td>
        <td>${t.ok ? '<span class="pass">OK</span>' : '<span class="fail">FAIL</span>'}</td></tr>`;
    }).join("")}</tbody>
  </table></div>
  <h4>What <code>python3 ref.py</code> prints</h4>
  <pre class="out${nOk === 20 ? " good" : " bad"}">${TESTS.map(t => esc(t.line)).join("\n")}</pre>
  <p class="note">${TRACE_BAD.length ? `✗ The step-through tracers disagree with the reference functions for ${TRACE_BAD.join(", ")}.` : "✓ The instrumented copies that draw chapters 5–8 also agree with the plain functions on all 20 vectors."}</p>`;
  testMsg = "";

  const code = $(".code", el);
  el.querySelectorAll("tr[data-line]").forEach(tr => {
    tr.tabIndex = 0;
    const on = () => setLines(code, +tr.dataset.line);
    tr.addEventListener("mouseenter", on); tr.addEventListener("focus", on);
  });
  el.querySelectorAll("tr[data-tv]").forEach(tr => tr.addEventListener("click", e => {
    const [c, nn, mm] = tr.dataset.tv.split(",");
    testMsg = `Loaded the ${vname(c, +nn, +mm)} test vector as the current inputs.`;
    setState(vectorState(c, +nn, +mm));
    document.getElementById(`tv-${c}-${nn}-${mm}`)?.focus({ preventScroll: true });
  }));
}

// ======================================================================================
// Chapter 10 · Why so many rounds?
// ======================================================================================
const difUI = { bit: null };
const difCache = new Map();

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0); };
}
function hashStr(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function flipped(x, y, bit, n) { return bit >= n ? [x ^ (1n << BigInt(bit - n)), y] : [x, y ^ (1n << BigInt(bit))]; }
// Add the set bits of d (a 2n-bit difference) into counts.
function countBits(d, counts, words32) {
  for (let c = 0; c < words32; c++) {
    let w = Number((d >> BigInt(32 * c)) & 0xffffffffn);
    while (w) { const low = w & -w; counts[32 * c + 31 - Math.clz32(low)]++; w ^= low; }
  }
}
const TRIALS = 200;
function diffusionStats(cipher, n, m, bit, x, y) {
  const key = `${cipher}|${n}|${m}|${bit}|${x}|${y}`;
  if (difCache.has(key)) return difCache.get(key);
  const T = cipher === "simon" ? SIMON.get(`${n},${m}`)[0] : SPECK.get(`${n},${m}`);
  const rng = mulberry32(hashStr(key)), W = 2 * n, N = BigInt(n), w32 = Math.ceil(W / 32);
  const counts = Array.from({ length: T + 1 }, () => new Uint32Array(w32 * 32));
  const [x2, y2] = flipped(x, y, bit, n);
  const word = () => { let v = 0n; for (let i = 0; i < Math.ceil(n / 32); i++) v = (v << 32n) | BigInt(rng()); return v & MASK(n); };
  for (let t = 0; t < TRIALS; t++) {
    const k = Array.from({ length: m }, word);
    const rk = (cipher === "simon" ? simon_round_keys : speck_round_keys)(k, n);
    const a = statesWith(cipher, x, y, rk, n), b = statesWith(cipher, x2, y2, rk, n);
    for (let r = 0; r <= T; r++) countBits(((a[r][0] ^ b[r][0]) << N) | (a[r][1] ^ b[r][1]), counts[r], w32);
  }
  const rounds = counts.map((c, r) => {
    let sum = 0, lo = 1, hi = 0;
    for (let i = 0; i < W; i++) { const p = c[i] / TRIALS; sum += p; lo = Math.min(lo, p); hi = Math.max(hi, p); }
    return { r, mean: sum / W, lo, hi };
  });
  const full = rounds.find(o => o.r > 0 && o.lo >= 0.35 && o.hi <= 0.65);
  const res = { T, rounds, full: full ? full.r : null };
  difCache.set(key, res);
  return res;
}

function drawHeat(canvas, cipher, info) {
  const n = S.n, m = S.m, W = 2 * n, bit = difUI.bit;
  const rk = (cipher === "simon" ? simon_round_keys : speck_round_keys)(S.key, n);
  const [x2, y2] = flipped(S.x, S.y, bit, n);
  const a = statesWith(cipher, S.x, S.y, rk, n), b = statesWith(cipher, x2, y2, rk, n), rows = a.length;
  const diffs = a.map((s, r) => ((s[0] ^ b[r][0]) << BigInt(n)) | (s[1] ^ b[r][1]));
  const avail = Math.max(200, canvas.parentElement.clientWidth - 2), labelW = 26;
  const cell = clamp(Math.floor((avail - labelW) / W), 2, 14), rowH = clamp(cell, 3, 8);
  const Wpx = labelW + W * cell, Hpx = rows * rowH, dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(Wpx * dpr); canvas.height = Math.round(Hpx * dpr);
  canvas.style.width = Wpx + "px"; canvas.style.height = Hpx + "px";
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const acc = cssVar("--accent", canvas.closest(".heat")), b0 = cssVar("--bit0"), ink = cssVar("--ink-3"), bg = cssVar("--panel");
  g.fillStyle = bg; g.fillRect(0, 0, Wpx, Hpx);
  g.font = "9px " + cssVar("--mono", document.documentElement); g.textAlign = "right"; g.textBaseline = "middle";
  const every = rowH >= 7 ? 4 : 8;
  for (let r = 0; r < rows; r++) {
    if (r % every === 0) { g.fillStyle = ink; g.fillText(String(r), labelW - 4, r * rowH + rowH / 2); }
    for (let c = 0; c < W; c++) {
      g.fillStyle = (diffs[r] >> BigInt(W - 1 - c)) & 1n ? acc : b0;
      g.fillRect(labelW + c * cell, r * rowH, Math.max(1, cell - (cell > 3 ? 1 : 0)), Math.max(1, rowH - 1));
    }
  }
  const half = diffs.findIndex(d => popcount(d) >= n);
  info.dataset.default = half < 0 ? `With your key, fewer than half of the ${W} bits ever differ at once.` : `With your key, half or more of the ${W} bits differ from round ${half} on.`;
  info.textContent = info.dataset.default;
  canvas.onmousemove = e => {
    const r = Math.floor((e.clientY - canvas.getBoundingClientRect().top) / rowH);
    if (r >= 0 && r < rows) info.textContent = `${r === 0 ? "Plaintext" : "After round " + r}: ${popcount(diffs[r])} of ${W} bits differ.`;
  };
  canvas.onmouseleave = () => { info.textContent = info.dataset.default; };
  canvas.setAttribute("aria-label", `${cipher.toUpperCase()} difference heatmap, ${rows - 1} rounds. Bits that differ per round: ${diffs.map(popcount).join(", ")}.`);
}

function diffusionChart(sim, spk, n) {
  const W = 680, H = 300, L = 46, R = 70, Tp = 14, Bm = 40, maxT = Math.max(sim.T, spk.T);
  const X = r => L + (r / maxT) * (W - L - R), Y = p => Tp + (1 - p) * (H - Tp - Bm);
  const path = (pts, f) => pts.map((o, i) => `${i ? "L" : "M"}${X(o.r).toFixed(1)},${Y(f(o)).toFixed(1)}`).join("");
  const area = pts => path(pts, o => o.hi) + pts.slice().reverse().map(o => `L${X(o.r).toFixed(1)},${Y(o.lo).toFixed(1)}`).join("") + "Z";
  const xt = []; for (let r = 0; r <= maxT; r += maxT > 40 ? 8 : 4) xt.push(r);
  const series = [["simon", sim], ["speck", spk]];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chartTitle chartDesc" style="font:11px var(--font)">
    <title id="chartTitle">Share of bits flipped per round, SIMON and SPECK, ${2 * n}-bit block</title>
    <desc id="chartDesc">Average over ${TRIALS} random keys. SIMON is fully mixed at round ${sim.full ?? "never"} of ${sim.T}; SPECK at round ${spk.full ?? "never"} of ${spk.T}. A table of the values follows the chart.</desc>
    <rect x="${L}" y="${Y(0.65)}" width="${W - L - R}" height="${Y(0.35) - Y(0.65)}" fill="var(--panel-2)" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width="1"/>
    ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${L}" x2="${W - R}" y1="${Y(p)}" y2="${Y(p)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(p) + 4}" text-anchor="end" fill="var(--ink-3)">${p * 100}%</text>`).join("")}
    ${xt.map(r => `<text x="${X(r)}" y="${H - Bm + 16}" text-anchor="middle" fill="var(--ink-3)">${r}</text>`).join("")}
    <text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" fill="var(--ink-2)">round</text>
    <text x="${W - R - 4}" y="${Y(0.65) - 5}" text-anchor="end" fill="var(--ink-3)">35–65% target band</text>
    ${series.map(([c, s]) => `<g class="c-${c}">
      <path d="${area(s.rounds)}" fill="var(--accent)" opacity=".16"/>
      <path d="${path(s.rounds, o => o.mean)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${s.full != null ? `<line x1="${X(s.full)}" x2="${X(s.full)}" y1="${Tp}" y2="${H - Bm}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>` : ""}
      <circle cx="${X(s.T)}" cy="${Y(s.rounds[s.T].mean)}" r="4" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/>
    </g>`).join("")}
    ${(() => { const ys = series.map(([, s]) => Y(s.rounds[s.T].mean)); const same = sim.T === spk.T || Math.abs(X(sim.T) - X(spk.T)) < 60;
      return series.map(([c, s], i) => `<text x="${X(s.T) + 8}" y="${ys[i] + 4 + (same ? (i ? 9 : -9) : 0)}" fill="var(--ink)" stroke="var(--panel)" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${c.toUpperCase()} · T=${s.T}</text>`).join(""); })()}
    <line class="xh" x1="0" x2="0" y1="${Tp}" y2="${H - Bm}" stroke="var(--ink-3)" stroke-width="1" visibility="hidden"/>
    <rect class="hit" x="${L}" y="${Tp}" width="${W - L - R}" height="${H - Tp - Bm}" fill="transparent"/>
  </svg>`;
}

function renderDiffusion(el) {
  const { n, m, x, y } = S, W = 2 * n;
  if (difUI.bit == null || difUI.bit >= W) difUI.bit = n;
  const bit = difUI.bit, where = bit >= n ? `bit ${bit - n} of x` : `bit ${bit} of y`;
  const sim = diffusionStats("simon", n, m, bit, x, y), spk = diffusionStats("speck", n, m, bit, x, y);
  const [x2, y2] = flipped(x, y, bit, n), block = (x << BigInt(n)) | y, block2 = (x2 << BigInt(n)) | y2;
  const stat = (c, s) => `<div class="stat c-${c}"><div class="big">${s.full != null ? `round ${s.full}` : "not reached"}</div>
    <p><b>${vname(c, n, m)}</b> is fully mixed ${s.full != null ? `after round ${s.full}: from there on, every one of the ${W} bits flips between 35% and 65% of the time.` : `within its ${s.T} rounds by this test.`} It runs T = ${s.T} rounds${s.full != null ? `, leaving <b>${s.T - s.full} rounds of margin</b> (${Math.round(100 * (s.T - s.full) / s.T)}% of the rounds)` : ""}.</p></div>`;
  el.innerHTML = `
  <p class="prose">A good cipher has <dfn>diffusion</dfn>: changing one plaintext bit should change each ciphertext bit with probability about 1/2, as if the output were random. One round cannot do that, because each round only mixes a few bits. Here you flip one plaintext bit and watch how the difference spreads, round by round.</p>
  <div class="panel">
    <div class="flipctl"><label class="lbl" for="flipBit">Bit to flip: <span class="mono" id="flipOut">${where}</span></label>
      <input type="range" id="flipBit" min="0" max="${W - 1}" value="${W - 1 - bit}" aria-valuetext="${where}"></div>
    <p class="muted" style="font-size:.85rem;margin:.3rem 0 0">Or click a cell of the plaintext below (x on the left, y on the right).</p>
    <div class="wide-scroll">${vars(ruler(W),
      row("plaintext x‖y", block, W, { click: true, hit: bit, big: true, hex: `${hexw(x, n)} ${hexw(y, n)}` }),
      row("with one bit flipped", block2, W, { diff: block ^ block2, hex: `${hexw(x2, n)} ${hexw(y2, n)}` }))}</div>
  </div>
  <h3>One run, with your key</h3>
  <p class="prose">Each row is a round (0 = the plaintext). A coloured cell is a bit that differs between the normal run and the run with the flipped bit. Both ciphers use the same ${m} key words and the same plaintext.</p>
  <div class="heat-grid">
    <div class="heat c-simon"><h4>${vname("simon", n, m)}</h4><p id="hinfo-simon" aria-live="polite"></p><div class="canvas-wrap"><canvas id="heat-simon" role="img"></canvas></div></div>
    <div class="heat c-speck"><h4>${vname("speck", n, m)}</h4><p id="hinfo-speck" aria-live="polite"></p><div class="canvas-wrap"><canvas id="heat-speck" role="img"></canvas></div></div>
  </div>
  <h3>Average over ${TRIALS} random keys</h3>
  <p class="prose">One key can be lucky. The chart repeats the experiment with ${TRIALS} random keys (seeded, so the numbers are repeatable) and the same flipped bit. The line is the average share of bits that differ; the shaded band shows the least and most often flipped bit. The block counts as <dfn>fully mixed</dfn> once every bit flips 35–65% of the time.</p>
  <div class="chart" id="difChart">
    <ul class="chart-legend"><li class="c-simon"><span class="k"></span>SIMON average</li><li class="c-speck"><span class="k"></span>SPECK average</li><li><span class="band"></span>35–65% target</li><li>dashed line: fully mixed</li></ul>
    ${diffusionChart(sim, spk, n)}
    <div class="tip" hidden></div>
  </div>
  <div class="stat-grid">${stat("simon", sim)}${stat("speck", spk)}</div>
  <p class="prose">Full mixing is only the start. Attacks such as differential and linear cryptanalysis look for small statistical patterns that survive well past this point, so designers add more rounds as a safety margin. The paper chose T with that margin in mind, which is why both ciphers keep going long after the block looks random by this simple test.</p>
  <details><summary>Table of the chart's values</summary><div class="inner"><div class="tbl"><table>
    <thead><tr><th scope="col" class="num">Round</th><th scope="col" class="num">SIMON avg</th><th scope="col" class="num">SIMON min–max bit</th><th scope="col" class="num">SPECK avg</th><th scope="col" class="num">SPECK min–max bit</th></tr></thead>
    <tbody>${Array.from({ length: Math.max(sim.T, spk.T) + 1 }, (_, r) => {
      const a = sim.rounds[r], b = spk.rounds[r], f = o => o ? `${(o.mean * 100).toFixed(1)}%` : "—", g = o => o ? `${(o.lo * 100).toFixed(0)}–${(o.hi * 100).toFixed(0)}%` : "—";
      return `<tr${r === sim.full || r === spk.full ? ' class="cur"' : ""}><td class="num">${r}</td><td class="num">${f(a)}</td><td class="num">${g(a)}</td><td class="num">${f(b)}</td><td class="num">${g(b)}</td></tr>`;
    }).join("")}</tbody></table></div></div></details>`;

  const setBit = b => { difUI.bit = b; renderChapter(CH[9]); $("#flipBit", el)?.focus({ preventScroll: true }); };
  $("#flipBit", el).addEventListener("change", e => setBit(W - 1 - +e.target.value));
  $("#flipBit", el).addEventListener("input", e => { const b = W - 1 - +e.target.value; $("#flipOut", el).textContent = b >= n ? `bit ${b - n} of x` : `bit ${b} of y`; });
  el.querySelector(".bits.click").addEventListener("click", e => { const c = e.target.closest("[data-bit]"); if (c) setBit(+c.dataset.bit); });
  CH[9].redraw = () => { drawHeat($("#heat-simon", el), "simon", $("#hinfo-simon", el)); drawHeat($("#heat-speck", el), "speck", $("#hinfo-speck", el)); };
  CH[9].redraw();

  // crosshair + tooltip
  const box = $("#difChart", el), svg = $("svg", box), tip = $(".tip", box), xh = $(".xh", svg), hit = $(".hit", svg);
  const maxT = Math.max(sim.T, spk.T), Lx = 46, Rx = 70, Wv = 680;
  hit.addEventListener("mousemove", e => {
    const pt = svg.getBoundingClientRect(), sx = Wv / pt.width, vx = (e.clientX - pt.left) * sx;
    const r = clamp(Math.round(((vx - Lx) / (Wv - Lx - Rx)) * maxT), 0, maxT), px = Lx + (r / maxT) * (Wv - Lx - Rx);
    xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.setAttribute("visibility", "visible");
    const line = (c, s) => { const o = s.rounds[r]; return `<div class="c-${c}"><span class="k" style="background:var(--accent)"></span>${c.toUpperCase()}: ${o ? `${(o.mean * 100).toFixed(1)}% (bits ${(o.lo * 100).toFixed(0)}–${(o.hi * 100).toFixed(0)}%)` : "finished"}</div>`; };
    tip.innerHTML = `<b>Round ${r}</b>${line("simon", sim)}${line("speck", spk)}`;
    tip.hidden = false;
    const bx = box.getBoundingClientRect(), left = e.clientX - bx.left + 14;
    tip.style.left = Math.min(left, bx.width - tip.offsetWidth - 8) + "px"; tip.style.top = (e.clientY - bx.top + 12) + "px";
  });
  hit.addEventListener("mouseleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
}

// ======================================================================================
// Chapter 11 · More than one block
// ======================================================================================
const PW = 192, PH = 96;
const modeUI = { nonce: 0x5eed1e55n };
let picture = null;

function makePicture() {
  const px = new Uint8Array(PW * PH);
  for (let r = 0; r < PH; r++) for (let c = 0; c < PW; c++) {
    let v = 232;                                                    // background
    const dx = c - 56, dy = r - 44, d = Math.hypot(dx, dy);
    if (r < 46 && d >= 15 && d <= 25) v = 96;                       // shackle
    if (c >= 24 && c < 88 && r >= 40 && r < 88) v = 40;             // body
    if (Math.hypot(c - 56, r - 58) <= 6 || (c >= 53 && c < 59 && r >= 58 && r < 76)) v = 232;   // keyhole
    if (c >= 104 && c < 184 && r >= 8 && r < 40) v = [64, 120, 176, 208][Math.floor((c - 104) / 20)];   // grey steps
    if (c >= 104 && c < 184 && r >= 48 && r < 88) v = ((Math.floor((c - 104) / 16) + Math.floor((r - 48) / 8)) & 1) ? 24 : 200;   // checkerboard
    px[r * PW + c] = v;
  }
  return px;
}

function modeKey() {
  const c = S.cipher;
  if (S.n === 32) return { key: S.key, m: S.m, note: `your current key (${vname(c, 32, S.m)})` };
  const v = vectorState(c, 32, 4);
  return { key: v.key, m: 4, note: `the paper's ${vname(c, 32, 4)} test key, because your current variant does not use a 64-bit block` };
}

function encryptPicture(px, cipher, rk, mode, nonce) {
  const out = new Uint8Array(px.length), blocks = px.length / 8;
  for (let i = 0; i < blocks; i++) {
    let x = 0n, y = 0n;
    for (let b = 0; b < 4; b++) { x = (x << 8n) | BigInt(px[8 * i + b]); y = (y << 8n) | BigInt(px[8 * i + 4 + b]); }
    let cx, cy;
    if (mode === "ecb") [cx, cy] = encryptWith(cipher, x, y, rk, 32);
    else { const [kx, ky] = encryptWith(cipher, nonce, BigInt(i), rk, 32); cx = x ^ kx; cy = y ^ ky; }
    for (let b = 0; b < 4; b++) { out[8 * i + b] = Number((cx >> BigInt(24 - 8 * b)) & 0xffn); out[8 * i + 4 + b] = Number((cy >> BigInt(24 - 8 * b)) & 0xffn); }
  }
  return out;
}
function distinctBlocks(px) { const s = new Set(); for (let i = 0; i < px.length; i += 8) s.add(px.subarray(i, i + 8).join(",")); return s.size; }
function paint(canvas, px) {
  canvas.width = PW; canvas.height = PH;
  const g = canvas.getContext("2d"), img = g.createImageData(PW, PH);
  for (let i = 0; i < px.length; i++) { img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = px[i]; img.data[4 * i + 3] = 255; }
  g.putImageData(img, 0, 0);
}

function renderModes(el) {
  const c = S.cipher, { key, m, note } = modeKey(), rk = (c === "simon" ? simon_round_keys : speck_round_keys)(key, 32);
  picture = picture || makePicture();
  const ecb = encryptPicture(picture, c, rk, "ecb"), ctr = encryptPicture(picture, c, rk, "ctr", modeUI.nonce);
  const blocks = picture.length / 8, dp = distinctBlocks(picture), de = distinctBlocks(ecb), dc = distinctBlocks(ctr);
  const snippet = [
    "# Not part of ref.py: how this page uses " + c + "_encrypt on a whole picture.",
    "# ECB: encrypt every 8-byte block on its own.",
    "for i, (x, y) in enumerate(blocks):",
    `    out[i] = ${c}_encrypt(x, y, key, 32)`,
    "",
    "# CTR: encrypt a counter, then XOR the result into the block.",
    "for i, (x, y) in enumerate(blocks):",
    `    kx, ky = ${c}_encrypt(nonce, i, key, 32)`,
    "    out[i] = (x ^ kx, y ^ ky)",
  ];
  el.innerHTML = `
  <p class="prose">${C(c + "_encrypt")} handles exactly one block. To encrypt anything longer you need a <dfn>mode of operation</dfn>: a rule for applying the cipher block after block. The simplest rule is not safe, and a picture shows why.</p>
  <p class="prose">The picture below is ${PW} × ${PH} greyscale pixels, one byte each. With a 64-bit (8-byte) block that is ${blocks} blocks, encrypted with ${vname(c, 32, m)} using ${note}.</p>
  <div class="pics">
    <figure><canvas id="picOrig" role="img" aria-label="Original picture: a padlock, four grey steps and a checkerboard"></canvas><figcaption><b>Original</b>${blocks} blocks, but only ${dp} different ones.</figcaption></figure>
    <figure><canvas id="picEcb" role="img" aria-label="ECB-encrypted picture: the padlock and patterns are still visible"></canvas><figcaption><b>ECB (electronic codebook)</b>Each block is encrypted on its own, so equal blocks give equal ciphertext: still ${de} different blocks, and the shapes show through.</figcaption></figure>
    <figure><canvas id="picCtr" role="img" aria-label="CTR-encrypted picture: uniform noise"></canvas><figcaption><b>CTR (counter)</b>Block i is XORed with ${c}_encrypt(nonce, i), which is different for every i: ${dc} different blocks, and nothing shows through.</figcaption></figure>
  </div>
  <div class="btn-row"><button type="button" class="btn" id="newNonce">New nonce</button><span class="muted" style="font-size:.88rem">nonce = ${hx(modeUI.nonce, 32)}: a number used once. Reusing it with the same key would repeat the keystream.</span></div>
  <div class="code" role="region" tabindex="0" aria-label="Sketch of ECB and CTR in Python"><pre>${snippet.map(s => `<span class="ln"><span class="src">${hiPy(s)}</span></span>`).join("")}</pre></div>
  <p class="prose">The cipher itself is the same in both. What leaks in ECB is equality: an attacker learns which blocks repeat without knowing the key. CTR turns the block cipher into a stream of pseudo-random bytes, so repeated plaintext no longer gives repeated ciphertext. Neither mode detects tampering on its own; real systems add a message authentication code.</p>`;
  paint($("#picOrig", el), picture); paint($("#picEcb", el), ecb); paint($("#picCtr", el), ctr);
  $("#newNonce", el).addEventListener("click", () => {
    const b = new Uint32Array(1); crypto.getRandomValues(b); modeUI.nonce = BigInt(b[0]);
    renderChapter(CH[10]); $("#newNonce", el)?.focus();
  });
}

// ======================================================================================
// Chapter 12 · Full source
// ======================================================================================
function renderSource(el) {
  const where = [
    ["1–5", "round-keys"], ["7–10", "inputs"], ["12–13", "rotations"], ["15–21", "check"], ["23–34", "round-keys"], ["36", "one-round"],
    ["38–42", "all-rounds"], ["44–48", "decryption"], ["50–59", "round-keys"], ["61–67", "all-rounds"], ["69–75", "decryption"], ["77–110", "testing"],
  ];
  el.innerHTML = `
  <ul class="where">${where.map(([l, id]) => `<li>Lines ${l}: ${chLink(id)}</li>`).join("")}</ul>
  <div class="code-tools"><button type="button" class="btn primary" id="copySrc">Copy ref.py</button><span id="copyStatus" class="status" role="status"></span></div>
  ${codeView([[1, LINES.length]], { label: "ref.py, all lines" })}
  <details><summary>The JavaScript translation this page runs</summary><div class="inner">
    <p class="prose">Browsers cannot run Python, so the page runs this line-for-line translation. Each line ends with the ref.py line it translates. Words are JavaScript BigInts, which, like Python integers, have no size limit.</p>
    <pre class="out">${esc(document.getElementById("ref-js").textContent.trim())}</pre>
  </div></details>`;
  $("#copySrc", el).addEventListener("click", async () => {
    const st = $("#copyStatus", el);
    let ok = false;
    try { await navigator.clipboard.writeText(REF); ok = true; } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = REF; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
    }
    st.className = "status " + (ok ? "ok" : "bad");
    st.textContent = ok ? `Copied ${LINES.length} lines.` : "Copying was blocked by the browser; select the code and copy it by hand.";
  });
}

// ======================================================================================
// Start-up
// ======================================================================================
function init() {
  buildChapters();
  Object.assign(S, vectorState("simon", 16, 4));
  derive(); version++;
  refreshChrome();

  const nOk = TESTS.filter(t => t.ok).length, allOk = nOk === 20 && !TRACE_BAD.length;
  const badge = $("#testBadge");
  badge.innerHTML = allOk ? `<span class="pass">✓ ${nOk} / 20 test vectors pass</span>` : `<span class="fail">✗ ${nOk} / 20 test vectors pass</span>`;
  if (!allOk) {
    const banner = $("#failBanner");
    banner.hidden = false;
    banner.innerHTML = `Warning: ${20 - nOk} of the 20 test vectors failed in this browser${TRACE_BAD.length ? `, and the tracers disagree for ${esc(TRACE_BAD.join(", "))}` : ""}. The values on this page may be wrong. See ${chLink("testing")}.`;
  }

  const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); return CH.some(c => c.id === id) ? id : null; };
  go(fromHash() || "glance", { focus: false, push: false });
  window.addEventListener("popstate", () => { const id = fromHash(); if (id && id !== CH[cur].id) go(id, { push: false }); });
  window.addEventListener("hashchange", () => { const id = fromHash(); if (id && id !== CH[cur].id) go(id, { push: false }); });
  $("#chSelect").addEventListener("change", e => go(e.target.value));
  $("#prevBtn").addEventListener("click", () => go(cur - 1));
  $("#nextBtn").addEventListener("click", () => go(cur + 1));
  $("#changeInputs").addEventListener("click", () => { go("inputs"); $("#kw" + (S.m - 1))?.focus(); });
  document.addEventListener("keydown", e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest && e.target.closest("input, select, textarea, [contenteditable], .code")) return;
    if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); go(cur - 1); }
    else if (e.key === "ArrowRight" && cur < CH.length - 1) { e.preventDefault(); go(cur + 1); }
  });
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => CH[cur].redraw && CH[cur].redraw(), 120); });
  darkMode.addEventListener("change", () => { CH.forEach(c => { if (c.redraw) c.v = -1; }); if (CH[cur].redraw) CH[cur].redraw(); });
}

init();
