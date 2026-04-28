import type { Severity } from "../types";

const CONFIG: Record<Severity, { label: string; bg: string; color: string; dot: string }> = {
  red:    { label: "Watch out",    bg: "rgba(248,81,73,0.15)",   color: "#f85149", dot: "#f85149" },
  yellow: { label: "Worth asking", bg: "rgba(210,153,34,0.15)",  color: "#d29922", dot: "#d29922" },
  green:  { label: "All clear",    bg: "rgba(63,185,80,0.15)",   color: "#3fb950", dot: "#3fb950" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, bg, color, dot } = CONFIG[severity];
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 999,
        padding: "3px 10px 3px 8px",
        fontSize: "0.78rem",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        letterSpacing: "0.01em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}
