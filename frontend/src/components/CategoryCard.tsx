import type { Category } from "../types";
import { SeverityBadge } from "./SeverityBadge";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "1rem 1.25rem",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{category.name}</h3>
        <SeverityBadge severity={category.severity} />
      </div>
      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {category.findings.map((f, i) => (
          <li key={i} style={{ color: "#374151", lineHeight: 1.6 }}>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
