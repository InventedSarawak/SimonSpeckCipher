import { Analogy, Card, Chapter, Section } from "@/components/chapter";
import { PipelineDiagram, StyleDiagram } from "@/components/diagrams";
import { OpsPlayground } from "@/components/ops-playground";

export const metadata = { title: "2. Basics · SIMON & SPECK" };

export default function BasicsPage() {
  return (
    <Chapter
      href="/basics"
      takeaway={
        <>
          A block cipher repeats one small mixing step (a <strong>round</strong>) many times. Every round needs one
          “bendy” non-linear operation: <strong className="text-simon">AND</strong> for SIMON,{" "}
          <strong className="text-speck">addition</strong> for SPECK.
        </>
      }
    >
      <Section
        title="What a block cipher does"
        intro={
          <p>
            A <strong>block cipher</strong> takes a fixed-size chunk of a message (a <strong>block</strong>) and
            scrambles it with a secret <strong>key</strong>. With the same key you can unscramble it again. Each round
            also needs its own small key, so a <strong>key schedule</strong> grows the one main key into many round
            keys.
          </p>
        }
      >
        <Card>
          <PipelineDiagram />
        </Card>
        <div className="mt-6">
          <Analogy>
            Think of mixing paint. One stir does not mix much. Many stirs mix it completely. A round is one stir.
          </Analogy>
        </div>
      </Section>

      <Section title="Two rules every good cipher follows" intro={<p>Claude Shannon described these in 1949.</p>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Confusion</p>
            <p className="mt-2 text-lg">The link between the key and the output should be very messy.</p>
            <p className="mt-2 text-sm text-ink-2">Knowing the output should tell you almost nothing about the key.</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Diffusion</p>
            <p className="mt-2 text-lg">Change one input bit and about half of the output bits should change.</p>
            <p className="mt-2 text-sm text-ink-2">
              After enough rounds, every output bit depends on every input bit. We measure this in Chapter 6.
            </p>
          </Card>
        </div>
      </Section>

      <Section
        title="The four tools inside the lock"
        intro={
          <>
            <p>
              Both ciphers are built from just a few operations on bits. <strong>Click the bits</strong> below to see
              each one work.
            </p>
            <p>
              XOR and rotation are “straight-line” (linear). A cipher built only from them could be solved like school
              equations. So every cipher needs one <strong>bendy</strong> (non-linear) step to break the straightness.
            </p>
          </>
        }
      >
        <OpsPlayground />
      </Section>

      <Section title="Two ways to build the lock">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-t-4 border-t-simon">
            <p className="text-sm text-muted">Used by SIMON</p>
            <h3 className="text-xl font-semibold text-simon">Feistel style</h3>
            <div className="my-4 flex justify-center">
              <StyleDiagram kind="feistel" />
            </div>
            <p className="text-sm leading-relaxed text-ink-2">
              Split the block into two halves. Run the left half through a function <em>f</em>, mix the result into
              the right half, then swap. The clever part: you can always undo this, even if <em>f</em> itself cannot
              be undone. That is why SIMON is allowed to use AND.
            </p>
          </Card>
          <Card className="border-t-4 border-t-speck">
            <p className="text-sm text-muted">Used by SPECK</p>
            <h3 className="text-xl font-semibold text-speck">ARX style</h3>
            <div className="my-4 flex justify-center">
              <StyleDiagram kind="arx" />
            </div>
            <p className="text-sm leading-relaxed text-ink-2">
              ARX stands for <strong>A</strong>dd, <strong>R</strong>otate, <strong>X</strong>OR, and that is all it
              uses. On a processor each of these is a single instruction, so the code is tiny and fast.
            </p>
          </Card>
        </div>
      </Section>
    </Chapter>
  );
}
