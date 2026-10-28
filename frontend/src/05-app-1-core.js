"use strict";
// ======================================================================================
// Page code. Everything cryptographic comes from the translation above; this part only
// draws it. Chapters render lazily and re-render when the inputs change.
// ======================================================================================

const REF = document.getElementById("ref-py").textContent;
const LINES = REF.replace(/\n$/, "").split("\n");          // LINES[L - 1] is ref.py line L

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const untag = s => String(s).replace(/<[^>]*>/g, "");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hexw = (v, n) => (v < 0n ? "-" : "") + (v < 0n ? -v : v).toString(16).padStart(Math.ceil(n / 4), "0");
const hx = (v, n) => (v < 0n ? "-0x" + hexw(-v, n) : "0x" + hexw(v, n));
const C = s => `<code>${esc(s)}</code>`;
const sub = s => `<sub>${s}</sub>`;
const vname = (cipher, n, m) => `${cipher.toUpperCase()}${2 * n}/${n * m}`;
const popcount = v => { let k = 0; while (v) { v &= v - 1n; k++; } return k; };
const plural = (k, w, ws = w + "s") => `${k} ${k === 1 ? w : ws}`;
const binStr = (v, w) => (v & ((1n << BigInt(w)) - 1n)).toString(2).padStart(w, "0").replace(/\B(?=(\d{4})+$)/g, " ");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const darkMode = matchMedia("(prefers-color-scheme: dark)");
const cssVar = (name, el = document.body) => getComputedStyle(el).getPropertyValue(name).trim();

// Paper name and code name of key[idx] (code order).
// SIMON: key[idx] = k_idx.  SPECK: key[0] = k_0 and key[idx] = l_(idx-1).
const paperName = (cipher, idx) => (cipher === "simon" || idx === 0 ? `k${sub(idx)}` : `ℓ${sub(idx - 1)}`);
const codeName = (cipher, idx) => (cipher === "simon" ? `k${idx}` : idx === 0 ? "k0" : `l${idx - 1}`);

// ---------- bit strips ----------
// A word drawn as cells, most significant bit on the left. Options:
//   over  extra bits above n to draw (hatched: they lie outside the n-bit word)
//   cols  total width in bits, so rows of different widths line up on the right
//   diff  bits to outline (changed), mark  bits to underline, hit  one bit to ring
//   acc   draw 1 bits in the accent colour (carry rows), click  make cells clickable
function bits(v, n, o = {}) {
  const w = n + (o.over || 0), cols = Math.max(o.cols || 0, w);
  const diff = o.diff || 0n, mark = o.mark || 0n;
  let h = "";
  for (let col = 0; col < cols; col++) {
    const p = cols - 1 - col, P = BigInt(p);
    let cls = p >= w ? "sp" : (v >> P) & 1n ? "b1" : "b0";
    if (p < w) {
      if (p >= n) cls += " ov";
      if ((diff >> P) & 1n) cls += " chg";
      if ((mark >> P) & 1n) cls += " mk";
      if (p === o.hit) cls += " hit";
    }
    if (col && (p + 1) % 4 === 0) cls += " nb";
    h += `<i class="${cls}"${o.click && p < w ? ` data-bit="${p}"` : ""}></i>`;
  }
  const label = `${o.label ? o.label + " = " : ""}${hx(v, w)}, binary ${binStr(v, w)}`;
  const cl = "bits" + (o.acc ? " acc" : "") + (o.click ? " click" : "") + (o.big ? " big" : "");
  return `<div class="${cl}" style="--cols:${cols}" role="img" aria-label="${esc(label)}">${h}</div>`;
}

// A row of bit positions to sit above a group of strips.
function ruler(n, cols = n) {
  const step = n >= 32 ? 8 : 4;
  let h = "";
  for (let col = 0; col < cols; col++) {
    const p = cols - 1 - col;
    const show = p < n && (p % step === 0 || p === n - 1);
    h += `<span${col && (p + 1) % 4 === 0 ? ' class="nb"' : ""}>${show ? p : ""}</span>`;
  }
  return `<div class="vrow rul" aria-hidden="true"><span class="op"></span><span class="vn"><span class="sub">bit position</span></span><span class="vb"><div class="ruler" style="--cols:${cols}">${h}</div></span><span class="vh"></span></div>`;
}

