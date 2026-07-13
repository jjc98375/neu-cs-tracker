// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MilestoneChecklist } from "@/components/MilestoneChecklist";

const ITEMS = [
  { id: "qual", label: "Qualifying exam", description: "Pass the area qualifier" },
  { id: "proposal", label: "Thesis proposal" },
];

describe("MilestoneChecklist", () => {
  it("renders title, items, and progress", () => {
    render(
      <MilestoneChecklist title="PhD Milestones" items={ITEMS} checks={{ qual: true }} onToggle={() => {}} />
    );
    expect(screen.getByText("PhD Milestones")).toBeDefined();
    expect(screen.getByText("Qualifying exam")).toBeDefined();
    expect(screen.getByText("Pass the area qualifier")).toBeDefined();
    expect(screen.getByText("1 of 2")).toBeDefined();
  });

  it("checkbox state reflects checks and fires onToggle with the item id", () => {
    const onToggle = vi.fn();
    render(<MilestoneChecklist title="PhD Milestones" items={ITEMS} checks={{ qual: true }} onToggle={onToggle} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
    fireEvent.click(boxes[1]);
    expect(onToggle).toHaveBeenCalledWith("proposal");
  });
});
