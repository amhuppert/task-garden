// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabPanel, Tabs } from "./Tabs";

afterEach(cleanup);

const THREE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "ready", label: "Ready" },
  { value: "metrics", label: "Metrics" },
];

function Harness({
  initialValue = "overview",
  onValueChange,
  scrollRef,
}: {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  scrollRef?: Ref<HTMLDivElement>;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      tabs={THREE_TABS}
      ariaLabel="Insight mode"
    >
      <TabPanel value="overview" scrollRef={scrollRef}>
        Overview body
      </TabPanel>
      <TabPanel value="ready">Ready body</TabPanel>
      <TabPanel value="metrics">Metrics body</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders a labelled tablist containing the tabs in order", () => {
    render(<Harness />);

    expect(screen.getByRole("tablist", { name: "Insight mode" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Ready",
      "Metrics",
    ]);
  });

  it("marks only the active tab aria-selected", () => {
    render(<Harness initialValue="ready" />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("links the active tab and its tabpanel via aria-controls / aria-labelledby", () => {
    render(<Harness />);

    const tab = screen.getByRole("tab", { name: "Overview" });
    const panel = screen.getByRole("tabpanel");
    expect(panel.id).toBe(tab.getAttribute("aria-controls"));
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("shows only the active tab's panel content", () => {
    render(<Harness initialValue="ready" />);

    expect(screen.getByRole("tabpanel").textContent).toBe("Ready body");
    expect(screen.queryByText("Overview body")).toBeNull();
    expect(screen.queryByText("Metrics body")).toBeNull();
  });

  it("uses a roving tabindex: Tab enters at the active tab, skipping inactive tabs", async () => {
    const user = userEvent.setup();
    render(<Harness initialValue="metrics" />);

    await user.tab(); // enters the tablist at the active (last) tab, not the first
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Metrics" }),
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);
  });

  it("makes the active panel focusable so keyboard users can enter it", () => {
    render(<Harness />);

    expect(screen.getByRole("tabpanel").tabIndex).toBe(0);
  });

  it("activates a tab on click and reports the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("tab", { name: "Metrics" }));

    expect(onValueChange).toHaveBeenCalledWith("metrics");
    expect(
      screen
        .getByRole("tab", { name: "Metrics" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Metrics body");
  });

  it("moves focus and selection with ArrowRight / ArrowLeft, wrapping at the ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab(); // focus lands on the active tab
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Overview" }),
    );

    await user.keyboard("{ArrowRight}");
    const ready = screen.getByRole("tab", { name: "Ready" });
    expect(document.activeElement).toBe(ready);
    expect(ready.getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{ArrowLeft}{ArrowLeft}"); // back past the first tab wraps to the last
    const metrics = screen.getByRole("tab", { name: "Metrics" });
    expect(document.activeElement).toBe(metrics);
    expect(metrics.getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{ArrowRight}"); // wraps forward to the first tab
    const overview = screen.getByRole("tab", { name: "Overview" });
    expect(document.activeElement).toBe(overview);
    expect(overview.getAttribute("aria-selected")).toBe("true");
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness initialValue="ready" />);

    await user.tab();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Metrics" }),
    );
    expect(
      screen
        .getByRole("tab", { name: "Metrics" })
        .getAttribute("aria-selected"),
    ).toBe("true");

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Overview" }),
    );
    expect(
      screen
        .getByRole("tab", { name: "Overview" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("moves focus from the tablist into the active panel on Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole("tabpanel"));
  });

  it("exposes the active panel element through scrollRef", () => {
    const scrollRef = vi.fn();
    render(<Harness scrollRef={scrollRef} />);

    expect(scrollRef).toHaveBeenCalledWith(screen.getByRole("tabpanel"));
  });

  it("keeps an inactive panel's element mounted (hidden) and assigns its scrollRef", () => {
    const overviewRef = vi.fn();
    render(<Harness initialValue="ready" scrollRef={overviewRef} />);

    // Every tabpanel element stays in the DOM (only children unmount), so a
    // ref shared between panels would end up pointing at the wrong one —
    // consumers must use one ref per panel.
    expect(overviewRef).toHaveBeenCalled();
    const el = overviewRef.mock.calls[0][0] as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.hasAttribute("hidden")).toBe(true);
    expect(el.textContent).toBe("");
  });
});
