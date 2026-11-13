import { CheckCircle2 } from "lucide-react";
import { Analogy, Card, Chapter, Section } from "@/components/chapter";
import { AvalancheChart, CushionChart } from "@/components/charts/avalanche-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { PadlockDemo } from "@/components/padlock-demo";

export const metadata = { title: "6. Results · SIMON & SPECK" };

// `python3 demo.py bench` (pure Python, 2000 blocks per version, round keys precomputed). µs per block.
const SPEED = [
  ["32/64", 15.3, 7.7], ["48/72", 16.8, 7.7], ["48/96", 16.9, 8.0], ["64/96", 27.5, 13.2], ["64/128", 29.4, 13.4],
  ["96/96", 34.1, 12.6], ["96/144", 35.0, 13.2], ["128/128", 44.9, 14.9], ["128/192", 44.2, 15.2], ["128/256", 46.1, 15.8],
] as const;

const TESTS = [
  { n: "23", what: "tests on the Python library", detail: "paper vectors, regenerated z constants, the paper's own C code, all three modes" },
  { n: "8", what: "tests on the demo program", detail: "every command-line demo runs and prints the right thing" },
  { n: "50,882", what: "values compared, web vs Python", detail: "every intermediate value in the explainer page. 0 mismatches." },
  { n: "11 / 51", what: "game levels / steps played by a robot browser", detail: "the whole Cipher Quest game, with no errors" },
];

