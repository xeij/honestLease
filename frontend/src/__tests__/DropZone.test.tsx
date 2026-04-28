import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "../components/DropZone";

const PDF_FILE = new File(["content"], "lease.pdf", { type: "application/pdf" });
const LARGE_FILE = new File([new ArrayBuffer(21 * 1024 * 1024)], "big.pdf", {
  type: "application/pdf",
});

test("renders upload prompt", () => {
  render(<DropZone onFile={() => {}} />);
  expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
});

test("calls onFile when valid PDF selected", async () => {
  const onFile = vi.fn();
  render(<DropZone onFile={onFile} />);
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, PDF_FILE);
  expect(onFile).toHaveBeenCalledWith(PDF_FILE);
});

test("shows error when file is not a PDF", async () => {
  render(<DropZone onFile={() => {}} />);
  const nonPdf = new File(["x"], "doc.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, nonPdf);
  expect(screen.getByText(/pdf/i)).toBeInTheDocument();
});

test("shows error when file exceeds 20MB", async () => {
  render(<DropZone onFile={() => {}} />);
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, LARGE_FILE);
  expect(screen.getByText(/20mb/i)).toBeInTheDocument();
});
