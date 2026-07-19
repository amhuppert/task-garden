// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChipRadioOption } from "./ChipRadioGroup";
import { ChipRadioGroup } from "./ChipRadioGroup";

afterEach(cleanup);

const OPTIONS: ChipRadioOption[] = [
  { value: "all", label: "All" },
  { value: "up", label: "Upstream" },
  { value: "down", label: "Downstream" },
];

function renderGroup(props?: {
  options?: ChipRadioOption[];
  value?: string;
  describedById?: string;
  onValueChange?: (value: string) => void;
}) {
  return render(
    <>
      <span id="kicker">Scope</span>
      <p id="hint">Select an item to scope the view</p>
      <ChipRadioGroup
        options={props?.options ?? OPTIONS}
        value={props?.value ?? "all"}
        onValueChange={props?.onValueChange ?? (() => {})}
        labelId="kicker"
        describedById={props?.describedById}
      />
    </>,
  );
}

function ControlledHarness({
  options,
  initialValue,
  onValueChange,
}: {
  options: ChipRadioOption[];
  initialValue: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <span id="kicker">Scope</span>
      <ChipRadioGroup
        options={options}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        labelId="kicker"
      />
    </>
  );
}

describe("ChipRadioGroup roles and labelling", () => {
  it("renders a radiogroup labelled by the visible kicker", () => {
    renderGroup();
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-labelledby")).toBe("kicker");
    expect(screen.getByRole("radiogroup", { name: "Scope" })).toBe(group);
  });

  it("wires aria-describedby when describedById is given and omits it otherwise", () => {
    renderGroup({ describedById: "hint" });
    expect(
      screen.getByRole("radiogroup").getAttribute("aria-describedby"),
    ).toBe("hint");
    cleanup();
    renderGroup();
    expect(
      screen.getByRole("radiogroup").getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("renders one radio per option, named by its label", () => {
    renderGroup();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Upstream" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Downstream" })).toBeTruthy();
  });

  it("marks only the selected option aria-checked", () => {
    renderGroup({ value: "up" });
    expect(
      screen
        .getByRole("radio", { name: "Upstream" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    for (const name of ["All", "Downstream"]) {
      expect(
        screen.getByRole("radio", { name }).getAttribute("aria-checked"),
      ).toBe("false");
    }
  });

  it("disables options flagged disabled", () => {
    renderGroup({
      options: [OPTIONS[0], { value: "up", label: "Upstream", disabled: true }],
    });
    const disabledRadio = screen.getByRole("radio", { name: "Upstream" });
    expect((disabledRadio as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("ChipRadioGroup pointer selection", () => {
  it("reports the clicked option's value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderGroup({ onValueChange });
    await user.click(screen.getByRole("radio", { name: "Downstream" }));
    expect(onValueChange).toHaveBeenCalledWith("down");
  });

  it("ignores clicks on disabled options", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderGroup({
      options: [OPTIONS[0], { value: "up", label: "Upstream", disabled: true }],
      onValueChange,
    });
    await user.click(screen.getByRole("radio", { name: "Upstream" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

/** Radix moves focus in a deferred task and selects only while the arrow key
    is still held; a real key press spans that task, user-event's instant
    release does not — so press, flush, then release. */
async function pressArrow(user: UserEvent, key: "ArrowRight" | "ArrowLeft") {
  await user.keyboard(`{${key}>}`);
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  await user.keyboard(`{/${key}}`);
}

describe("ChipRadioGroup focus management and keyboard", () => {
  it("roving tabindex: Tab enters on the checked option and a second Tab leaves the group", async () => {
    const user = userEvent.setup();
    render(
      <>
        <span id="kicker">Scope</span>
        <ChipRadioGroup
          options={OPTIONS}
          value="up"
          onValueChange={() => {}}
          labelId="kicker"
        />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    const checked = screen.getByRole("radio", { name: "Upstream" });
    expect(document.activeElement).toBe(checked);
    expect(checked.tabIndex).toBe(0);
    for (const name of ["All", "Downstream"]) {
      expect(screen.getByRole("radio", { name }).tabIndex).toBe(-1);
    }
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "after" }),
    );
  });

  it("ArrowRight moves focus to the next option and selects it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ControlledHarness
        options={OPTIONS}
        initialValue="all"
        onValueChange={onValueChange}
      />,
    );
    await user.tab();
    await pressArrow(user, "ArrowRight");
    const next = screen.getByRole("radio", { name: "Upstream" });
    expect(document.activeElement).toBe(next);
    expect(next.getAttribute("aria-checked")).toBe("true");
    expect(onValueChange).toHaveBeenCalledWith("up");
  });

  it("ArrowLeft from the first option wraps to the last", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} initialValue="all" />);
    await user.tab();
    await pressArrow(user, "ArrowLeft");
    const last = screen.getByRole("radio", { name: "Downstream" });
    expect(document.activeElement).toBe(last);
    expect(last.getAttribute("aria-checked")).toBe("true");
  });

  it("arrow navigation skips disabled options", async () => {
    const user = userEvent.setup();
    render(
      <ControlledHarness
        options={[
          OPTIONS[0],
          { value: "up", label: "Upstream", disabled: true },
          OPTIONS[2],
        ]}
        initialValue="all"
      />,
    );
    await user.tab();
    await pressArrow(user, "ArrowRight");
    const landed = screen.getByRole("radio", { name: "Downstream" });
    expect(document.activeElement).toBe(landed);
    expect(landed.getAttribute("aria-checked")).toBe("true");
  });
});
