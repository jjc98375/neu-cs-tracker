// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequirementTree } from "@/components/RequirementTree";
import { evaluateTree } from "@/lib/requirements-engine";
import type { RequirementNode } from "@/lib/program-schema";

const TREE: RequirementNode = {
  type: "allOf",
  label: "Mini MS",
  children: [
    { type: "course", subject: "CS", number: "5800", title: "Algorithms", credits: 4 },
    {
      type: "chooseN", label: "Breadth", n: 1,
      children: [
        { type: "course", subject: "CS", number: "6140", title: "Machine Learning", credits: 4 },
        { type: "course", subject: "CS", number: "6220", title: "Data Mining Techniques", credits: 4 },
      ],
    },
  ],
};

function statusFor(completedNums: string[]) {
  const completed = completedNums.map((n) => ({
    subject: "CS", courseNumber: n, title: `CS ${n}`, credits: 4, term: "202510", grade: "A",
  }));
  return evaluateTree(TREE, completed, []);
}

describe("RequirementTree", () => {
  it("renders group labels with progress counts", () => {
    render(<RequirementTree status={statusFor(["6140"])} />);
    expect(screen.getByText("Breadth")).toBeDefined();
    expect(screen.getByText("1 of 1")).toBeDefined();      // chooseN satisfied
    expect(screen.getByText("1 of 2")).toBeDefined();      // root allOf partial
  });

  it("renders course leaves with code and title", () => {
    render(<RequirementTree status={statusFor([])} />);
    expect(screen.getByText("CS 5800")).toBeDefined();
    expect(screen.getByText("Algorithms")).toBeDefined();
  });

  it("collapses a group when its header is clicked", () => {
    render(<RequirementTree status={statusFor([])} />);
    expect(screen.getByText("CS 6140")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Breadth/ }));
    expect(screen.queryByText("CS 6140")).toBeNull();
  });

  it("shows credit progress for chooseCredits groups", () => {
    const tree: RequirementNode = {
      type: "chooseCredits", label: "Electives", credits: 8,
      children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4, label: "Any CS 5000–7999" }],
    };
    const completed = [{ subject: "CS", courseNumber: "6620", title: "Cloud", credits: 4, term: "202510", grade: "A" }];
    render(<RequirementTree status={evaluateTree(tree, completed, [])} />);
    expect(screen.getByText("4 of 8 credits")).toBeDefined();
    expect(screen.getByText("Any CS 5000–7999")).toBeDefined();
  });

  it("does not leak collapse state across different trees", () => {
    const { rerender } = render(<RequirementTree status={statusFor([])} />);
    fireEvent.click(screen.getByRole("button", { name: /Breadth/ }));
    expect(screen.queryByText("CS 6140")).toBeNull();

    // Different program whose group sits at the SAME child index as "Breadth".
    const OTHER: RequirementNode = {
      type: "allOf", label: "Other program",
      children: [
        { type: "course", subject: "DS", number: "5500", title: "Capstone", credits: 4 },
        {
          type: "chooseN", label: "Depth", n: 1,
          children: [{ type: "course", subject: "DS", number: "5110", title: "Essentials", credits: 4 }],
        },
      ],
    };
    rerender(<RequirementTree status={evaluateTree(OTHER, [], [])} />);
    // Fresh group identity → mounts expanded, its children visible.
    expect(screen.getByText("DS 5110")).toBeDefined();
  });
});
