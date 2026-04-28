export type Severity = "red" | "yellow" | "green";

export type CategoryName =
  | "Auto-Renewal Clauses"
  | "Deposit Conditions"
  | "Unusual Fees"
  | "Missing Standard Clauses";

export interface Category {
  name: CategoryName;
  severity: Severity;
  findings: string[];
}

export interface Summary {
  intro: string;
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
