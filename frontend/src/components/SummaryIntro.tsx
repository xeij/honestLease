import type { Summary, Verdict } from "../types";

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string }> = {
  standard: { label: "No major concerns",          color: "#3fb950", bg: "rgba(63,185,80,0.1)"   },
  review:   { label: "A few things to review",     color: "#d29922", bg: "rgba(210,153,34,0.1)"  },
  concern:  { label: "Has concerning clauses",     color: "#f85149", bg: "rgba(248,81,73,0.1)"   },
};

const KEY_LABELS: Record<string, string> = {
  monthlyRent:         "Monthly Rent",
  securityDeposit:     "Security Deposit",
  leaseLength:         "Lease Length",
  lateFee:             "Late Fee",
  earlyTerminationFee: "Early Termination",
};

export function SummaryIntro({ summary }: { summary: Summary }) {
  const verdict = summary.verdict ?? "review";
  const vc = VERDICT_CONFIG[verdict];

  const numbers = summary.keyNumbers
    ? Object.entries(summary.keyNumbers).filter(([, v]) => v != null)
    : [];

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          background: vc.bg,
          border: `1px solid ${vc.color}33`,
          borderRadius: 10,
          padding: "1rem 1.25rem",
          marginBottom: numbers.length > 0 ? "0.75rem" : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: vc.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{ color: vc.color, fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.02em" }}>
            {vc.label.toUpperCase()}
          </span>
        </div>
        <p style={{ margin: 0, color: "#e6edf3", lineHeight: 1.7 }}>{summary.intro}</p>
      </div>

      {numbers.length > 0 && (
        <div
          style={{
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: 10,
            padding: "0.875rem 1.25rem",
          }}
        >
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "#8b949e", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Key Numbers
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {numbers.map(([key, value]) => (
              <div key={key}>
                <div style={{ fontSize: "0.75rem", color: "#8b949e", marginBottom: "0.2rem" }}>
                  {KEY_LABELS[key] ?? key}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e6edf3" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
