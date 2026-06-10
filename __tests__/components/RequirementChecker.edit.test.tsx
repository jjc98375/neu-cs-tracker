import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditableCourseRow } from "@/components/RequirementChecker";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";

beforeEach(() => localStorage.clear());

const TERM_OPTIONS = [
  { code: "202630", label: "Fall 2026" },
  { code: "202610", label: "Spring 2026" },
  { code: "202510", label: "Spring 2025" },
  { code: "202430", label: "Fall 2024" },
];

describe("EditableCourseRow inline edit", () => {
  it("calls onSave with updated title for completed course", () => {
    const course: CompletedCourse = {
      subject: "CS",
      courseNumber: "6140",
      title: "Machine Learning",
      credits: 4,
      term: "202430",
      grade: "A",
    };
    const onSave = vi.fn();
    const onDelete = vi.fn();

    render(
      <EditableCourseRow
        course={course}
        type="completed"
        termOptions={TERM_OPTIONS}
        onSave={onSave}
        onDelete={onDelete}
      />
    );

    // Click edit button
    fireEvent.click(screen.getByLabelText(/edit cs 6140/i));

    // Change the title
    const titleInput = screen.getByDisplayValue("Machine Learning");
    fireEvent.change(titleInput, { target: { value: "ML Edited" } });

    // Save
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "ML Edited", subject: "CS", courseNumber: "6140" })
    );
  });

  it("does NOT call onSave when Cancel is clicked", () => {
    const course: CompletedCourse = {
      subject: "CS",
      courseNumber: "6140",
      title: "Machine Learning",
      credits: 4,
      term: "202430",
      grade: "A",
    };
    const onSave = vi.fn();
    const onDelete = vi.fn();

    render(
      <EditableCourseRow
        course={course}
        type="completed"
        termOptions={TERM_OPTIONS}
        onSave={onSave}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText(/edit cs 6140/i));
    fireEvent.change(screen.getByDisplayValue("Machine Learning"), { target: { value: "Changed Title" } });
    fireEvent.click(screen.getByText("Cancel"));

    expect(onSave).not.toHaveBeenCalled();
    // Should revert to read-only view
    expect(screen.getByText("Machine Learning")).toBeDefined();
  });

  it("calls onSave with updated credits for planned course (no grade field)", () => {
    const course: PlannedCourse = {
      subject: "CS",
      courseNumber: "7150",
      title: "Deep Learning",
      credits: 4,
      term: "202610",
    };
    const onSave = vi.fn();
    const onDelete = vi.fn();

    render(
      <EditableCourseRow
        course={course}
        type="planned"
        termOptions={TERM_OPTIONS}
        onSave={onSave}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText(/edit cs 7150/i));

    // Grade field should NOT be present for planned
    expect(screen.queryByPlaceholderText(/grade/i)).toBeNull();

    const creditsInput = screen.getByDisplayValue("4");
    fireEvent.change(creditsInput, { target: { value: "3" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ credits: 3, subject: "CS", courseNumber: "7150" })
    );
  });

  it("calls onDelete when trash button clicked", () => {
    const course: CompletedCourse = {
      subject: "CS",
      courseNumber: "6140",
      title: "Machine Learning",
      credits: 4,
      term: "202430",
    };
    const onSave = vi.fn();
    const onDelete = vi.fn();

    render(
      <EditableCourseRow
        course={course}
        type="completed"
        termOptions={TERM_OPTIONS}
        onSave={onSave}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText(/delete cs 6140/i));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
