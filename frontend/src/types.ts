export type Severity = "red" | "yellow" | "green";
export type Verdict = "standard" | "review" | "concern";

export type CategoryName =
  | "Auto-Renewal Clauses"
  | "Deposit Conditions"
  | "Unusual Fees"
  | "Missing Standard Clauses";

export interface Finding {
  summary: string;
  quote: string | null;
  action: string | null;
}

export interface Category {
  name: CategoryName;
  severity: Severity;
  findings: Finding[];
}

export interface KeyNumbers {
  monthlyRent: string | null;
  securityDeposit: string | null;
  leaseLength: string | null;
  lateFee: string | null;
  earlyTerminationFee: string | null;
}

export interface Summary {
  intro: string;
  verdict: Verdict;
  keyNumbers: KeyNumbers | null;
  categories: Category[];
}

export interface SummaryRecord {
  summaryId: string;
  summary: Summary;
  createdAt: number;
}

export interface UploadUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

export interface AnalyzeResponse {
  summaryId: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
