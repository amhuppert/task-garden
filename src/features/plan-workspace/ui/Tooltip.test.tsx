// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Tooltip, TooltipProvider } from "./Tooltip";
import { installRadixDomShims } from "./test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

function renderTooltip(after?: React.ReactNode) {
  return render(
    <TooltipProvider>
      <Tooltip content="Open item docs" delayDuration={0}>
        <button type="button">Docs</button>
      </Tooltip>
      {after}
    </TooltipProvider>,
  );
}

describe("Tooltip", () => {
  it("renders the caller's element as the trigger with no tooltip present", () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "Docs" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on keyboard focus and becomes the trigger's accessible description", async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.tab();

    const trigger = screen.getByRole("button", { name: "Docs" });
    expect(document.activeElement).toBe(trigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Open item docs");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("opens on pointer hover", async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByRole("button", { name: "Docs" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Open item docs");
  });

  it("dismisses on Escape and keeps focus on the trigger", async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).toBeNull();
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Docs" }),
    );
  });

  it("dismisses when the trigger loses focus", async () => {
    const user = userEvent.setup();
    renderTooltip(<button type="button">Next</button>);
    await user.tab();
    await screen.findByRole("tooltip");

    await user.tab();

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).toBeNull();
    });
  });
});
