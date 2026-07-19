// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldShell } from "./FieldShell";

afterEach(cleanup);

describe("FieldShell", () => {
  it("names a labellable native control via htmlFor", () => {
    render(
      <FieldShell label="Value" htmlFor="value-field">
        <input id="value-field" type="number" defaultValue={3} />
      </FieldShell>,
    );

    expect(screen.getByRole("spinbutton", { name: "Value" })).toBeDefined();
    expect(screen.getByLabelText("Value")).toBeInstanceOf(HTMLInputElement);
  });

  it("exposes labelId so a non-labellable child can wire aria-labelledby", () => {
    render(
      <FieldShell label="Title" labelId="title-label">
        <div role="textbox" tabIndex={0} aria-labelledby="title-label" />
      </FieldShell>,
    );

    expect(screen.getByRole("textbox", { name: "Title" })).toBeDefined();
  });

  it("renders the label as plain text when there is no control to associate", () => {
    const { container } = render(
      <FieldShell label="Status">
        <div role="listbox" tabIndex={0} aria-label="Status" />
      </FieldShell>,
    );

    // An unassociated <label> element is invalid labelling semantics.
    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByText("Status", { selector: "span" })).toBeDefined();
  });

  it("announces dirty state to assistive tech as text, with the dot hidden", () => {
    const { container } = render(
      <FieldShell label="Summary" dirty>
        <input aria-label="Summary" />
      </FieldShell>,
    );

    const announcement = screen.getByText("unsaved changes");
    expect(announcement.getAttribute("aria-hidden")).toBeNull();

    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.textContent).toBe("");
  });

  it("announces the dirty transition through a persistent live region", () => {
    const { rerender } = render(
      <FieldShell label="Summary">
        <input aria-label="Summary" />
      </FieldShell>,
    );

    // The region must exist (empty) before the transition — live regions only
    // announce changes to content already in the DOM.
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");

    rerender(
      <FieldShell label="Summary" dirty>
        <input aria-label="Summary" />
      </FieldShell>,
    );

    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("unsaved changes");
  });

  it("announces nothing about dirty state when clean", () => {
    render(
      <FieldShell label="Summary">
        <input aria-label="Summary" />
      </FieldShell>,
    );

    expect(screen.queryByText("unsaved changes")).toBeNull();
  });

  it("renders the status and trailing slots in the label row", () => {
    render(
      <FieldShell
        label="Notes"
        status={<output>Saved</output>}
        trailing={<span>OPTIONAL</span>}
      >
        <textarea aria-label="Notes" />
      </FieldShell>,
    );

    // Two status regions exist: FieldShell's own dirty region plus the slot.
    expect(screen.getByText("Saved")).toBeDefined();
    expect(screen.getByText("OPTIONAL")).toBeDefined();
  });

  it("adds no focusable chrome or widget roles of its own", () => {
    const { container } = render(
      <FieldShell label="Value" dirty status={<span>Saved</span>}>
        <input aria-label="Value" />
      </FieldShell>,
    );

    const focusable = container.querySelectorAll(
      "input, button, a[href], [tabindex]",
    );
    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toBeInstanceOf(HTMLInputElement);
  });
});
