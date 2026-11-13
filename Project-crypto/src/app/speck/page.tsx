import { Analogy, Card, Chapter, Section } from "@/components/chapter";
import { RoundKeyStrip, SpeckWalkthrough } from "@/components/walkthroughs";

export const metadata = { title: "4. SPECK · SIMON & SPECK" };

const COMPARE = [
  ["32/64", 32, 22], ["48/72", 36, 22], ["48/96", 36, 23], ["64/96", 42, 26], ["64/128", 44, 27],
  ["96/96", 52, 28], ["96/144", 54, 29], ["128/128", 68, 32], ["128/192", 69, 33], ["128/256", 72, 34],
] as const;

export default function SpeckPage() {
  return (
    <Chapter
      href="/speck"
      takeaway={
        <>
          SPECK rotates, adds and XORs, about 3 processor instructions per word. Addition is a strong stirrer, so it
          needs only <strong>22 to 34 rounds</strong>, roughly half of SIMON&apos;s.
        </>
      }
    >
      <Section
        title="One round, step by step"
        intro={
          <p>
            Round 1 of SPECK32/64 on the paper&apos;s example. Watch the <strong>Add</strong> step: carries change bits
            that a plain XOR would leave alone.
          </p>
        }
      >
        <SpeckWalkthrough />
      </Section>

      <Section
        title="The clever key schedule"
        intro={
          <p>
            To make round keys, SPECK runs <strong>its own round function again</strong>. Instead of a key, it feeds in
            the round number: 0, 1, 2 and so on. That number plays the same role as SIMON&apos;s constants, so no extra
            code or circuit is needed.
          </p>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <p className="text-sm text-muted">Encryption round</p>
            <p className="mt-1 font-mono text-sm">x = (x ⋙ α + y) ⊕ <span className="rounded bg-hl-soft px-1">k</span></p>
            <p className="font-mono text-sm">y = (y ⋘ β) ⊕ x</p>
            <p className="mt-4 text-sm text-muted">Key schedule step</p>
            <p className="mt-1 font-mono text-sm">l = (l ⋙ α + k) ⊕ <span className="rounded bg-hl-soft px-1">i</span></p>
            <p className="font-mono text-sm">k = (k ⋘ β) ⊕ l</p>
            <p className="mt-4 text-sm text-ink-2">Same shape. The round number i takes the place of the key.</p>
          </Card>
          <Card>
            <p className="mb-3 text-sm text-muted">Round keys k0 to k7 for the key 1918 1110 0908 0100</p>
            <RoundKeyStrip family="speck" />
            <p className="mt-4 text-sm text-ink-2">
              In our Python code the key schedule literally calls the round function, which is how the paper describes
              it.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Rounds needed: SPECK vs SIMON">
        <Card>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-simon" /> SIMON</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-speck" /> SPECK</span>
          </div>
          <ul className="space-y-3">
            {COMPARE.map(([size, si, sp]) => (
              <li key={size} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
                <span className="text-right font-mono text-sm text-ink-2">{size}</span>
                <div className="space-y-[2px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 rounded-r-[4px] bg-simon" style={{ width: `${(si / 72) * 85}%` }} />
                    <span className="font-mono text-xs tabular-nums text-ink-2">{si}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 rounded-r-[4px] bg-speck" style={{ width: `${(sp / 72) * 85}%` }} />
                    <span className="font-mono text-xs tabular-nums text-ink-2">{sp}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="mt-6">
          <Analogy>
            One carry can travel across the whole word in a single addition, like a row of dominoes. SIMON&apos;s AND
            only touches nearby bits. That is why SPECK gets away with fewer rounds.
          </Analogy>
        </div>
      </Section>
    </Chapter>
  );
}
