import { Cpu, HeartPulse, Sprout, Tag as TagIcon } from "lucide-react";
import { Analogy, Card, Chapter, Section } from "@/components/chapter";
import { HBarChart } from "@/components/charts/hbar-chart";

export const metadata = { title: "1. The problem · SIMON & SPECK" };

const DEVICES = [
  { icon: TagIcon, name: "Shop RFID tag", note: "No battery at all. Powered by the reader's radio waves." },
  { icon: Sprout, name: "Farm sensor", note: "Must run for years on one small battery." },
  { icon: HeartPulse, name: "Pacemaker", note: "Its data is private medical information." },
  { icon: Cpu, name: "8-bit microcontroller", note: "4 KB of storage and 256 bytes of memory." },
];

const PRICES = [
  ["AND gate", "1.25", "SIMON's non-linear step"],
  ["XOR gate", "2.00", "Mixing in the key"],
  ["1-bit adder", "5.75", "SPECK's non-linear step"],
  ["1 bit of memory", "4.25", "Storing the block and key"],
];

const OLD = [
  { name: "AES", good: "Fast in software", bad: "Smallest chip is 2,400 GE, over the budget", hw: false, sw: true },
  { name: "PRESENT", good: "Small chip", bad: "Slow in software: 96 kbps", hw: true, sw: false },
  { name: "KATAN", good: "Very small chip", bad: "Very slow in software: 14 kbps", hw: true, sw: false },
];

export default function ProblemPage() {
  return (
    <Chapter
      href="/problem"
      takeaway={
        <>
          Tiny devices need encryption, but the standard cipher (AES) does not fit on their chips. The NSA&apos;s answer
          was two new ciphers that are small <em>and</em> fast.
        </>
      }
    >
      <Section
        title="A world full of small machines"
        intro={
          <p>
            These machines send messages, and some of those messages are private. To keep them secret they must be{" "}
            <strong>encrypted</strong>: scrambled with a secret key so only someone with the key can read them. The
            trouble is that these machines are tiny, with small chips, little memory and weak batteries.
          </p>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEVICES.map(({ icon: Icon, name, note }) => (
            <Card key={name}>
              <Icon aria-hidden className="h-6 w-6 text-ink-2" strokeWidth={1.75} />
              <p className="mt-3 font-semibold">{name}</p>
              <p className="mt-1 text-sm text-ink-2">{note}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="How engineers measure “small”"
        intro={
          <p>
            Chip size is counted in <strong>gate equivalents (GE)</strong>. Think of 1 GE as one small brick. A cipher
            counts as “lightweight” if it fits in about <strong>2,000 bricks</strong>.
          </p>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <h3 className="font-semibold">The brick price list</h3>
            <p className="mt-1 text-sm text-muted">From the paper&apos;s chip library (130 nm)</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 font-normal">Part</th>
                  <th className="pb-2 text-right font-normal">Bricks (GE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PRICES.map(([part, ge, why]) => (
                  <tr key={part}>
                    <td className="py-2">
                      {part}
                      <span className="block text-xs text-muted">{why}</span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{ge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 rounded-lg bg-sunk p-3 text-sm text-ink-2">
              <strong className="text-ink">Memory is the expensive part.</strong> Just storing a 64-bit block and a
              96-bit key takes 160 memory bits ≈ <strong className="text-ink">680 GE</strong>, before any real work.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold">Smallest chip size of each cipher</h3>
            <p className="mt-1 text-sm text-muted">Paper, Tables 1.1 and 6.1. Shorter is better.</p>
            <div className="mt-4">
              <HBarChart
                ariaLabel="Chip area in gate equivalents; AES is the only one over the 2000 GE budget"
                unit="gate equivalents (GE)"
                max={2600}
                refLine={{ value: 2000, label: "Budget ≈ 2,000 GE" }}
                bars={[
                  { label: "SIMON 32/64", value: 523, tone: "simon", note: "The smallest version of SIMON, built bit-serial." },
                  { label: "SIMON 64/128", value: 1000, tone: "simon", note: "Same security as PRESENT-128, smaller." },
                  { label: "SPECK 64/128", value: 1127, tone: "speck", note: "Bigger than SIMON (an adder costs more than an AND)." },
                  { label: "PRESENT 64/128", value: 1339, tone: "other", note: "The best-known older lightweight cipher." },
                  { label: "SIMON 128/128", value: 1317, tone: "simon", note: "About half the area of AES with the same block and key." },
                  { label: "SPECK 128/128", value: 1396, tone: "speck", note: "Also well under the budget." },
                  { label: "AES 128/128", value: 2400, tone: "other", note: "The standard cipher. Over the budget, so it does not fit." },
                ]}
              />
            </div>
          </Card>
        </div>
      </Section>

      <Section
        title="Before 2013: each cipher was good at only one thing"
        intro={
          <p>
            Some older ciphers were small on a chip (<strong>hardware</strong>). Others were fast as a program (
            <strong>software</strong>). Almost none were good at both, and real products often need both: a tiny tag
            talks to a reader that runs software.
          </p>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-sunk text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cipher</th>
                <th className="px-4 py-3 font-medium">Small chip?</th>
                <th className="px-4 py-3 font-medium">Fast program?</th>
                <th className="px-4 py-3 font-medium">The catch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {OLD.map((o) => (
                <tr key={o.name}>
                  <td className="px-4 py-3 font-semibold">{o.name}</td>
                  <td className="px-4 py-3"><YesNo ok={o.hw} /></td>
                  <td className="px-4 py-3"><YesNo ok={o.sw} /></td>
                  <td className="px-4 py-3 text-ink-2">{o.bad}</td>
                </tr>
              ))}
              <tr className="bg-simon-soft/40">
                <td className="px-4 py-3 font-semibold">
                  <span className="text-simon">SIMON</span> &amp; <span className="text-speck">SPECK</span>
                </td>
                <td className="px-4 py-3"><YesNo ok /></td>
                <td className="px-4 py-3"><YesNo ok /></td>
                <td className="px-4 py-3 text-ink-2">Each brother is best at one job and still decent at the other.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <Analogy>
            So in 2013 the NSA published two “brothers”: <strong className="text-simon">SIMON</strong>, built to be tiny
            on a chip, and <strong className="text-speck">SPECK</strong>, built to be fast as a program. Each comes in 10
            sizes, so 20 versions in total.
          </Analogy>
        </div>
      </Section>
    </Chapter>
  );
}

function YesNo({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="rounded-md bg-good-soft px-2 py-0.5 font-medium text-good">Yes</span>
  ) : (
    <span className="rounded-md bg-bad-soft px-2 py-0.5 font-medium text-bad">No</span>
  );
}
