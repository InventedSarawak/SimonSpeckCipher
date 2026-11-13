import { Analogy, Card, Chapter, Section } from "@/components/chapter";
import { RoundKeyStrip, SimonWalkthrough } from "@/components/walkthroughs";
import { Z } from "@/lib/cipher";

export const metadata = { title: "3. SIMON · SIMON & SPECK" };

const ROUNDS = [
  ["32/64", 32], ["48/72", 36], ["48/96", 36], ["64/96", 42], ["64/128", 44],
  ["96/96", 52], ["96/144", 54], ["128/128", 68], ["128/192", 69], ["128/256", 72],
] as const;

export default function SimonPage() {
  return (
    <Chapter
      href="/simon"
      takeaway={
        <>
          SIMON stirs the left half with AND, XOR and rotation, pours it into the right half with the key, and swaps.
          It is tiny on a chip, but AND is a weak stirrer, so it needs <strong>32 to 72 rounds</strong>.
        </>
      }
    >
      <Section
        title="One round, step by step"
        intro={
          <p>
            This is round 1 of SIMON32/64 using the exact example from the paper. Press <strong>Next step</strong> to
            follow the bits. Highlighted parts of the diagram show where you are.
          </p>
        }
      >
        <SimonWalkthrough />
      </Section>

      <Section title="Why SIMON is so small on a chip">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="font-serif text-4xl text-simon">1</p>
            <p className="mt-1 font-semibold">AND gate per bit</p>
            <p className="mt-1 text-sm text-ink-2">The cheapest non-linear gate there is: 1.25 GE.</p>
          </Card>
          <Card>
            <p className="font-serif text-4xl text-simon">1 bit</p>
            <p className="mt-1 font-semibold">at a time</p>
            <p className="mt-1 text-sm text-ink-2">
              f only looks at bits 1, 2 and 8 places away, so the chip can process one bit per clock tick.
            </p>
          </Card>
          <Card>
            <p className="font-serif text-4xl text-simon">523 GE</p>
            <p className="mt-1 font-semibold">smallest SIMON</p>
            <p className="mt-1 text-sm text-ink-2">A quarter of the 2,000 GE budget. AES needs about 2,400.</p>
          </Card>
        </div>
        <div className="mt-6">
          <Analogy>
            The catch: AND is a weak stirrer. Each round only reaches neighbours 1, 2 and 8 places away, so SIMON needs
            many rounds to mix everything.
          </Analogy>
        </div>
      </Section>

      <Section
        title="The key schedule: one key becomes many"
        intro={
          <p>
            The first few round keys are just the pieces of your main key (shown in black below). Every later key is
            made from earlier keys using rotations and XOR, plus a constant.
          </p>
        }
      >
        <Card>
          <p className="mb-3 text-sm text-muted">Round keys k0 to k7 for the key 1918 1110 0908 0100</p>
          <RoundKeyStrip family="simon" />
          <p className="mt-3 text-sm text-ink-2">
            We built <span className="font-mono font-semibold text-simon">k4 = 71c3</span> by hand too, and it matched.
          </p>
        </Card>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h3 className="font-semibold">Why add constants?</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              If every round looked identical, an attacker could line one round up against the next (a{" "}
              <strong>slide attack</strong>). Mixing in a fixed bit pattern makes every round slightly different. There
              are five patterns, z0 to z4, each 62 bits long. We regenerated all five from scratch and every bit matched
              the paper.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold">The constant z0, bit by bit</h3>
            <div className="mt-3 flex flex-wrap gap-[3px]" aria-label="z0 constant sequence">
              {Z[0].split("").map((b, i) => (
                <span key={i} className={`h-4 w-3 rounded-[3px] ${b === "1" ? "bg-simon" : "bg-sunk"}`} title={b} />
              ))}
            </div>
            <p className="mt-3 break-all font-mono text-xs text-muted">{Z[0]}</p>
          </Card>
        </div>
      </Section>

      <Section title="All 10 sizes of SIMON">
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-sunk text-left text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Block / key (bits)</th>
                <th className="px-4 py-2.5 font-medium">Rounds</th>
                <th className="w-1/2 px-4 py-2.5 font-medium" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROUNDS.map(([size, r]) => (
                <tr key={size}>
                  <td className="px-4 py-2 font-mono">SIMON {size}</td>
                  <td className="px-4 py-2 font-mono tabular-nums">{r}</td>
                  <td className="px-4 py-2">
                    <span className="block h-2.5 rounded-r-[4px] bg-simon" style={{ width: `${(r / 72) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">Bigger blocks and bigger keys need more rounds.</p>
      </Section>
    </Chapter>
  );
}
