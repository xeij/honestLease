import type { Severity } from "../types";

const CONFIG: Record<Severity, { label: string; bg: string; color: string }> = {
  red: { label: "Watch out", bg: "#fef2f2", color: "#b91c1c" },
  yellow: { label: "Worth asking", bg: "#fffbeb", color: "#b45309" },
  green: { label: "All clear", bg: "#f0fdf4", color: "#15803d" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, bg, color } = CONFIG[severity];
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
