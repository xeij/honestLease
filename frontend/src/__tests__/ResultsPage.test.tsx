import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { ResultsPage } from "../pages/ResultsPage";
import * as apiClient from "../api/client";
import type { SummaryRecord } from "../types";

vi.mock("../api/client");

const _ok = { summary: "Nothing concerning here.", quote: null, action: "No action needed." };

const RECORD: SummaryRecord = {
  summaryId: "abc12345",
  createdAt: 1714176000,
  summary: {
    intro: "Your lease looks mostly fine with one thing to watch.",
    verdict: "review",
    keyNumbers: {
      monthlyRent: "$1,500/month",
      securityDeposit: "$3,000",
      leaseLength: "12 months",
      lateFee: null,
      earlyTerminationFee: null,
    },
    categories: [
      {
        name: "Auto-Renewal Clauses",
        severity: "red",
        findings: [
          {
            summary: "Auto-renews without notice.",
            quote: "This lease shall automatically renew...",
            action: "Ask for a 60-day notice requirement.",
          },
        ],
      },
      { name: "Deposit Conditions",       severity: "green",  findings: [_ok] },
      { name: "Unusual Fees",             severity: "yellow", findings: [{ summary: "$25/month admin fee is uncommon.", quote: null, action: "Ask the landlord to remove it." }] },
      { name: "Missing Standard Clauses", severity: "green",  findings: [_ok] },
    ],
  },
};

function renderPage(summaryId = "abc12345") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/summary/${summaryId}`]}>
        <Routes>
          <Route path="/summary/:id" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("renders intro paragraph when loaded", async () => {
  vi.mocked(apiClient.getSummary).mockResolvedValue(RECORD);
  renderPage();
  expect(await screen.findByText(RECORD.summary.intro)).toBeInTheDocument();
});

test("renders all four category cards", async () => {
  vi.mocked(apiClient.getSummary).mockResolvedValue(RECORD);
  renderPage();
  await screen.findByText(RECORD.summary.intro);
  expect(screen.getByText("Auto-Renewal Clauses")).toBeInTheDocument();
  expect(screen.getByText("Deposit Conditions")).toBeInTheDocument();
  expect(screen.getByText("Unusual Fees")).toBeInTheDocument();
  expect(screen.getByText("Missing Standard Clauses")).toBeInTheDocument();
});

test("shows expired message on 404", async () => {
  vi.mocked(apiClient.getSummary).mockRejectedValue(
    Object.assign(new Error("Summary not found or has expired."), { status: 404 }),
  );
  renderPage("00000000");
  expect(await screen.findByText(/expired/i)).toBeInTheDocument();
});
