import Link from "next/link";
import type { ReactNode } from "react";
import { CHAPTERS, neighbours } from "@/lib/chapters";
import { KeyboardNav } from "./keyboard-nav";

/** Page frame for every chapter: number, title, a one-line takeaway, then content and prev/next. */
export function Chapter({ href, takeaway, children }: { href: string; takeaway: ReactNode; children: ReactNode }) {
  const ch = CHAPTERS.find((c) => c.href === href)!;
  const { prev, next } = neighbours(href);
  return (
    <article className="mx-auto max-w-6xl animate-rise px-4 pb-16 pt-10 sm:px-6">
      <KeyboardNav prev={prev.href} next={next?.href} />
      <p className="font-mono text-sm text-muted">
        Chapter {ch.num} of {CHAPTERS.length}
      </p>
      <h1 className="mt-1 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{ch.title}</h1>
      <div className="mt-5 flex max-w-3xl gap-3 rounded-xl border border-line bg-card p-4">
        <span className="mt-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
          In one line
        </span>
        <p className="text-ink-2">{takeaway}</p>
      </div>

      <div className="mt-10 space-y-16">{children}</div>

      <nav aria-label="Chapter navigation" className="mt-20 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
        <Link href={prev.href} className="group rounded-xl border border-line p-4 transition-colors hover:bg-card">
          <span className="text-sm text-muted">← Previous</span>
          <span className="block font-medium group-hover:underline">{prev.num ? `${prev.num}. ${prev.title}` : "Overview"}</span>
        </Link>
        {next ? (
          <Link
            href={next.href}
            className="group rounded-xl border border-line p-4 text-right transition-colors hover:bg-card sm:col-start-2"
          >
            <span className="text-sm text-muted">Next →</span>
            <span className="block font-medium group-hover:underline">
              {next.num}. {next.title}
            </span>
          </Link>
        ) : (
          <Link href="/" className="group rounded-xl border border-line p-4 text-right transition-colors hover:bg-card">
            <span className="text-sm text-muted">The end</span>
            <span className="block font-medium group-hover:underline">Back to the overview</span>
          </Link>
        )}
      </nav>
      <p className="mt-3 text-center text-xs text-muted">Tip: use the ← and → arrow keys to move between chapters.</p>
    </article>
  );
}

/** A titled section inside a chapter. */
export function Section({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {intro && <div className="prose-story mt-3 max-w-3xl">{intro}</div>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-5 sm:p-6 ${className}`}>{children}</div>;
}

/** Plain-English callout used for analogies. */
export function Analogy({ children }: { children: ReactNode }) {
  return (
    <aside className="flex max-w-3xl gap-3 rounded-xl border-l-4 border-hl bg-hl-soft/60 p-4 text-ink-2">
      <span aria-hidden className="text-lg">💡</span>
      <div>{children}</div>
    </aside>
  );
}

export function Tag({ family }: { family: "simon" | "speck" }) {
  return family === "simon" ? (
    <span className="rounded-md bg-simon-soft px-1.5 py-0.5 font-semibold text-simon">SIMON</span>
  ) : (
    <span className="rounded-md bg-speck-soft px-1.5 py-0.5 font-semibold text-speck">SPECK</span>
  );
}
