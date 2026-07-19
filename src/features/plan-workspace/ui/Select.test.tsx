// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "./Select";
import { installRadixDomShims } from "./test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

const OPTIONS: SelectOption[] = [
  {
    value: "ready",
    label: "Ready",
    swatchColor: "#3aa76d",
    swatchShape: "dot",
  },
  {
    value: "in_progress",
    label: "In progress",
    swatchColor: "#d9a441",
    swatchShape: "dot",
  },
  { value: "done", label: "Done", swatchColor: "#5b8dd6", swatchShape: "dot" },
];

function renderSelect(overrides: Partial<Parameters<typeof Select>[0]> = {}) {
  const onValueChange = vi.fn();
  render(
    <Select
      value="ready"
      onValueChange={onValueChange}
      options={OPTIONS}
      ariaLabel="Set status"
      {...overrides}
    />,
  );
  return { onValueChange };
}

describe("Select (closed)", () => {
  it("renders a combobox trigger named by ariaLabel, collapsed, showing the selected label", () => {
    renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).toContain("Ready");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("prefers the visible kicker via labelId for the trigger's accessible name", () => {
    render(
      <>
        <span id="status-kicker">Status</span>
        <Select
          value="ready"
          onValueChange={vi.fn()}
          options={OPTIONS}
          ariaLabel="Set status"
          labelId="status-kicker"
        />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Status" })).toBeTruthy();
  });

  it("stamps testId on the trigger", () => {
    renderSelect({ testId: "status-picker-chip" });

    expect(screen.getByTestId("status-picker-chip")).toBe(
      screen.getByRole("combobox", { name: "Set status" }),
    );
  });

  it("renders no option label for an unknown value", () => {
    renderSelect({ value: "bogus" });

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    for (const option of OPTIONS) {
      expect(trigger.textContent).not.toContain(option.label);
    }
  });
});

describe("Select (open)", () => {
  it("opens a named listbox on click, marks the trigger expanded, and lists every option", async () => {
    const user = userEvent.setup();
    renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    await user.click(trigger);

    const listbox = await screen.findByRole("listbox", {
      name: "Set status",
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(listbox.id);

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Readycurrent",
      "In progress",
      "Done",
    ]);
  });

  it("marks only the selected option aria-selected and badges it as current", async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByRole("combobox", { name: "Set status" }));
    await screen.findByRole("listbox");

    const selected = screen.getByRole("option", { name: /ready/i });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(selected.textContent).toContain("current");

    const unselected = screen.getByRole("option", { name: "Done" });
    expect(unselected.getAttribute("aria-selected")).toBe("false");
    expect(unselected.textContent).not.toContain("current");
  });

  it("keeps aria-selected on the current value while the user browses other options", async () => {
    const user = userEvent.setup();
    renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    // Arrow away from the current value; APG requires the selected option to
    // keep aria-selected=true even while another option is highlighted.
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /in progress/i }),
      );
    });

    const selected = screen.getByRole("option", { name: /ready/i });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(
      screen
        .getByRole("option", { name: /in progress/i })
        .getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("moves focus to the selected option when opened", async () => {
    const user = userEvent.setup();
    renderSelect({ value: "in_progress" });

    await user.click(screen.getByRole("combobox", { name: "Set status" }));
    await screen.findByRole("listbox");

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /in progress/i }),
      );
    });
  });

  it("selects an option on click, fires onValueChange once, closes, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Done" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("done");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });
});

describe("Select (keyboard)", () => {
  it("opens from the keyboard, moves through options with arrows, and selects with Enter", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /in progress/i }),
      );
    });

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("in_progress");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("moves to a matching option via typeahead", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    await user.click(trigger);
    await screen.findByRole("listbox");

    await user.keyboard("d");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Done" }),
      );
    });

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("done");
  });

  it("closes on Escape without selecting and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Set status" });
    await user.click(trigger);
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });
});
