import Link from "next/link";
import { CHAPTERS } from "@/lib/chapters";

const FACTS = [
  { value: "20", label: "cipher versions built", note: "10 SIMON + 10 SPECK" },
  { value: "20 / 20", label: "match the paper", note: "every official test vector" },
  { value: "50,882", label: "values cross-checked", note: "web code vs Python, 0 mismatches" },
  { value: "~2×", label: "SPECK faster than SIMON", note: "in software, every size" },
];

const TEAM = ["Aadi", "Vinnet", "Vedant", "Dhruv"];

export default function Home() {
  return (
    <div className="animate-rise">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
        <p className="font-mono text-sm text-muted">Cryptography project · Study of an NSA paper (2013)</p>
        <h1 className="mt-3 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Two tiny locks for <span className="italic">tiny machines</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
          RFID tags, farm sensors and pacemakers need to keep messages secret, but their chips are too small for AES. In
          2013 the NSA published two small ciphers to fix that:{" "}
          <strong className="text-simon">SIMON</strong>, built to be tiny on a chip, and{" "}
          <strong className="text-speck">SPECK</strong>, built to be fast as a program. We built all 20 versions, checked
          them against the paper, and tested what the paper claims.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/problem"
            className="rounded-full bg-ink px-5 py-3 font-medium text-paper transition-transform hover:-translate-y-0.5"
          >
            Start the story →
          </Link>
          <Link
            href="/try-it"
            className="rounded-full border border-line-strong px-5 py-3 font-medium transition-colors hover:bg-card"
          >
            Jump to the live demo
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">
          Team: {TEAM.join(", ")} · About 10 minutes to read · Use ← → keys to move between chapters
        </p>
      </section>

      {/* Key numbers */}
      <section aria-label="Key results" className="border-y border-line bg-card">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <div
              key={f.label}
              className={`py-7 pr-4 ${i % 2 ? "pl-4 sm:pl-6" : ""} ${i > 0 ? "lg:border-l lg:border-line lg:pl-6" : ""} ${
                i >= 2 ? "border-t border-line lg:border-t-0" : ""
              } ${i % 2 ? "border-l border-line" : ""}`}
            >
              <dt className="text-sm text-muted">{f.label}</dt>
              <dd className="mt-1 font-serif text-4xl tracking-tight">{f.value}</dd>
              <dd className="mt-1 text-sm text-ink-2">{f.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The two brothers */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Meet the two brothers</h2>
        <p className="mt-2 max-w-2xl text-ink-2">
          Same family, same sizes, different strengths. This colour code is used on every page.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Brother
            name="SIMON"
            tone="simon"
            role="The hardware brother"
            line="Smallest possible circuit on a chip."
            rows={[
              ["Built from", "AND, XOR, rotation"],
              ["Style", "Feistel (split in half, mix, swap)"],
              ["Rounds", "32 to 72"],
              ["Smallest chip", "523 gate equivalents"],
            ]}
          />
          <Brother
            name="SPECK"
            tone="speck"
            role="The software brother"
            line="Fastest possible code on a tiny processor."
            rows={[
              ["Built from", "Addition, rotation, XOR (ARX)"],
              ["Style", "ARX, about 3 instructions per word"],
              ["Rounds", "22 to 34"],
              ["8-bit CPU speed", "888 kbps (PRESENT: 96)"],
            ]}
          />
        </div>
      </section>

      {/* Chapter map */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">The story in 7 chapters</h2>
        <p className="mt-2 max-w-2xl text-ink-2">
          Read them in order, or jump straight to the part you want. Each chapter starts with a one-line summary.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm"
              >
                <span className="font-mono text-sm text-muted">{String(c.num).padStart(2, "0")}</span>
                <span className="mt-1 text-lg font-semibold group-hover:underline">{c.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-ink-2">{c.blurb}</span>
              </Link>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-2">
            <span className="font-semibold text-ink">Our honest bottom line</span>
            Nobody has broken full SIMON or SPECK, yet the world did not adopt them. The reason was trust, not maths.
          </li>
        </ol>
      </section>
    </div>
  );
}

function Brother({
  name,
  tone,
  role,
  line,
  rows,
}: {
  name: string;
  tone: "simon" | "speck";
  role: string;
  line: string;
  rows: [string, string][];
}) {
  const color = tone === "simon" ? "text-simon" : "text-speck";
  const bar = tone === "simon" ? "bg-simon" : "bg-speck";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card p-6">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />
      <p className="text-sm text-muted">{role}</p>
      <h3 className={`font-serif text-4xl ${color}`}>{name}</h3>
      <p className="mt-1 text-ink-2">{line}</p>
      <dl className="mt-5 divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