const OPS = { "^": ["⊕", "XOR"], "&": ["&", "AND"], "|": ["|", "OR"], "+": ["+", "plus"], "-": ["−", "minus"], "=": ["=", "gives"], "→": ["→", "becomes"], "~": ["~", "NOT"] };
// One variable: [operator] [name + note] [bits] [hex].
function row(name, v, n, o = {}) {
  const op = o.op ? `<span aria-hidden="true">${OPS[o.op] ? OPS[o.op][0] : o.op}</span><span class="sr">${OPS[o.op] ? OPS[o.op][1] : ""}</span>` : "";
  const cls = "vrow" + (o.res ? " res" : "") + (o.sep ? " sep" : "");
  return `<div class="${cls}"><span class="op">${op}</span><span class="vn">${esc(name)}${o.sub ? `<span class="sub">${o.sub}</span>` : ""}</span>` +
    `<span class="vb">${bits(v, n, { ...o, label: name })}</span><code class="vh">${o.hex ?? hx(v, n + (o.over || 0))}</code></div>`;
}
const vars = (...rows) => `<div class="vars">${rows.join("")}</div>`;
const tag = t => `<span class="tag">${t}</span>`;
const NONLIN = tag("the only nonlinear step");

// ---------- Python code view ----------
const KW = new Set("def return for in if not raise and or else elif while import from as is lambda None True False".split(" "));
const BI = new Set("len list range int reversed print ValueError".split(" "));
function hiPy(src) {
  const re = /(#.*$)|(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*')|(\b\d+\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let out = "", m, afterDef = false;
  while ((m = re.exec(src))) {
    const t = m[0];
    if (m[1]) out += `<span class="tk-com">${esc(t)}</span>`;
    else if (m[2]) out += `<span class="tk-str">${esc(t)}</span>`;
    else if (m[3]) out += `<span class="tk-num">${esc(t)}</span>`;
    else if (m[4]) {
      const call = /^\s*\(/.test(src.slice(re.lastIndex));
      const cls = KW.has(t) ? "kw" : BI.has(t) ? "bi" : afterDef || call ? "fn" : /^[A-Z][A-Z_]+$/.test(t) ? "const" : "";
      out += cls ? `<span class="tk-${cls}">${esc(t)}</span>` : esc(t);
      afterDef = t === "def";
      continue;
    } else out += esc(t);
    if (!m[5]) afterDef = false;
  }
  return out;
}
function hiMarked(src, marks) {
  if (!marks || !marks.length) return hiPy(src);
  const spans = [];
  for (const mk of [].concat(marks)) { const i = src.indexOf(mk); if (i >= 0) spans.push([i, i + mk.length]); }
  spans.sort((a, b) => a[0] - b[0]);
  let out = "", pos = 0;
  for (const [a, b] of spans) { if (a < pos) continue; out += hiPy(src.slice(pos, a)) + `<mark>${hiPy(src.slice(a, b))}</mark>`; pos = b; }
  return out + hiPy(src.slice(pos));
}
const asSet = v => (v instanceof Set ? v : new Set(v == null ? [] : [].concat(v)));
const rangeText = ranges => ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");
// ranges: [[from, to], ...] of ref.py line numbers. o.on / o.skip: lines to highlight / strike out.
// o.marks: {line: text or [texts]} to outline inside a line.
function codeView(ranges, o = {}) {
  const on = asSet(o.on), skip = asSet(o.skip);
  let h = "";
  ranges.forEach(([a, b], idx) => {
    if (idx) h += `<span class="ln gap" aria-hidden="true"><span class="no">⋮</span></span>`;
    for (let L = a; L <= b; L++)
      h += `<span class="ln${on.has(L) ? " on" : ""}${skip.has(L) ? " skip" : ""}" data-l="${L}"><span class="no">${L}</span><span class="src">${hiMarked(LINES[L - 1], o.marks && o.marks[L])}</span></span>`;
  });
  const label = o.label || `ref.py, ${ranges.length === 1 && ranges[0][0] === ranges[0][1] ? "line" : "lines"} ${rangeText(ranges)}`;
  return `<div class="code" role="region" tabindex="0" aria-label="${esc(label)}"><pre>${h}</pre></div>`;
}
function setLines(root, on, skip) {
  on = asSet(on); skip = asSet(skip);
  let first = null;
  for (const el of $$(".ln[data-l]", root)) {
    const L = +el.dataset.l, isOn = on.has(L);
    el.classList.toggle("on", isOn); el.classList.toggle("skip", skip.has(L));
    if (isOn && !first) first = el;
  }
  const box = root.classList.contains("code") ? root : $(".code", root);
  if (first && box && box.scrollHeight > box.clientHeight) {      // keep the line in view without moving the page
    const top = first.offsetTop, bottom = top + first.offsetHeight;
    if (top < box.scrollTop + 8 || bottom > box.scrollTop + box.clientHeight - 8) box.scrollTop = Math.max(0, top - box.clientHeight / 3);
  }
}

// ---------- step-through debugger ----------
// iters: [{label, steps: [{line, say, body, skip}]}]. The slider picks an iteration;
// Previous / Next walk the steps and roll over into the neighbouring iteration.
let uid = 0;
const steppers = new Map();     // name -> Stepper; a re-render replaces the old one
class Stepper {
  constructor(host, cfg) {
    this.cfg = cfg; this.timer = null; this.rangesKey = "";
    this.it = cfg.pos ? cfg.pos.it : 0; this.st = cfg.pos ? cfg.pos.st : 0;   // cfg.pos survives re-renders
    const id = "dbg" + ++uid;
    host.innerHTML = `<div class="dbg">
      <div class="dbg-bar">
        <div class="dbg-slider"${cfg.noSlider ? " hidden" : ""}><label class="lbl" for="${id}">${cfg.label}</label>
          <input id="${id}" type="range" min="0" step="1" value="0"><output for="${id}"></output></div>
        <div class="dbg-btns" role="group" aria-label="Step controls">
          <button type="button" class="btn" data-a="prev">◀ Previous</button>
          <button type="button" class="btn" data-a="play" aria-pressed="false">▶ Play</button>
          <button type="button" class="btn primary" data-a="next">Next ▶</button>
        </div>
        <span class="dbg-pos"></span>
      </div>
      <div class="dbg-code"></div>
      <div class="dbg-step"><p class="say" aria-live="polite"></p><div class="dbg-body"></div></div>
    </div>`;
    const el = this.el = host.firstElementChild;
    this.slider = $("input[type=range]", el); this.out = $("output", el); this.pos = $(".dbg-pos", el);
    this.code = $(".dbg-code", el); this.say = $(".say", el); this.body = $(".dbg-body", el);
    this.slider.addEventListener("input", () => { this.stop(); this.go(+this.slider.value, 0); });
    el.addEventListener("click", e => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "prev") { this.stop(); this.step(-1); }
      else if (a === "next") { this.stop(); this.step(1); }
      else if (a === "play") this.timer ? this.stop() : this.play();
    });
    if (steppers.has(cfg.name)) steppers.get(cfg.name).stop();
    steppers.set(cfg.name, this);
  }
  btn(a) { return $(`[data-a="${a}"]`, this.el); }
  setIters(iters, ranges) {
    this.iters = iters;
    const key = JSON.stringify(ranges);
    if (key !== this.rangesKey) { this.rangesKey = key; this.code.innerHTML = codeView(ranges, { label: this.cfg.codeLabel }); }
    this.slider.max = iters.length - 1;
    this.go(this.it, this.st);
  }
  go(it, st) {
    this.it = clamp(it, 0, this.iters.length - 1);
    const len = this.iters[this.it].steps.length;
    this.st = st < 0 ? len - 1 : clamp(st, 0, len - 1);
    this.update();
  }
  step(d) {
    let { it, st } = this;
    st += d;
    if (st >= this.iters[it].steps.length) { if (it + 1 >= this.iters.length) return false; it++; st = 0; }
    else if (st < 0) { if (it === 0) return false; it--; st = -1; }
    this.go(it, st);
    return true;
  }
  atEnd() { return this.it === this.iters.length - 1 && this.st === this.iters[this.it].steps.length - 1; }
  play() {
    if (this.atEnd()) this.go(0, 0);
    this.timer = setInterval(() => { if (!this.step(1) || this.atEnd()) this.stop(); }, reduceMotion.matches ? 1800 : 1200);
    this.btn("play").textContent = "❚❚ Pause"; this.btn("play").setAttribute("aria-pressed", "true");
  }
  stop() {
    if (!this.timer) return;
    clearInterval(this.timer); this.timer = null;
    this.btn("play").textContent = "▶ Play"; this.btn("play").setAttribute("aria-pressed", "false");
  }
  update() {
    const iter = this.iters[this.it], s = iter.steps[this.st];
    this.slider.value = this.it; this.out.textContent = iter.label;
    this.slider.setAttribute("aria-valuetext", iter.label);
    this.pos.textContent = `Step ${this.st + 1} of ${iter.steps.length}`;
    setLines(this.code, s.line, s.skip);
    this.say.innerHTML = `<span class="lnref">line ${s.line}</span>${s.say}`;
    this.body.innerHTML = s.body || "";
    this.btn("prev").disabled = this.it === 0 && this.st === 0;
    this.btn("next").disabled = this.atEnd();
    if (this.cfg.pos) { this.cfg.pos.it = this.it; this.cfg.pos.st = this.st; }
    if (this.cfg.onChange) this.cfg.onChange(this.it, this.st);
  }
}

