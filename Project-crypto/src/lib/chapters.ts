export interface Chapter {
  href: string;
  num: number;
  short: string; // label in the top bar
  title: string;
  blurb: string; // one line for the home page
}

export const CHAPTERS: Chapter[] = [
  {
    href: "/problem",
    num: 1,
    short: "The problem",
    title: "Tiny devices need tiny locks",
    blurb: "Why AES is too big for RFID tags, sensors and pacemakers, and what the NSA proposed instead.",
  },
  {
    href: "/basics",
    num: 2,
    short: "Basics",
    title: "How a block cipher works",
    blurb: "Blocks, keys and rounds, plus the four bit operations everything is built from. Try them yourself.",
  },
  {
    href: "/simon",
    num: 3,
    short: "SIMON",
    title: "SIMON, the hardware brother",
    blurb: "A Feistel cipher made of AND, XOR and rotation. We walk through round 1 by hand.",
  },
  {
    href: "/speck",
    num: 4,
    short: "SPECK",
    title: "SPECK, the software brother",
    blurb: "An Add-Rotate-XOR cipher that reuses its own round for the key schedule.",
  },
  {
    href: "/try-it",
    num: 5,
    short: "Try it",
    title: "Try it yourself",
    blurb: "Encrypt with any of the 20 versions and watch every round. Checked live against the paper.",
  },
  {
    href: "/results",
    num: 6,
    short: "Results",
    title: "What we found",
    blurb: "Avalanche, the ECB padlock picture, speed, and the paper's own hardware numbers.",
  },
  {
    href: "/verdict",
    num: 7,
    short: "Verdict",
    title: "Strong, but not trusted",
    blurb: "Why two unbroken ciphers were rejected by the world, and the four lessons we took away.",
  },
];

export function neighbours(href: string) {
  const i = CHAPTERS.findIndex((c) => c.href === href);
  return {
    prev: i > 0 ? CHAPTERS[i - 1] : { href: "/", num: 0, short: "Home", title: "Overview", blurb: "" },
    next: i >= 0 && i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null,
  };
}
