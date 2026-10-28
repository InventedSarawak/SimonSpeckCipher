// Drive headless Chromium over the DevTools protocol: load index.html from disk, exercise every chapter
// for all 20 variants, collect console errors, check displayed values, and save screenshots.
// Usage: node test/browser.mjs [screenshot-dir]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const page = "file://" + path.resolve(here, "../index.html");
const shots = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "shots-"));
fs.mkdirSync(shots, { recursive: true });
const trace = JSON.parse(fs.readFileSync(path.join(here, "trace.json"), "utf8"));

const port = 9333, profile = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-"));
const chrome = spawn("chromium", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.some(t => t.type === "page")) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map(), problems = [], listeners = [];
ws.addEventListener("message", ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === "Runtime.exceptionThrown") problems.push("exception: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(msg.params.type)) problems.push(`console.${msg.params.type}: ` + msg.params.args.map(a => a.value ?? a.description).join(" "));
  if (msg.method === "Log.entryAdded" && ["error", "warning"].includes(msg.params.entry.level)) problems.push(`log ${msg.params.entry.level}: ${msg.params.entry.text} ${msg.params.entry.url || ""}`);
  listeners.forEach(f => f(msg));
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const loaded = () => new Promise(r => { const f = m => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(f), 1); r(); } }; listeners.push(f); });
const shot = async name => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(shots, name + ".png"), Buffer.from(r.data, "base64")); };
const viewport = (width, height, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
const scheme = v => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: v }] });
let checks = 0; const expect = (cond, what) => { checks++; if (!cond) problems.push("check failed: " + what); };

await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await viewport(1400, 900); await scheme("light");
let l = loaded(); await send("Page.navigate", { url: page }); await l; await sleep(300);

// ---- load-time self test ----
expect((await evaluate(`document.querySelector("#testBadge").textContent`)).includes("20 / 20"), "badge shows 20 / 20");
expect(await evaluate(`document.querySelector("#failBanner").hidden`), "no failure banner");
const ids = await evaluate(`[...document.querySelectorAll("#toc a")].map(a => a.dataset.go)`);
expect(ids.length === 12, "12 chapters");
await shot("01-glance-light");

// ---- every variant, every chapter, every debugger step ----
const covered = new Set();
const seenLines = `[...document.querySelectorAll("section:not([hidden]) .ln.on")].map(e => +e.dataset.l)`;
const stepAll = `(() => { let n = 0; const seen = new Set(${seenLines}); for (const d of document.querySelectorAll("section:not([hidden]) .dbg")) {
  const r = d.querySelector("input[type=range]"), next = d.querySelector('[data-a="next"]');
  if (r) { r.value = 0; r.dispatchEvent(new Event("input")); }
  for (const l of ${seenLines}) seen.add(l);
  for (let i = 0; i < 2000 && !next.disabled; i++) { next.click(); n++; for (const l of ${seenLines}) seen.add(l); } }
  document.querySelectorAll("section:not([hidden]) tr[data-line]").forEach(tr => { tr.dispatchEvent(new Event("focus")); for (const l of ${seenLines}) seen.add(l); });
  return [n, [...seen]]; })()`;
const variants = trace.cases.slice(0, 20);
let steps = 0;
for (const v of variants) {
  const tag = `${v.cipher},${v.n},${v.key.length}`;
  await evaluate(`location.hash = "testing"`); await sleep(30);
  await evaluate(`document.querySelector('button[data-tv="${tag}"]').click()`);
  const name = await evaluate(`document.querySelector("#cardVariant").textContent`);
  expect(name === `${v.cipher.toUpperCase()}${2 * v.n}/${v.n * v.key.length}`, `variant loads: ${tag} -> ${name}`);
  for (const ch of ids) {
    await evaluate(`location.hash = "${ch}"`); await sleep(15);
    expect(await evaluate(`!document.querySelector("#ch-${ch}").hidden`), `chapter ${ch} visible`);
    const [k, seen] = await evaluate(stepAll); steps += k; seen.forEach(l => covered.add(l));
  }
  // round-key table and ciphertext shown on the page must equal ref.py's
  await evaluate(`location.hash = "round-keys"`); await sleep(15);
  const rk = await evaluate(`[...document.querySelectorAll("#ch-round-keys details:first-of-type tbody tr td.hex")].map(td => td.textContent)`);
  expect(rk.map(h => BigInt("0x" + h).toString(16)).join() === v.rk.join(), `${tag} round keys displayed = ref.py`);
  const ct = await evaluate(`document.querySelector("#cardBody dd:nth-of-type(3)").textContent`);
  expect(ct.split(" ").map(h => BigInt("0x" + h).toString(16)).join(" ") === v.ct.join(" "), `${tag} ciphertext displayed = ref.py`);
  // the last decryption step must land on the plaintext
  await evaluate(`location.hash = "decryption"`); await sleep(15);
  expect((await evaluate(`document.querySelector("#ch-decryption > .ch-body > p.match")?.textContent || ""`)).startsWith("✓"), `${tag} decryption reproduces every state`);
}

