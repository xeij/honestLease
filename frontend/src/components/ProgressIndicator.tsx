import type { AnalysisPhase } from "../hooks/useLeaseAnalysis";

const LABELS: Partial<Record<AnalysisPhase, string>> = {
  uploading: "Uploading your lease...",
  analyzing: "Analyzing your lease — this takes about 20 seconds...",
};

interface Props {
  phase: AnalysisPhase;
}

export function ProgressIndicator({ phase }: Props) {
  const label = LABELS[phase];
  if (!label) return null;
  return (
    <div style={{ textAlign: "center", padding: "1rem", color: "#374151" }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e5e7eb",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 0.75rem",
        }}
      />
      <p>{label}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
