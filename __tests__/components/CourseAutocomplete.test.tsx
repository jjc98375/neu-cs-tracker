import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";

describe("CourseAutocomplete", () => {
  it("filters static catalog and selects on click", async () => {
    const onSelect = vi.fn();
    render(<CourseAutocomplete onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "machine learning" } });
    const opt = await screen.findByText(/6140/);
    fireEvent.click(opt);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ courseNumber: "6140" }));
  });

  it("falls back to the injected lookup for an unknown code", async () => {
    const lookupFn = vi.fn().mockResolvedValue({ subject: "CS", courseNumber: "9100", title: "Special Topics", credits: 4 });
    const onSelect = vi.fn();
    render(<CourseAutocomplete onSelect={onSelect} lookupFn={lookupFn} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "CS 9100" } });
    await waitFor(() => expect(lookupFn).toHaveBeenCalledWith("CS", "9100"));
    fireEvent.click(await screen.findByText(/Special Topics/));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ courseNumber: "9100", title: "Special Topics" }));
  });
});
