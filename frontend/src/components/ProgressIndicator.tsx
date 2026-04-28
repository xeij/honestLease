import { useEffect, useState } from "react";
import type { AnalysisPhase } from "../hooks/useLeaseAnalysis";

const UPLOADING_MESSAGES = [
  "Uploading your lease...",
  "Sending your document securely...",
  "Getting your lease ready...",
];

const ANALYZING_MESSAGES = [
  "Reading through your lease...",
  "Spotting auto-renewal clauses...",
  "Checking deposit conditions...",
  "Looking for unusual fees...",
  "Scanning for missing standard clauses...",
  "Reviewing the fine print...",
  "Flagging anything you should know about...",
  "Putting it all together...",
  "Almost there...",
  "Writing up your summary...",
];

interface Props {
  phase: AnalysisPhase;
}

export function ProgressIndicator({ phase }: Props) {
  const [index, setIndex] = useState(0);

  const messages =
    phase === "uploading"
      ? UPLOADING_MESSAGES
      : phase === "analyzing"
        ? ANALYZING_MESSAGES
        : null;

  useEffect(() => {
    if (!messages) return;
    setIndex(0);
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      phase === "uploading" ? 1500 : 2500,
    );
    return () => clearInterval(id);
  }, [phase]);

  if (!messages) return null;

  return (
    <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#8b949e" }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #21262d",
          borderTopColor: "#58a6ff",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 1rem",
        }}
      />
      <p style={{ minHeight: "1.5em", margin: 0, color: "#e6edf3" }}>
        {messages[index]}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
