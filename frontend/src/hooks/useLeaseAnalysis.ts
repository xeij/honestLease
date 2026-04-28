import { useState } from "react";
import { getUploadUrl, uploadPdfToS3, analyzeLease } from "../api/client";
import { ApiError } from "../types";

export type AnalysisPhase = "idle" | "uploading" | "analyzing" | "done" | "error";

export interface UseLeaseAnalysisResult {
  phase: AnalysisPhase;
  summaryId: string | null;
  errorMessage: string | null;
  run: (file: File) => Promise<void>;
  reset: () => void;
}

export function useLeaseAnalysis(): UseLeaseAnalysisResult {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function run(file: File) {
    setPhase("uploading");
    setErrorMessage(null);
    try {
      const { presignedUrl, s3Key } = await getUploadUrl();
      await uploadPdfToS3(presignedUrl, file);
      setPhase("analyzing");
      const { summaryId: id } = await analyzeLease(s3Key);
      setSummaryId(id);
      setPhase("done");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setSummaryId(null);
    setErrorMessage(null);
  }

  return { phase, summaryId, errorMessage, run, reset };
}
