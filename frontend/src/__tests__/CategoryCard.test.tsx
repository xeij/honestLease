import { render, screen } from "@testing-library/react";
import { CategoryCard } from "../components/CategoryCard";
import type { Category } from "../types";

const RED_CATEGORY: Category = {
  name: "Auto-Renewal Clauses",
  severity: "red",
  findings: ["Auto-renews 60 days before expiry.", "Requires written notice to opt out."],
};

const GREEN_CATEGORY: Category = {
  name: "Deposit Conditions",
  severity: "green",
  findings: ["No issues found — this looks normal."],
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

test("renders green severity badge with 'Looks normal' label", () => {
  render(<CategoryCard category={GREEN_CATEGORY} />);
  expect(screen.getByText(/looks normal/i)).toBeInTheDocument();
});