// ---- spot checks of step-through values against ref.py (SIMON32/64 and SPECK128/256) ----
for (const [idx, tag] of [[0, "simon,16,4"], [19, "speck,64,4"]]) {
  const v = trace.cases[idx];
  await evaluate(`location.hash = "testing"`); await sleep(20);
  await evaluate(`document.querySelector('button[data-tv="${tag}"]').click()`);
  await evaluate(`location.hash = "round-keys"`); await sleep(20);
  // go to the first loop iteration, then read the hex of every row shown in each step
  const seen = await evaluate(`(() => { const d = document.querySelector("#ch-round-keys .dbg"), r = d.querySelector("input[type=range]");
    r.value = 1; r.dispatchEvent(new Event("input")); const out = [];
    const next = d.querySelector('[data-a="next"]');
    for (let i = 0; i < 12; i++) { out.push([...d.querySelectorAll(".dbg-body .vrow:not(.rul)")].map(x => [x.querySelector(".vn").firstChild.textContent, x.querySelector(".vh").textContent])); next.click(); }
    return out; })()`);
  const flat = new Map(seen.flat().map(([k, h]) => [k, h]));
  const p = v.ks[0];
  if (v.cipher === "simon") {
    expect(BigInt(flat.get("tmp") ?? "0x0").toString(16) === p.tmp32 || seen.flat().some(([k, h]) => k === "tmp" && BigInt(h).toString(16) === p.tmp29), "SIMON tmp shown");
    expect(seen.flat().some(([k, h]) => k === "k[4]" && BigInt(h).toString(16) === p.out), "SIMON k[4] shown = ref.py");
  } else {
    expect(seen.flat().some(([k, h]) => k === "l[3]" && BigInt(h).toString(16) === p.lnew), "SPECK l[3] shown = ref.py");
    expect(seen.flat().some(([k, h]) => k === "k[1]" && BigInt(h).toString(16) === p.knew), "SPECK k[1] shown = ref.py");
    expect(seen.flat().some(([k, h]) => k === "k[i] + ror(l[i], a, n)" && BigInt(h).toString(16) === p.sum), "SPECK unmasked sum shown = ref.py");
  }
}

// ---- rotations: both functions; _check demos; then line coverage ----
for (const fn of ["rfRol", "rfRor"]) { await evaluate(`location.hash = "rotations"`); await sleep(20); await evaluate(`document.querySelector("#${fn}").click()`); (await evaluate(seenLines)).forEach(l => covered.add(l)); }
for (const demo of ["pass", "count", "big"]) { await evaluate(`location.hash = "check"`); await sleep(20); await evaluate(`document.querySelector('[data-demo="${demo}"]').click()`);
  const [, seen] = await evaluate(stepAll); seen.forEach(l => covered.add(l)); }
const fnLines = [12, 13, ...range(15, 21), ...range(23, 34), 36, ...range(38, 42), ...range(44, 48), ...range(50, 59), ...range(61, 67), ...range(69, 75), ...range(102, 110)];
const constLines = [...range(1, 5), ...range(7, 10), ...range(77, 100)];
function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
const missFn = fnLines.filter(l => !covered.has(l)), missConst = constLines.filter(l => !covered.has(l));
expect(!missFn.length, "every function line highlighted somewhere; missing: " + missFn.join(","));
console.log(`line coverage: ${fnLines.length - missFn.length}/${fnLines.length} function lines, ${constLines.length - missConst.length}/${constLines.length} constant/VECTORS lines` + (missConst.length ? ` (not highlighted: ${missConst.join(",")})` : ""));

