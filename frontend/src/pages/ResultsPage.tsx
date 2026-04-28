import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSummary } from "../api/client";
import { CategoryCard } from "../components/CategoryCard";
import { SummaryIntro } from "../components/SummaryIntro";
import { ShareButton } from "../components/ShareButton";
import { ErrorBanner } from "../components/ErrorBanner";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["summary", id],
    queryFn: () => getSummary(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui, sans-serif" }}>
        Loading summary...
      </div>
    );
  }

  if (error) {
    const msg =
      error instanceof Error && error.message.includes("expired")
        ? "This summary has expired or doesn't exist. Summaries are kept for 90 days."
        : "Failed to load summary. Please try again.";
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "2rem auto",
          padding: "0 1rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <ErrorBanner message={msg} />
        <Link to="/" style={{ display: "block", marginTop: "1rem", color: "#3b82f6" }}>
          Analyze another lease
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{
        maxWidth: 620,
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Your Lease Summary
      </h1>
      <SummaryIntro intro={data.summary.intro} />
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
        {data.summary.categories.map((cat) => (
          <CategoryCard key={cat.name} category={cat} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <ShareButton />
        <Link
          to="/"
          style={{
            padding: "0.6rem 1.25rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            color: "#374151",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Analyze another lease
        </Link>
      </div>
    </div>
  );
}
