import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropZone } from "../components/DropZone";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { ErrorBanner } from "../components/ErrorBanner";
import { useLeaseAnalysis } from "../hooks/useLeaseAnalysis";

export function UploadPage() {
  const navigate = useNavigate();
  const { phase, summaryId, errorMessage, run, reset } = useLeaseAnalysis();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (phase === "done" && summaryId) {
      navigate(`/summary/${summaryId}`);
    }
  }, [phase, summaryId, navigate]);

  const isRunning = phase === "uploading" || phase === "analyzing";

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "3rem 1.25rem 2rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.4rem", color: "#e6edf3" }}>
          honestLease
        </h1>
        <p style={{ color: "#8b949e", margin: 0, lineHeight: 1.6 }}>
          Upload your residential lease and get a plain-English breakdown of auto-renewal traps,
          deposit conditions, unusual fees, and what&apos;s missing — with exact quotes and specific
          things to ask for.
        </p>
      </div>

      {errorMessage && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorBanner message={errorMessage} onDismiss={reset} />
        </div>
      )}

      {!isRunning && (
        <>
          <DropZone onFile={setFile} />
          <button
            onClick={() => file && run(file)}
            disabled={!file}
            style={{
              marginTop: "1rem",
              width: "100%",
              padding: "0.8rem",
              background: file ? "#1f6feb" : "#21262d",
              color: file ? "#e6edf3" : "#484f58",
              border: `1px solid ${file ? "#388bfd40" : "#30363d"}`,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "1rem",
              cursor: file ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Analyze my lease
          </button>
        </>
      )}

      <ProgressIndicator phase={phase} />
    </div>
  );
}
