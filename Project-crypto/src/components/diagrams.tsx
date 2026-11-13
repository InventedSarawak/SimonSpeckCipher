/* Round diagrams drawn in plain SVG, using the site's colour tokens so they work in light and dark mode. */

const S = { stroke: "var(--ink-2)", strokeWidth: 2, fill: "none" } as const;

function Arrow({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
      </marker>
    </defs>
  );
}

function Xor({ cx, cy, active }: { cx: number; cy: number; active?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={active ? "var(--hl-soft)" : "var(--card)"} stroke="var(--ink-2)" strokeWidth={2} />
      <path d={`M${cx - 7},${cy} h14 M${cx},${cy - 7} v14`} stroke="var(--ink-2)" strokeWidth={2} />
    </g>
  );
}

function Plus({ cx, cy, active }: { cx: number; cy: number; active?: boolean }) {
  return (
    <g>
      <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={4} fill={active ? "var(--hl-soft)" : "var(--speck-soft)"} stroke="var(--speck)" strokeWidth={2} />
      <path d={`M${cx - 7},${cy} h14 M${cx},${cy - 7} v14`} stroke="var(--speck)" strokeWidth={2.5} />
    </g>
  );
}

function Word({ x, y, label, sub, tone }: { x: number; y: number; label: string; sub?: string; tone: string }) {
  return (
    <g>
      <rect x={x} y={y} width={120} height={38} rx={8} fill="var(--card)" stroke={tone} strokeWidth={2} />
      <text x={x + 60} y={y + (sub ? 17 : 24)} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--ink)">
        {label}
      </text>
      {sub && (
        <text x={x + 60} y={y + 31} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
          {sub}
        </text>
      )}
    </g>
  );
}

function Box({ x, y, w, h, label, tone, active }: { x: number; y: number; w: number; h: number; label: string; tone: string; active?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={active ? "var(--hl-soft)" : "var(--card)"} stroke={tone} strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize={14} fontFamily="var(--font-geist-mono)" fill="var(--ink)">
        {label}
      </text>
    </g>
  );
}

/** SIMON round: Feistel. `active` highlights one part (used by the walkthrough). */
export function SimonRoundDiagram({ active }: { active?: "f" | "xor" | "key" | "swap" }) {
  return (
    <svg viewBox="0 0 420 360" className="mx-auto w-full max-w-md" role="img" aria-label="Diagram of one SIMON round: f of the left word is XORed into the right word together with the round key, then the two words swap.">
      <Arrow id="a-simon" />
      <Word x={50} y={14} label="x" sub="left word" tone="var(--simon)" />
      <Word x={250} y={14} label="y" sub="right word" tone="var(--simon)" />
      {/* x lane down then cross to the right */}
      <path d="M110,52 V250 L310,300" {...S} markerEnd="url(#a-simon)" opacity={active === "swap" ? 1 : 0.9} />
      {/* branch into f */}
      <path d="M110,120 H148" {...S} markerEnd="url(#a-simon)" />
      <rect x={150} y={92} width={120} height={56} rx={8} fill={active === "f" ? "var(--hl-soft)" : "var(--simon-soft)"} stroke="var(--simon)" strokeWidth={2} strokeDasharray={active === "f" ? "0" : "5 4"} />
      <text x={210} y={115} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--simon)">f(x)</text>
      <text x={210} y={134} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-geist-mono)" fill="var(--ink-2)">(x⋘1 & x⋘8) ⊕ x⋘2</text>
      <path d="M270,120 H297" {...S} markerEnd="url(#a-simon)" />
      {/* y lane */}
      <path d="M310,52 V108" {...S} />
      <Xor cx={310} cy={120} active={active === "xor"} />
      <path d="M310,131 V163" {...S} />
      <Xor cx={310} cy={175} active={active === "key"} />
      <path d="M392,175 H323" {...S} markerEnd="url(#a-simon)" />
      <text x={394} y={170} fontSize={13} fontWeight={600} fill="var(--ink)">k</text>
      <text x={394} y={186} fontSize={10} fill="var(--muted)">round key</text>
      <path d="M310,186 V250 L110,300" {...S} markerEnd="url(#a-simon)" />
      <text x={210} y={268} textAnchor="middle" fontSize={11} fill={active === "swap" ? "var(--ink)" : "var(--muted)"} fontWeight={active === "swap" ? 700 : 400}>swap</text>
      <Word x={50} y={306} label="new x" sub="y ⊕ f(x) ⊕ k" tone="var(--simon)" />
      <Word x={250} y={306} label="new y" sub="old x" tone="var(--simon)" />
    </svg>
  );
}