export default function ResultsPage() {
  return (
    <Chapter
      href="/results"
      takeaway={
        <>
          All 20 versions work. Both ciphers are fully mixed within the first <strong>17–22%</strong> of their rounds,
          SPECK is about <strong>2× faster</strong> in software, and the padlock picture shows that <em>how</em> you use a
          cipher matters as much as the cipher itself.
        </>
      }
    >
      <Section
        title="Finding 1: How fast does a change spread?"
        intro={
          <p>
            We flipped one input bit and counted how many output bits changed after each round. A good cipher reaches{" "}
            <strong>50%</strong>. The dot marks the round where every output bit depends on every input bit. Hover the
            chart to read exact values, and try other sizes.
          </p>
        }
      >
        <Card>
          <AvalancheChart />
        </Card>
      </Section>

      <Section
        title="Finding 2: Fully mixed early, so why all the extra rounds?"
        intro={
          <p>
            In all 20 versions, full mixing happens within the first <strong>17% to 22%</strong> of the rounds. The rest
            is a <strong>safety cushion</strong>: smarter attacks (differential and linear cryptanalysis) still work well
            after the bits look fully mixed.
          </p>
        }
      >
        <Card>
          <CushionChart />
        </Card>
        <div className="mt-6">
          <Analogy>Mixed is not the same as safe. Looking random to a simple test is only the starting point.</Analogy>
        </div>
      </Section>

      <Section
        title="Finding 3: The padlock picture"
        intro={
          <>
            <p>
              We drew a 12 × 12 padlock and encrypted each square as one block, using three different{" "}
              <strong>modes</strong> (ways of handling many blocks).
            </p>
            <p>
              <strong>ECB</strong> encrypts every block on its own, so every white square becomes the same block and
              every black square becomes the same block. The shape survives. <strong>CBC</strong> and{" "}
              <strong>CTR</strong> mix in a changing value, so the picture turns into noise.
            </p>
          </>
        }
      >
        <PadlockDemo />
        <div className="mt-6">
          <Analogy>A strong lock is not enough. How you use it matters just as much: ECB leaks the shape of your data.</Analogy>
        </div>
      </Section>

      <Section
        title="Finding 4: Speed in software"
        intro={
          <p>
            Time to encrypt one block in our Python code (lower is faster). SPECK wins at every size, from about 2× to
            3×. Earlier single runs showed a few 4–6× results; we treat those as timing noise.
          </p>
        }
      >
        <Card>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-simon" /> SIMON</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-speck" /> SPECK</span>
            <span className="text-muted">microseconds per block · pure Python</span>
          </div>
          <ul className="space-y-3">
            {SPEED.map(([size, si, sp]) => (
              <li key={size} className="grid grid-cols-[4.5rem_1fr_4rem] items-center gap-3">
                <span className="text-right font-mono text-sm text-ink-2">{size}</span>
                <div className="space-y-[2px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 rounded-r-[4px] bg-simon" style={{ width: `${(si / 50) * 85}%` }} />
                    <span className="font-mono text-xs tabular-nums text-ink-2">{si}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 rounded-r-[4px] bg-speck" style={{ width: `${(sp / 50) * 85}%` }} />
                    <span className="font-mono text-xs tabular-nums text-ink-2">{sp}</span>
                  </div>
                </div>
                <span className="text-right font-mono text-sm font-semibold">{(si / sp).toFixed(1)}×</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Python speed shows the trend, not real device speed. Measured with <code>python3 demo.py bench</code>.
          </p>
        </Card>
      </Section>

      <Section
        title="What the paper itself claims"
        intro={
          <p>
            We could not test real chips or tiny processors, so these numbers come straight from the paper (Table 1.1),
            for 64-bit block ciphers. They show the same pattern: <strong className="text-simon">SIMON</strong> is the
            smallest on a chip, <strong className="text-speck">SPECK</strong> is the fastest as a program.
          </p>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Chip area</h3>
            <p className="text-sm text-muted">gate equivalents · shorter is better</p>
            <div className="mt-2">
              <HBarChart
                ariaLabel="Chip area of 64-bit block ciphers"
                unit="gate equivalents (GE)"
                max={1600}
                bars={[
                  { label: "SIMON 64/96", value: 838, tone: "simon", note: "Smallest of the group." },
                  { label: "SPECK 64/96", value: 984, tone: "speck", note: "Still smaller than every older cipher here." },
                  { label: "TWINE 64/80", value: 1011, tone: "other" },
                  { label: "PRESENT 64/80", value: 1030, tone: "other" },
                  { label: "KATAN 64/80", value: 1054, tone: "other" },
                  { label: "KLEIN 64/96", value: 1528, tone: "other" },
                ]}
              />
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold">Speed on an 8-bit processor</h3>
            <p className="text-sm text-muted">kilobits per second · longer is better</p>
            <div className="mt-2">
              <HBarChart
                ariaLabel="Software speed of 64-bit block ciphers on an 8-bit AVR"
                unit="kbps on an 8-bit AVR at 16 MHz"
                max={1000}
                bars={[
                  { label: "SPECK 64/96", value: 888, tone: "speck", note: "About 9× faster than PRESENT." },
                  { label: "SIMON 64/96", value: 540, tone: "simon", note: "Not its specialty, still well ahead of PRESENT." },
                  { label: "TWINE 64/80", value: 472, tone: "other" },
                  { label: "KLEIN 64/96", value: 134, tone: "other" },
                  { label: "PRESENT 64/80", value: 96, tone: "other", note: "Moving single bits is slow in software." },
                  { label: "KATAN 64/80", value: 14, tone: "other" },
                ]}
              />
            </div>
          </Card>
        </div>
        <p className="mt-4 max-w-3xl rounded-xl border border-line bg-sunk p-4 text-sm text-ink-2">
          <strong className="text-ink">A fair warning:</strong> the paper only counts encryption (not decryption) and
          assumes round keys were prepared in advance. That makes its numbers look a little better than real use.
        </p>
      </Section>

      <Section title="How we checked our own work" intro={<p>Our web tools redo all the maths in JavaScript, separately from Python. If the JavaScript had a bug, people would learn wrong numbers, so we tested every layer.</p>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TESTS.map((t) => (
            <Card key={t.what}>
              <CheckCircle2 className="h-5 w-5 text-good" aria-hidden />
              <p className="mt-2 font-serif text-3xl">{t.n}</p>
              <p className="font-medium">{t.what}</p>
              <p className="mt-1 text-sm text-ink-2">{t.detail}</p>
              <p className="mt-2 text-xs font-semibold text-good">All passed</p>
            </Card>
          ))}
        </div>
      </Section>
    </Chapter>
  );
}
