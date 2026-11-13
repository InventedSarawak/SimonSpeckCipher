import { Card, Chapter, Section } from "@/components/chapter";

export const metadata = { title: "7. Verdict · SIMON & SPECK" };

const TIMELINE = [
  { year: "2013", title: "NSA publishes SIMON and SPECK", text: "The paper gives the designs and test vectors, but almost no explanation of why the numbers were chosen.", tone: "neutral" },
  { year: "2017", title: "Design notes arrive, late", text: "The NSA finally explains its choices. By then many experts had already lost confidence.", tone: "neutral" },
  { year: "2018", title: "ISO rejects both ciphers", text: "The international standards body drops them after objections from several national delegations.", tone: "bad" },
  { year: "2018", title: "SPECK added to Linux, then removed", text: "Added for encrypting cheap Android phones, removed the same year. Google built its own system, Adiantum, instead.", tone: "bad" },
  { year: "2023", title: "NIST picks Ascon", text: "The US standards body chooses a different lightweight cipher after an open, public competition.", tone: "bad" },
] as const;

const LESSONS = [
  {
    title: "The bendy step decides where a cipher shines",
    text: "AND is cheap on a chip but stirs weakly, so SIMON needs many rounds. Addition is one CPU instruction and stirs strongly, so SPECK needs fewer.",
  },
  {
    title: "Mixed is not the same as safe",
    text: "Both ciphers are fully mixed within the first fifth of their rounds. The rest is protection against real attacks.",
  },
  {
    title: "How you use the lock matters",
    text: "The ECB padlock picture proves it: a perfect cipher in the wrong mode still leaks the shape of your data.",
  },
  {
    title: "Trust is part of the design",
    text: "Two technically sound ciphers were turned down mainly because their designers kept their reasons secret.",
  },
];

const GOALS = [
  "Build all 20 versions from the paper",
  "Match every official test vector",
  "Test the paper's claims ourselves",
  "Make teaching tools that agree with the code",
];

export default function VerdictPage() {
  return (
    <Chapter
      href="/verdict"
      takeaway={
        <>
          Nobody has broken full SIMON or SPECK, but the world did not trust them, because the designers did not explain
          their choices. Our code is for <strong>learning, not for protecting real secrets</strong>.
        </>
      }
    >
      <Section
        title="Strong on paper"
        intro={
          <p>
            Researchers have only broken <strong>shortened</strong> versions with fewer rounds. The full ciphers still
            stand. So why weren&apos;t they adopted?
          </p>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-t-4 border-t-good">
            <p className="text-sm font-semibold uppercase tracking-wide text-good">Technically</p>
            <p className="mt-2 text-lg">No attack breaks the full-round ciphers.</p>
          </Card>
          <Card className="border-t-4 border-t-bad">
            <p className="text-sm font-semibold uppercase tracking-wide text-bad">Socially</p>
            <p className="mt-2 text-lg">
              The NSA did not say why it chose these rotations, constants or round counts. When a spy agency designs a lock
              and won&apos;t explain it, people worry about a hidden weakness.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="What happened next">
        <ol className="relative ml-3 space-y-6 border-l-2 border-line pl-8">
          {TIMELINE.map((t, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[2.6rem] top-1 h-4 w-4 rounded-full border-4 border-paper ${
                  t.tone === "bad" ? "bg-bad" : "bg-ink-2"
                }`}
              />
              <p className="font-mono text-sm text-muted">{t.year}</p>
              <p className="text-lg font-semibold">{t.title}</p>
              <p className="mt-1 max-w-2xl text-ink-2">{t.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl rounded-xl border border-line bg-sunk p-4 text-sm text-ink-2">
          <strong className="text-ink">A practical limit too:</strong> with the smallest 32-bit block you should change
          the key after about <strong className="text-ink">256 KB</strong> of data, or information starts to leak (the
          “birthday bound”).
        </p>
      </Section>

      <Section title="Four lessons we took away">
        <ol className="grid gap-4 md:grid-cols-2">
          {LESSONS.map((l, i) => (
            <li key={l.title} className="rounded-2xl border border-line bg-card p-6">
              <span className="font-serif text-5xl leading-none text-muted">{i + 1}</span>
              <p className="mt-3 text-lg font-semibold">{l.title}</p>
              <p className="mt-2 leading-relaxed text-ink-2">{l.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Did we reach our goals?">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <ul className="space-y-3">
              {GOALS.map((g) => (
                <li key={g} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-soft text-sm font-bold text-good">
                    ✓
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">With more time, we would</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-2">
              <li>Run the ciphers in C on a real tiny microcontroller.</li>
              <li>Carry out a real attack on a shortened SIMON to show the safety cushion.</li>
              <li>Repeat the speed tests several times to remove the noise.</li>
            </ul>
          </Card>
        </div>
      </Section>

      <section className="rounded-3xl bg-ink px-6 py-12 text-center text-paper sm:px-12">
        <p className="font-serif text-3xl leading-snug sm:text-4xl">
          <span className="text-[var(--simon)]">SIMON</span> the small and <span className="text-[var(--speck)]">SPECK</span>{" "}
          the fast were well built. <br className="hidden sm:block" />
          The world just never fully trusted them.
        </p>
      </section>
    </Chapter>
  );
}
