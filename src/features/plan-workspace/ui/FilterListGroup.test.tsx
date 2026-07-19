// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterListGroup } from "./FilterListGroup";

afterEach(cleanup);

const OPTIONS = [
  { value: "backend", label: "Backend", count: 4 },
  { value: "frontend", label: "Frontend", count: 2 },
  { value: "infra", label: "Infra" },
];

function renderGroup(
  overrides: Partial<Parameters<typeof FilterListGroup>[0]> = {},
) {
  const onValuesChange = vi.fn();
  render(
    <>
      <span id="section-label">Lane</span>
      <FilterListGroup
        options={OPTIONS}
        values={[]}
        onValuesChange={onValuesChange}
        labelId="section-label"
        {...overrides}
      />
    </>,
  );
  return { onValuesChange };
}

describe("FilterListGroup", () => {
  it("renders a labelled group of toggle buttons exposing pressed state", () => {
    renderGroup({ values: ["frontend"] });

    const group = screen.getByRole("group", { name: "Lane" });
    expect(group).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Backend" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Frontend" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("keeps counts visible in the row but out of the accessible name", () => {
    renderGroup();

    const row = screen.getByRole("button", { name: "Backend" });
    expect(row.textContent).toContain("4");
    // "Infra" has no count and still renders.
    expect(screen.getByRole("button", { name: "Infra" })).toBeTruthy();
  });

  it("reports the whole next selection when a row is toggled", async () => {
    const user = userEvent.setup();
    const { onValuesChange } = renderGroup({ values: ["backend"] });

    await user.click(screen.getByRole("button", { name: "Frontend" }));
    expect(onValuesChange).toHaveBeenCalledWith(["backend", "frontend"]);

    await user.click(screen.getByRole("button", { name: "Backend" }));
    expect(onValuesChange).toHaveBeenCalledWith([]);
  });

  it("renders trailing actions as siblings, not inside the toggle button", () => {
    renderGroup({
      options: [
        {
          value: "backend",
          label: "Backend",
          trailing: <button type="button" aria-label="Edit lane Backend" />,
        },
      ],
    });

    const row = screen.getByRole("button", { name: "Backend" });
    const trailing = screen.getByRole("button", { name: "Edit lane Backend" });
    expect(row.contains(trailing)).toBe(false);
  });
});
