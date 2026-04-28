import { render, screen } from "@testing-library/react";
import { CategoryCard } from "../components/CategoryCard";
import type { Category } from "../types";

const RED_CATEGORY: Category = {
  name: "Auto-Renewal Clauses",
  severity: "red",
  findings: [
    {
      summary: "Auto-renews 60 days before expiry.",
      quote: "This lease shall automatically renew 60 days before expiration.",
      action: "Request a written notice requirement.",
    },
    {
      summary: "Requires written notice to opt out.",
      quote: null,
      action: "Ask for the opt-out process to be clarified in writing.",
    },
  ],
};

const GREEN_CATEGORY: Category = {
  name: "Deposit Conditions",
  severity: "green",
  findings: [{ summary: "Nothing concerning here.", quote: null, action: "No action needed." }],
};

test("renders category name and findings", () => {
  render(<CategoryCard category={RED_CATEGORY} />);
  expect(screen.getByText("Auto-Renewal Clauses")).toBeInTheDocument();
  expect(screen.getByText("Auto-renews 60 days before expiry.")).toBeInTheDocument();
});

test("renders red severity badge with 'Watch out' label", () => {
  render(<CategoryCard category={RED_CATEGORY} />);
  expect(screen.getByText(/watch out/i)).toBeInTheDocument();
});

test("renders green severity badge with 'All clear' label", () => {
  render(<CategoryCard category={GREEN_CATEGORY} />);
  expect(screen.getByText(/all clear/i)).toBeInTheDocument();
});
