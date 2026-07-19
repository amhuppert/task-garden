// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineTextEditor } from "./InlineTextEditor";

afterEach(cleanup);

const noop = () => {};

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof InlineTextEditor>> = {},
) {
  return render(
    <InlineTextEditor
      value="Original"
      onInput={noop}
      onCommit={noop}
      onCancel={noop}
      ariaLabel="Work item title"
      {...overrides}
    />,
  );
}

describe("InlineTextEditor", () => {
  it("exposes a keyboard-focusable textbox with an accessible name showing the value", () => {
    renderEditor();

    const el = screen.getByRole("textbox", { name: "Work item title" });
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.textContent).toBe("Original");
  });

  it("is single-line by default and declares multi-line semantics when multiline", () => {
    renderEditor();
    expect(screen.getByRole("textbox").getAttribute("aria-multiline")).toBe(
      "false",
    );
    cleanup();

    renderEditor({ multiline: true });
    expect(screen.getByRole("textbox").getAttribute("aria-multiline")).toBe(
      "true",
    );
  });

  it("exposes the placeholder to assistive technology via aria-placeholder", () => {
    renderEditor({ value: "", placeholder: "Add a title" });
    expect(screen.getByRole("textbox").getAttribute("aria-placeholder")).toBe(
      "Add a title",
    );
  });

  it("reports typed text through onInput", () => {
    const onInput = vi.fn();
    renderEditor({ onInput });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
      el.textContent = "Edited";
      fireEvent.input(el);
    });

    expect(onInput).toHaveBeenCalledWith("Edited");
  });

  it("commits on blur", () => {
    const onCommit = vi.fn();
    renderEditor({ onCommit });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
    });
    act(() => {
      el.blur();
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("Enter commits exactly once and moves focus out when single-line", () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    renderEditor({ onCommit, onCancel });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
    });
    act(() => {
      fireEvent.keyDown(el, { key: "Enter" });
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(el);
  });

  it("Enter neither commits nor blurs when multiline, leaving newline insertion to the browser", () => {
    const onCommit = vi.fn();
    renderEditor({ multiline: true, onCommit });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
    });

    let defaultNotPrevented = false;
    act(() => {
      defaultNotPrevented = fireEvent.keyDown(el, { key: "Enter" });
    });

    expect(defaultNotPrevented).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(el);
  });

  it("Escape cancels before any commit, restores the committed text, and moves focus out", () => {
    const calls: string[] = [];
    renderEditor({
      onCommit: () => calls.push("commit"),
      onCancel: () => calls.push("cancel"),
    });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
      el.textContent = "Changed";
      fireEvent.input(el);
    });
    act(() => {
      fireEvent.keyDown(el, { key: "Escape" });
    });

    expect(calls[0]).toBe("cancel");
    expect(el.textContent).toBe("Original");
    expect(document.activeElement).not.toBe(el);
  });

  it("does not mutate the textbox DOM during the input-driven re-render (preserves caret)", async () => {
    function Harness() {
      const [value, setValue] = useState("Original");
      return (
        <InlineTextEditor
          value={value}
          onInput={setValue}
          onCommit={noop}
          onCancel={noop}
          ariaLabel="Work item title"
        />
      );
    }
    render(<Harness />);

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
    });

    // Simulate a real-browser keypress in a contentEditable: the browser
    // appends to the existing text node in place — it does not replace
    // children. Cursor would naturally land at the end of the text.
    const textNode = el.firstChild as Text;
    textNode.appendData("X");

    // Watch for any DOM writes during the React re-render triggered by
    // onInput. In a real browser, *any* characterData/childList write on
    // this subtree collapses the caret to offset 0 — the user-visible bug.
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => {
      mutations.push(...records);
    });
    observer.observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    await act(async () => {
      fireEvent.input(el);
      // Flush MutationObserver microtask
      await Promise.resolve();
    });

    observer.disconnect();

    expect(mutations).toEqual([]);
    expect(el.textContent).toBe("OriginalX");
  });

  it("ignores external value changes while focused, then syncs them after focus leaves", () => {
    const { rerender } = renderEditor({ value: "One" });

    const el = screen.getByRole("textbox");
    act(() => {
      el.focus();
    });

    rerender(
      <InlineTextEditor
        value="Two"
        onInput={noop}
        onCommit={noop}
        onCancel={noop}
        ariaLabel="Work item title"
      />,
    );
    expect(el.textContent).toBe("One");

    act(() => {
      el.blur();
    });
    expect(el.textContent).toBe("Two");
  });

  it("syncs external value changes into the DOM when not focused", () => {
    const { rerender } = renderEditor({ value: "One" });

    rerender(
      <InlineTextEditor
        value="Two"
        onInput={noop}
        onCommit={noop}
        onCancel={noop}
        ariaLabel="Work item title"
      />,
    );

    expect(screen.getByRole("textbox").textContent).toBe("Two");
  });
});
