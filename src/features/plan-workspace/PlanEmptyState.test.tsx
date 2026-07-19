// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanEmptyState } from "./PlanEmptyState";

afterEach(cleanup);

describe("PlanEmptyState", () => {
  it("renders the empty-result message as plain content, with no live region of its own", () => {
    render(
      <PlanEmptyState message="No work items match the active filters." />,
    );

    expect(
      screen.getByText("No work items match the active filters."),
    ).toBeDefined();
    // The component mounts conditionally, so a live region here would enter
    // the DOM with its content already present and never be announced; the
    // announcement is owned by PlanGraphCanvas's persistent status region.
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("omits the clear-filters button when no handler is provided", () => {
    render(<PlanEmptyState message="Nothing matches." />);

    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("invokes onClearFilters when the clear-filters button is clicked", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <PlanEmptyState
        message="Nothing matches."
        onClearFilters={onClearFilters}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
