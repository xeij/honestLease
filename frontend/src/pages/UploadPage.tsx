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
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        honestLease
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Upload your residential lease and get a plain-English summary of the things that matter:
        auto-renewal traps, deposit conditions, unusual fees, and what&apos;s missing.
      </p>

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
              padding: "0.75rem",
              background: file ? "#3b82f6" : "#e5e7eb",
              color: file ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: "1rem",
              cursor: file ? "pointer" : "not-allowed",
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