/** SPECK round: ARX. */
export function SpeckRoundDiagram({ active }: { active?: "rotx" | "add" | "key" | "roty" | "xor" }) {
  return (
    <svg viewBox="0 0 420 380" className="mx-auto w-full max-w-md" role="img" aria-label="Diagram of one SPECK round: x is rotated right, y is added, the key is XORed in; then y is rotated left and XORed with the new x.">
      <Arrow id="a-speck" />
      <Word x={50} y={14} label="x" sub="left word" tone="var(--speck)" />
      <Word x={250} y={14} label="y" sub="right word" tone="var(--speck)" />
      {/* x lane */}
      <path d="M110,52 V78" {...S} markerEnd="url(#a-speck)" />
      <Box x={70} y={80} w={80} h={32} label="⋙ α" tone="var(--speck)" active={active === "rotx"} />
      <path d="M110,112 V136" {...S} markerEnd="url(#a-speck)" />
      <Plus cx={110} cy={150} active={active === "add"} />
      <path d="M110,162 V183" {...S} markerEnd="url(#a-speck)" />
      <Xor cx={110} cy={195} active={active === "key"} />
      <path d="M28,195 H97" {...S} markerEnd="url(#a-speck)" />
      <text x={20} y={185} fontSize={13} fontWeight={600} fill="var(--ink)">k</text>
      <path d="M110,206 V326" {...S} markerEnd="url(#a-speck)" />
      {/* y lane */}
      <path d="M310,52 V218" {...S} markerEnd="url(#a-speck)" />
      <path d="M310,150 H124" {...S} markerEnd="url(#a-speck)" />
      <circle cx={310} cy={150} r={3.5} fill="var(--ink-2)" />
      <Box x={270} y={220} w={80} h={32} label="⋘ β" tone="var(--speck)" active={active === "roty"} />
      <path d="M310,252 V278" {...S} />
      <Xor cx={310} cy={290} active={active === "xor"} />
      <path d="M110,290 H297" {...S} markerEnd="url(#a-speck)" />
      <circle cx={110} cy={290} r={3.5} fill="var(--ink-2)" />
      <path d="M310,301 V326" {...S} markerEnd="url(#a-speck)" />
      <text x={130} y={142} fontSize={10.5} fill="var(--muted)">add y (wraps around)</text>
      <Word x={50} y={328} label="new x" sub="(x⋙α + y) ⊕ k" tone="var(--speck)" />
      <Word x={250} y={328} label="new y" sub="(y⋘β) ⊕ new x" tone="var(--speck)" />
    </svg>
  );
}