// ---- inputs: validation, clearing, apply ----
await evaluate(`location.hash = "testing"`); await sleep(20);
await evaluate(`document.querySelector('button[data-tv="simon,16,4"]').click()`);
await evaluate(`location.hash = "inputs"`); await sleep(30);
await evaluate(`(() => { const i = document.querySelector("#kw0"); i.value = "12345"; const j = document.querySelector("#ptx"); j.value = "zz"; document.querySelector("#btnApply").click(); })()`);
expect(await evaluate(`document.querySelector("#kw0").getAttribute("aria-invalid") === "true" && !document.querySelector("#kw0-err").hidden`), "oversized key word flagged");
expect(await evaluate(`document.querySelector("#ptx-err").textContent.includes("hex digits")`), "non-hex plaintext flagged");
expect(await evaluate(`document.querySelector("#inStatus").textContent.startsWith("Nothing was applied")`), "nothing applied on error");
expect(await evaluate(`document.activeElement.id === "kw0"`), "focus moves to first bad field");
await shot("02-inputs-errors");
await evaluate(`(() => { const i = document.querySelector("#kw0"); i.value = "0101"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
expect(await evaluate(`document.querySelector("#kw0-err").hidden && document.querySelector("#kw0").getAttribute("aria-invalid") === "false"`), "error clears on edit");
await evaluate(`(() => { document.querySelector("#ptx").value = "6565"; document.querySelector("#btnApply").click(); })()`);
expect(await evaluate(`document.querySelector("#cardBody dd").textContent === "1918 1110 0908 0101"`), "apply updates key card");
await evaluate(`(() => { const s = document.querySelector("#selBlock"); s.value = "48"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
expect(await evaluate(`document.querySelector("#cardVariant").textContent === "SIMON96/96"`), "block change loads vector");
expect(await evaluate(`[...document.querySelectorAll("#selKey option")].map(o => o.textContent).join() === "96 bits (m = 2),144 bits (m = 3)"`), "key options for 96-bit block");
await evaluate(`document.querySelector("#ciSpeck").click()`);
expect(await evaluate(`document.querySelector("#cardVariant").textContent === "SPECK96/96" && document.body.dataset.cipher === "speck"`), "cipher switch loads vector");
await evaluate(`document.querySelector("#btnRandom").click()`);
expect(await evaluate(`document.querySelector("#inStatus").textContent.includes("random")`), "random values");

// ---- _check demos: exact Python messages ----
await evaluate(`location.hash = "testing"`); await sleep(20);
await evaluate(`document.querySelector('button[data-tv="simon,16,4"]').click()`);
await evaluate(`location.hash = "check"`); await sleep(30);
await evaluate(`document.querySelector('[data-demo="count"]').click()`);
expect(await evaluate(`document.querySelector("#checkSummary").textContent.includes("ValueError: unsupported variant: 16-bit words with 3 key words")`), "count demo message");
expect(await evaluate(`document.querySelector("#ch-check .ln.on").dataset.l === "18"`), "count demo highlights line 18");
await shot("03-check-count");
await evaluate(`document.querySelector('[data-demo="big"]').click()`);
expect(await evaluate(`document.querySelector("#checkSummary").textContent.includes("ValueError: value 0x10000 does not fit in a 16-bit word")`), "big demo message");
expect(await evaluate(`document.querySelector("#ch-check .ln.on").dataset.l === "21"`), "big demo highlights line 21");
await evaluate(`(() => { document.querySelector("#customX").value = "-5"; document.querySelector("#customForm").requestSubmit(); })()`);
expect(await evaluate(`document.querySelector("#checkSummary").textContent.includes("value -0x5 does not fit")`), "negative custom value message");

// ---- film strip click opens the round in chapter 6 ----
await evaluate(`location.hash = "all-rounds"`); await sleep(40);
await evaluate(`(() => { const c = document.querySelector("#film"), r = c.getBoundingClientRect(), g = c._geo;
  c.dispatchEvent(new MouseEvent("click", { clientX: r.left + 60, clientY: r.top + g.head + g.rowH * 5.5, bubbles: true })); })()`);
expect(await evaluate(`location.hash === "#one-round" && document.querySelector("#ch-one-round output").textContent === "round 5 of 32"`), "film strip row 5 opens round 5");

// ---- keyboard navigation ----
await evaluate(`document.activeElement.blur()`);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await sleep(30);
expect(await evaluate(`location.hash`) === "#all-rounds", "→ key goes to next chapter");

// ---- screenshots: desktop light/dark, phone light/dark ----
const views = [["glance"], ["inputs"], ["rotations"], ["round-keys"], ["one-round"], ["all-rounds"], ["decryption"], ["testing"], ["diffusion"], ["modes"], ["source"]];
for (const [mode, w, h, mob] of [["light", 1400, 900, false], ["dark", 1400, 900, false], ["light", 390, 844, true], ["dark", 390, 844, true]]) {
  await viewport(w, h, mob); await scheme(mode); await sleep(80);
  for (const [ch] of views) {
    await evaluate(`location.hash = "${ch}"; window.scrollTo(0, 0)`); await sleep(120);
    if (ch === "round-keys" || ch === "one-round") await evaluate(`document.querySelector("#ch-${ch} [data-a=next]").click(); document.querySelector("#ch-${ch} [data-a=next]").click()`);
    await shot(`${mob ? "phone" : "desk"}-${mode}-${ch}`);
  }
  const overflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  expect(overflow <= 0, `${w}px ${mode}: no horizontal page scroll (overflow ${overflow}px)`);
}

console.log(`${checks} checks, ${steps} debugger steps clicked, screenshots in ${shots}`);
console.log(problems.length ? "PROBLEMS:\n" + [...new Set(problems)].join("\n") : "no console errors, all checks passed");
ws.close(); chrome.kill();
process.exit(problems.length ? 1 : 0);
