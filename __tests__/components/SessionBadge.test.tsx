import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionBadge } from "@/components/SessionBadge";

describe("SessionBadge", () => {
  it("renders 'Full Summer' for Full session", () => {
    render(<SessionBadge session="Full" />);
    expect(screen.getByText("Full Summer")).toBeDefined();
  });

  it("renders 'Summer 1' for Summer1 session", () => {
    render(<SessionBadge session="Summer1" />);
    expect(screen.getByText("Summer 1")).toBeDefined();
  });

  it("renders 'Summer 2' for Summer2 session", () => {
    render(<SessionBadge session="Summer2" />);
    expect(screen.getByText("Summer 2")).toBeDefined();
  });

  it("renders '—' for N/A session", () => {
    render(<SessionBadge session="N/A" />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("applies correct CSS classes for Full session (blue)", () => {
    const { container } = render(<SessionBadge session="Full" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-blue-100");
  });

  it("applies correct CSS classes for Summer1 session (amber)", () => {
    const { container } = render(<SessionBadge session="Summer1" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-amber-100");
  });

  it("applies correct CSS classes for Summer2 session (green)", () => {
    const { container } = render(<SessionBadge session="Summer2" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-green-100");
  });

  it("applies correct CSS classes for N/A session (slate)", () => {
    const { container } = render(<SessionBadge session="N/A" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-slate-100");
  });

  it("renders as an inline span element", () => {
    const { container } = render(<SessionBadge session="Full" />);
    expect(container.querySelector("span")).not.toBeNull();
  });

  it("includes border class", () => {
    const { container } = render(<SessionBadge session="Summer1" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("border");
  });
});