// ---------- state ----------
// S holds exactly what the user supplies. key is in code order: [k0, k1, ...] / [k0, l0, l1, ...].
const S = { cipher: "simon", n: 16, m: 4, key: [], x: 0n, y: 0n };
let D = {};            // everything derived from S
let version = 0;       // bumps on every change, so chapters know to re-render

const splitHex = t => t.trim().split(/\s+/).map(w => BigInt("0x" + w));
const vectorFor = (cipher, n, m) => VECTORS[cipher].find(v => v[0] === n && v[1].trim().split(/\s+/).length === m);
function vectorState(cipher, n, m) {
  const [, keyText, pt] = vectorFor(cipher, n, m);
  const [x, y] = splitHex(pt);
  return { cipher, n, m, key: splitHex(keyText).reverse(), x, y };
}
const paperKey = (key = S.key, n = S.n) => [...key].reverse().map(w => hexw(w, n)).join(" ");

function derive() {
  const { cipher, n, m, key, x, y } = S, simon = cipher === "simon";
  D = { name: vname(cipher, n, m), mask: MASK(n) };
  if (simon) [D.T, D.j] = SIMON.get(`${n},${m}`);
  else { D.T = SPECK.get(`${n},${m}`); [D.a, D.b] = speckAB(n); }
  D.ks = (simon ? traceSimonKeys : traceSpeckKeys)(key, n);
  D.rk = (simon ? simon_round_keys : speck_round_keys)(key, n);          // the reference function itself
  D.rounds = (simon ? traceSimonEnc : traceSpeckEnc)(x, y, D.rk, n);
  [D.cx, D.cy] = (simon ? simon_encrypt : speck_encrypt)(x, y, key, n);
  D.dec = (simon ? traceSimonDec : traceSpeckDec)(D.cx, D.cy, D.rk, n);
  [D.px, D.py] = (simon ? simon_decrypt : speck_decrypt)(D.cx, D.cy, key, n);
  D.states = [[x, y], ...D.rounds.map(r => [r.nx, r.ny])];             // D.states[r] = state after round r
  const v = vectorFor(cipher, n, m), ref = vectorState(cipher, n, m);
  D.vec = v;
  D.isPaper = ref.x === x && ref.y === y && ref.key.every((w, i) => w === key[i]);
  D.paperCt = splitHex(v[3]);
}

