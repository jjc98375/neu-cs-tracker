import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranscriptImport } from "@/components/TranscriptImport";

function pdfFile() {
  return new File([new Uint8Array([1, 2, 3])], "transcript.pdf", { type: "application/pdf" });
}

describe("TranscriptImport", () => {
  it("extracts, parses, and calls onImport with mapped courses", async () => {
    const extract = vi.fn().mockResolvedValue([
      "INSTITUTION CREDIT",
      "Term : Fall 2024 Semester",
      "Subject Course Level Title Grade Credit Hours Quality Points",
      "CS 5010 GR Programming Design Paradigm A- 4.000 14.668",
      "COURSE(S) IN PROGRESS",
      "Term : Summer 2026 Semester",
      "Subject Course Level Title Credit Hours Start and End Dates",
      "CS 5200 GR Database Management Sys 4.000",
    ]);
    const onImport = vi.fn();
    render(<TranscriptImport onImport={onImport} extractLinesFn={extract} />);

    const input = screen.getByLabelText(/transcript pdf/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const arg = onImport.mock.calls[0][0];
    expect(arg.completed).toHaveLength(1);
    expect(arg.inProgress).toHaveLength(1);
    expect(await screen.findByText(/imported/i)).toBeDefined();
  });

  it("shows an error when extraction throws", async () => {
    const extract = vi.fn().mockRejectedValue(new Error("bad pdf"));
    render(<TranscriptImport onImport={vi.fn()} extractLinesFn={extract} />);
    fireEvent.change(screen.getByLabelText(/transcript pdf/i), { target: { files: [pdfFile()] } });
    expect(await screen.findByText(/couldn't read/i)).toBeDefined();
  });
});