/** Overview: plaintext → many rounds → ciphertext, with the key schedule feeding round keys. */
export function PipelineDiagram() {
  const rounds = ["Round 1", "Round 2", "Round 3", "…", "Round T"];
  return (
    <svg viewBox="0 0 720 200" className="w-full" role="img" aria-label="A plaintext block goes through T rounds to become ciphertext. The key schedule turns one key into T round keys, one per round.">
      <Arrow id="a-pipe" />
      <rect x={6} y={110} width={100} height={44} rx={8} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={2} />
      <text x={56} y={130} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">Plaintext</text>
      <text x={56} y={146} textAnchor="middle" fontSize={10.5} fill="var(--muted)">one block</text>
      <rect x={6} y={14} width={100} height={44} rx={8} fill="var(--hl-soft)" stroke="var(--hl)" strokeWidth={2} />
      <text x={56} y={34} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">Secret key</text>
      <text x={56} y={50} textAnchor="middle" fontSize={10.5} fill="var(--muted)">one key</text>
      <path d="M106,36 H130" {...S} markerEnd="url(#a-pipe)" />
      <rect x={132} y={14} width={466} height={44} rx={8} fill="var(--sunk)" stroke="var(--line-strong)" strokeWidth={2} />
      <text x={365} y={41} textAnchor="middle" fontSize={13} fill="var(--ink)">Key schedule: grows one key into T round keys k₀, k₁, k₂ …</text>
      {rounds.map((r, i) => {
        const x = 140 + i * 92;
        return (
          <g key={r}>
            {r !== "…" && <path d={`M${x + 36},58 V108`} {...S} strokeDasharray="4 4" markerEnd="url(#a-pipe)" />}
            {r === "…" ? (
              <text x={x + 36} y={138} textAnchor="middle" fontSize={20} fill="var(--muted)">…</text>
            ) : (
              <>
                <rect x={x} y={110} width={72} height={44} rx={8} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={2} />
                <text x={x + 36} y={137} textAnchor="middle" fontSize={12} fill="var(--ink)">{r}</text>
              </>
            )}
            <path d={`M${x - 20},132 H${x - 2}`} {...S} markerEnd="url(#a-pipe)" />
          </g>
        );
      })}
      <path d="M580,132 H604" {...S} markerEnd="url(#a-pipe)" />
      <rect x={606} y={110} width={108} height={44} rx={8} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={2} />
      <text x={660} y={130} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">Ciphertext</text>
      <text x={660} y={146} textAnchor="middle" fontSize={10.5} fill="var(--muted)">looks random</text>
      <text x={360} y={186} textAnchor="middle" fontSize={11.5} fill="var(--muted)">
        One round mixes a little. Repeating it T times (22 to 72) mixes completely.
      </text>
    </svg>
  );
}

/** Feistel vs ARX mini-diagrams for the basics chapter. */
export function StyleDiagram({ kind }: { kind: "feistel" | "arx" }) {
  const tone = kind === "feistel" ? "var(--simon)" : "var(--speck)";
  return kind === "feistel" ? (
    <svg viewBox="0 0 240 150" className="w-full max-w-xs" role="img" aria-label="Feistel: left half goes through a function, the result is mixed into the right half, then the halves swap.">
      <Arrow id="a-fe" />
      <rect x={20} y={8} width={80} height={28} rx={6} fill="var(--card)" stroke={tone} strokeWidth={2} />
      <text x={60} y={27} textAnchor="middle" fontSize={13} fill="var(--ink)">Left</text>
      <rect x={140} y={8} width={80} height={28} rx={6} fill="var(--card)" stroke={tone} strokeWidth={2} />
      <text x={180} y={27} textAnchor="middle" fontSize={13} fill="var(--ink)">Right</text>
      <path d="M60,36 V90 L180,114" {...S} markerEnd="url(#a-fe)" />
      <path d="M60,62 H96" {...S} markerEnd="url(#a-fe)" />
      <rect x={98} y={50} width={36} height={24} rx={5} fill="var(--simon-soft)" stroke={tone} strokeWidth={2} />
      <text x={116} y={67} textAnchor="middle" fontSize={12} fill="var(--ink)">f</text>
      <path d="M134,62 H168" {...S} markerEnd="url(#a-fe)" />
      <path d="M180,36 V52" {...S} />
      <Xor cx={180} cy={62} />
      <path d="M180,73 V90 L60,114" {...S} markerEnd="url(#a-fe)" />
      <text x={120} y={140} textAnchor="middle" fontSize={11} fill="var(--muted)">mix, then swap</text>
    </svg>
  ) : (
    <svg viewBox="0 0 240 150" className="w-full max-w-xs" role="img" aria-label="ARX: only three operations, Add, Rotate and XOR, each one processor instruction.">
      {["Add", "Rotate", "XOR"].map((t, i) => (
        <g key={t}>
          <rect x={10 + i * 78} y={40} width={66} height={46} rx={8} fill={i === 0 ? "var(--speck-soft)" : "var(--card)"} stroke={tone} strokeWidth={2} />
          <text x={43 + i * 78} y={68} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">{t}</text>
        </g>
      ))}
      <text x={120} y={118} textAnchor="middle" fontSize={11} fill="var(--muted)">each one is a single CPU instruction</text>
    </svg>
  );
}
