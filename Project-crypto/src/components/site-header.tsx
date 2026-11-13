"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHAPTERS } from "@/lib/chapters";

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="flex gap-0.5">
            <span className="h-4 w-2 rounded-sm bg-simon" />
            <span className="h-4 w-2 rounded-sm bg-speck" />
          </span>
          <span>
            <span className="text-simon">SIMON</span> <span className="text-muted">&amp;</span>{" "}
            <span className="text-speck">SPECK</span>
          </span>
        </Link>
        <nav aria-label="Chapters" className="-mr-4 flex flex-1 justify-end overflow-x-auto pr-4 sm:mr-0 sm:pr-0">
          <ol className="flex gap-1">
            {CHAPTERS.map((c) => {
              const active = path === c.href;
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"
                    }`}
                  >
                    <span className={`font-mono text-xs ${active ? "text-paper/70" : "text-muted"}`}>{c.num}</span>
                    {c.short}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </header>
  );
}
