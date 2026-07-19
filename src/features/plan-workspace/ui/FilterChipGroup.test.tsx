// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterChipGroup } from "./FilterChipGroup";
import { installRadixDomShims } from "./test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

const OPTIONS = [
  { value: "lane-a", label: "Lane A" },
  { value: "lane-b", label: "Lane B" },
  { value: "lane-c", label: "Lane C" },
];

function renderGroup(props?: {
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  options?: { value: string; label: string; trailing?: React.ReactNode }[];
}) {
  const onValuesChange = props?.onValuesChange ?? vi.fn();
  render(
    <>
      <span id="section-label">Lane</span>
      <FilterChipGroup
        options={props?.options ?? OPTIONS}
        values={props?.values ?? []}
        onValuesChange={onValuesChange}
        labelId="section-label"
      />
    </>,
  );
  return { onValuesChange };
}

describe("FilterChipGroup", () => {
  it("renders a group named by the visible label via aria-labelledby", () => {
    renderGroup();
    const group = screen.getByRole("group", { name: "Lane" });
    expect(group.getAttribute("aria-labelledby")).toBe("section-label");
  });

  it("renders each option as a toggle button with aria-pressed reflecting selection", () => {
    renderGroup({ values: ["lane-b"] });
    const chips = screen.getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual([
      "Lane A",
      "Lane B",
      "Lane C",
    ]);
    expect(chips.map((c) => c.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("adds the value on activating an unpressed chip", async () => {
    const user = userEvent.setup();
    const { onValuesChange } = renderGroup({ values: ["lane-a"] });
    await user.click(screen.getByRole("button", { name: "Lane C" }));
    expect(onValuesChange).toHaveBeenCalledWith(["lane-a", "lane-c"]);
  });

  it("removes the value on activating a pressed chip", async () => {
    const user = userEvent.setup();
    const { onValuesChange } = renderGroup({ values: ["lane-a", "lane-b"] });
    await user.click(screen.getByRole("button", { name: "Lane A" }));
    expect(onValuesChange).toHaveBeenCalledWith(["lane-b"]);
  });

  it("gives every chip its own tab stop and toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    const { onValuesChange } = renderGroup();

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Lane A" }),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Lane B" }),
    );

    await user.keyboard(" ");
    expect(onValuesChange).toHaveBeenLastCalledWith(["lane-b"]);
    await user.keyboard("{Enter}");
    expect(onValuesChange).toHaveBeenLastCalledWith(["lane-b"]);
    expect(onValuesChange).toHaveBeenCalledTimes(2);
  });

  it("renders trailing actions outside the toggle item, not nested inside it", async () => {
    const user = userEvent.setup();
    const onTrailing = vi.fn();
    const { onValuesChange } = renderGroup({
      options: [
        {
          value: "lane-a",
          label: "Lane A",
          trailing: (
            <button type="button" aria-label="Edit lane A" onClick={onTrailing}>
              edit
            </button>
          ),
        },
      ],
    });

    const chip = screen.getByRole("button", { name: "Lane A" });
    const trailing = screen.getByRole("button", { name: "Edit lane A" });
    expect(chip.contains(trailing)).toBe(false);
    expect(trailing.contains(chip)).toBe(false);

    await user.click(trailing);
    expect(onTrailing).toHaveBeenCalledTimes(1);
    expect(onValuesChange).not.toHaveBeenCalled();
  });

  it("keeps a trailing action independently focusable after its chip", async () => {
    const user = userEvent.setup();
    renderGroup({
      options: [
        {
          value: "lane-a",
          label: "Lane A",
          trailing: (
            <button type="button" aria-label="Edit lane A">
              edit
            </button>
          ),
        },
        { value: "lane-b", label: "Lane B" },
      ],
    });

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Lane A" }),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit lane A" }),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Lane B" }),
    );
  });
});