function setState(next) {
  Object.assign(S, next);
  derive();
  version++;
  refreshChrome();
  if (cur >= 0) renderChapter(CH[cur], true);
}

// ---------- chapters & navigation ----------
const CH = [
  { id: "glance", title: "At a glance", gist: "What ref.py contains, how its parts fit together, and how to read the rest of this page.", render: renderGlance },
  { id: "inputs", title: "Inputs", gist: "Choose a variant and its values, and see what every input to the functions means.", render: renderInputs },
  { id: "check", title: "Checking the inputs", gist: "Every public function first calls _check, which rejects a variant or a value it cannot handle.", render: renderCheck },
  { id: "rotations", title: "Rotations", gist: "rol and ror move every bit of a word around a circle; both ciphers rotate on almost every line.", render: renderRotations },
  { id: "round-keys", title: "Round keys", gist: "The key schedule stretches the m key words into T round keys, one for each round.", render: renderRoundKeys },
  { id: "one-round", title: "One round", gist: "One pass through the loop body of the encrypt function, split into its smallest operations.", render: renderOneRound },
  { id: "all-rounds", title: "All rounds", gist: "The encrypt function runs that round T times; here is every state from plaintext to ciphertext.", render: renderAllRounds },
  { id: "decryption", title: "Decryption", gist: "Decryption undoes the rounds one by one, using the round keys in reverse order, and ends on the plaintext.", render: renderDecryption },
  { id: "testing", title: "Testing", gist: "The bottom of the file checks all 20 variants against the test vectors published in the paper.", render: renderTesting },
  { id: "diffusion", title: "Why so many rounds?", gist: "Flip one plaintext bit and watch how many rounds it takes to disturb every bit of the block.", render: renderDiffusion },
  { id: "modes", title: "More than one block", gist: "A block cipher encrypts one block; how you chain blocks together decides what leaks.", render: renderModes },
  { id: "source", title: "Full source", gist: "All 110 lines of ref.py, with line numbers and syntax highlighting.", render: renderSource },
];
let cur = -1;

