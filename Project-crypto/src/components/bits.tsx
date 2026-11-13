"use client";

/**
 * A row of bit cells, most significant bit on the left.
 * `highlight` marks bits to emphasise (e.g. ones that changed).
 */
export function BitRow({
  value,
  width,
  label,
  highlight,
  onToggle,
  tone = "ink",
  size = "md",
}: {
  value: bigint | number;
  width: number;
  label?: string;
  highlight?: bigint | number;
  onToggle?: (bitIndex: number) => void;
  tone?: "ink" | "simon" | "speck";
  size?: "sm" | "md";
}) {
  const v = BigInt(value);
  const h = highlight === undefined ? 0n : BigInt(highlight);
  const on = { ink: "bg-ink text-paper", simon: "bg-simon text-white", speck: "bg-speck text-white" }[tone];
  const cell = size === "sm" ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-sm";
  const bits = Array.from({ length: width }, (_, i) => width - 1 - i);
  return (
    <div className="flex items-center gap-3">
      {label !== undefined && <span className="w-28 shrink-0 text-right text-sm text-ink-2">{label}</span>}
      <div className="flex flex-wrap gap-[3px]" role={onToggle ? "group" : undefined} aria-label={label}>
        {bits.map((b) => {
          const isOn = (v >> BigInt(b)) & 1n;
          const isHl = (h >> BigInt(b)) & 1n;
          const cls = `${cell} flex items-center justify-center rounded-[5px] font-mono transition-colors ${
            isOn ? on : "bg-sunk text-muted"
          } ${isHl ? "ring-2 ring-hl ring-offset-1 ring-offset-card" : ""} ${b % 8 === 0 && b !== 0 ? "mr-1.5" : ""}`;
          return onToggle ? (
            <button
              key={b}
              type="button"
              className={`${cls} cursor-pointer hover:opacity-80`}
              onClick={() => onToggle(b)}
              aria-label={`bit ${b} is ${isOn ? 1 : 0}, click to flip`}
            >
              {isOn ? 1 : 0}
            </button>
          ) : (
            <span key={b} className={cls}>
              {isOn ? 1 : 0}
            </span>
          );
        })}
      </div>
    </div>
  );
}
