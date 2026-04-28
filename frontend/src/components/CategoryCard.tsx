import type { Category, Finding } from "../types";
import { SeverityBadge } from "./SeverityBadge";

const QUOTE_BORDER: Record<string, string> = {
  red: "#f85149",
  yellow: "#d29922",
  green: "#3fb950",
};

function FindingItem({ finding: raw, severity }: { finding: Finding | string; severity: string }) {
  const finding: Finding = typeof raw === "string" ? { summary: raw, quote: null, action: null } : raw;
  return (
    <div style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #21262d" }}>
      <p style={{ margin: "0 0 0.5rem", color: "#e6edf3", lineHeight: 1.6 }}>{finding.summary}</p>
      {finding.quote && (
        <blockquote
          style={{
            margin: "0 0 0.5rem",
            padding: "0.5rem 0.75rem",
            borderLeft: `3px solid ${QUOTE_BORDER[severity] ?? "#30363d"}`,
            background: "#0d1117",
            color: "#8b949e",
            fontSize: "0.85rem",
            fontStyle: "italic",
            borderRadius: "0 4px 4px 0",
            lineHeight: 1.5,
          }}
        >
          &ldquo;{finding.quote}&rdquo;
        </blockquote>
      )}
      {finding.action && finding.action !== "No action needed." && (
        <p style={{ margin: 0, color: "#58a6ff", fontSize: "0.875rem", lineHeight: 1.5 }}>
          <span style={{ marginRight: "0.35rem", opacity: 0.7 }}>&#8594;</span>
          {finding.action}
        </p>
      )}
    </div>
  );
}

export function CategoryCard({ category }: { category: Category }) {
  const allClear = category.severity === "green";

  return (
    <div
      style={{
        border: `1px solid ${allClear ? "#21262d" : "#30363d"}`,
        borderRadius: 10,
        background: "#161b22",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.875rem 1.25rem",
          borderBottom: allClear ? "none" : "1px solid #21262d",
          background: allClear ? "#161b22" : "#1c2128",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#e6edf3" }}>
          {category.name}
        </h3>
        <SeverityBadge severity={category.severity} />
      </div>

      {!allClear && (
        <div style={{ padding: "1rem 1.25rem" }}>
          {category.findings.map((f, i) => (
            <div
              key={i}
              style={i === category.findings.length - 1 ? { paddingBottom: 0, marginBottom: 0, borderBottom: "none" } : undefined}
            >
              <FindingItem finding={f} severity={category.severity} />
            </div>
          ))}
        </div>
      )}

      {allClear && (
        <div style={{ padding: "0.5rem 1.25rem 0.875rem", color: "#8b949e", fontSize: "0.875rem" }}>
          {(() => { const f = category.findings[0]; return f ? (typeof f === "string" ? f : f.summary) : null; })()}
        </div>
      )}
    </div>
  );
}