function buildChapters() {
  const host = $("#chapters");
  CH.forEach((ch, i) => {
    const sec = document.createElement("section");
    sec.id = "ch-" + ch.id; sec.className = "chapter"; sec.hidden = true;
    sec.setAttribute("aria-labelledby", "h-" + ch.id);
    sec.innerHTML = `<header class="ch-head"><p class="ch-num">Chapter ${i + 1} of ${CH.length}</p><h2 id="h-${ch.id}" tabindex="-1">${esc(ch.title)}</h2><p class="gist">${ch.gist}</p></header><div class="ch-body"></div>`;
    host.append(sec);
    Object.assign(ch, { sec, body: $(".ch-body", sec), h2: $("h2", sec), v: -1 });
  });
  $("#toc").innerHTML = CH.map((ch, i) => `<li><a href="#${ch.id}" data-go="${ch.id}"><span class="num">${i + 1}</span><span>${esc(ch.title)}</span></a></li>`).join("");
  $("#chSelect").innerHTML = CH.map((ch, i) => `<option value="${ch.id}">${i + 1}. ${esc(ch.title)}</option>`).join("");
}

function renderChapter(ch, keepFocus) {
  const fid = keepFocus && document.activeElement && ch.sec.contains(document.activeElement) ? document.activeElement.id : null;
  ch.render(ch.body);
  ch.v = version;
  if (fid && document.getElementById(fid)) document.getElementById(fid).focus({ preventScroll: true });
}

function go(target, { focus = true, push = true } = {}) {
  const idx = typeof target === "number" ? target : CH.findIndex(ch => ch.id === target);
  if (idx < 0) return;
  steppers.forEach(s => s.stop());
  if (idx !== cur) {
    if (cur >= 0) CH[cur].sec.hidden = true;
    cur = idx;
    CH[idx].sec.hidden = false;
  }
  const ch = CH[idx];
  if (ch.v !== version) renderChapter(ch);
  else if (ch.redraw) ch.redraw();       // canvases size themselves to the visible width
  $$("#toc a").forEach((a, i) => (i === idx ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  $("#chSelect").value = ch.id;
  const prev = CH[idx - 1], next = CH[idx + 1], pb = $("#prevBtn"), nb = $("#nextBtn");
  pb.hidden = !prev; nb.hidden = !next;
  if (prev) pb.innerHTML = `<small>Previous</small>← ${idx}. ${esc(prev.title)}`;
  if (next) nb.innerHTML = `<small>Next</small>${idx + 2}. ${esc(next.title)} →`;
  document.title = `${idx + 1}. ${ch.title} · ref.py explained`;
  if (push && location.hash !== "#" + ch.id) history.pushState(null, "", "#" + ch.id);
  if (focus) { window.scrollTo(0, 0); ch.h2.focus({ preventScroll: true }); }
}

function refreshChrome() {
  document.body.dataset.cipher = S.cipher;
  const n = S.n;
  $("#cardVariant").textContent = D.name;
  $("#tbVariant").textContent = D.name;
  $("#cardBody").innerHTML =
    `<dt>Key</dt><dd>${paperKey()}</dd>` +
    `<dt>Plaintext</dt><dd>${hexw(S.x, n)} ${hexw(S.y, n)}</dd>` +
    `<dt>Ciphertext</dt><dd>${hexw(D.cx, n)} ${hexw(D.cy, n)}</dd>`;
}

// Links and buttons anywhere on the page can carry data-go="chapter-id".
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (!g) return;
  e.preventDefault();
  go(g.dataset.go);
});
