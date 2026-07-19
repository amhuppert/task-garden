// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RowListEditor } from "./RowListEditor";

afterEach(cleanup);

type DemoRow = { label: string; href: string };

function Harness({
  commitOn,
  initial,
  onCommit,
  onRowsChange,
}: {
  commitOn: "field-blur" | "row-blur";
  initial: DemoRow[];
  onCommit: () => void;
  onRowsChange?: (rows: DemoRow[]) => void;
}) {
  const [rows, setRows] = useState<DemoRow[]>(initial);
  return (
    <div>
      <span id="demo-label">Demo rows</span>
      <RowListEditor<DemoRow>
        rows={rows}
        onRowsChange={(next) => {
          onRowsChange?.(next);
          setRows(next);
        }}
        onCommit={onCommit}
        commitOn={commitOn}
        makeEmptyRow={() => ({ label: "", href: "" })}
        addLabel="Add row"
        labelId="demo-label"
        testIdPrefix="demo-"
        renderRow={(row, index, api) => (
          <>
            <input
              data-testid={`demo-field-label-${index}`}
              aria-label={`Label ${index + 1}`}
              value={row.label}
              onChange={(event) =>
                api.update({ ...row, label: event.target.value })
              }
            />
            <input
              data-testid={`demo-field-href-${index}`}
              aria-label={`Href ${index + 1}`}
              value={row.href}
              onChange={(event) =>
                api.update({ ...row, href: event.target.value })
              }
            />
            <button
              type="button"
              aria-label={`Remove row ${index + 1}`}
              onClick={api.remove}
            >
              ×
            </button>
          </>
        )}
      />
    </div>
  );
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("RowListEditor", () => {
  it("exposes a group labelled by labelId, containing rows and the add button", () => {
    render(
      <Harness
        commitOn="row-blur"
        initial={[{ label: "Docs", href: "https://example.com" }]}
        onCommit={vi.fn()}
      />,
    );

    const group = screen.getByRole("group", { name: "Demo rows" });
    const field = within(group).getByLabelText("Label 1") as HTMLInputElement;
    expect(field.value).toBe("Docs");
    expect(within(group).getByRole("button", { name: "Add row" })).toBeTruthy();
  });

  it("stamps testIdPrefix on row containers and the add button", () => {
    render(
      <Harness
        commitOn="row-blur"
        initial={[{ label: "Docs", href: "https://example.com" }]}
        onCommit={vi.fn()}
      />,
    );

    expect(
      screen
        .getByTestId("demo-row-0")
        .contains(screen.getByLabelText("Label 1")),
    ).toBe(true);
    expect(screen.getByTestId("demo-add")).toBe(
      screen.getByRole("button", { name: "Add row" }),
    );
  });

  it("update replaces only the edited row in onRowsChange", () => {
    const onRowsChange = vi.fn();
    render(
      <Harness
        commitOn="row-blur"
        initial={[
          { label: "Docs", href: "https://example.com" },
          { label: "Repo", href: "https://github.com" },
        ]}
        onCommit={vi.fn()}
        onRowsChange={onRowsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Label 2"), {
      target: { value: "Repository" },
    });

    expect(onRowsChange).toHaveBeenCalledWith([
      { label: "Docs", href: "https://example.com" },
      { label: "Repository", href: "https://github.com" },
    ]);
  });

  it("add appends makeEmptyRow() and moves focus into the new row's first field", () => {
    const onRowsChange = vi.fn();
    render(
      <Harness
        commitOn="row-blur"
        initial={[{ label: "Docs", href: "https://example.com" }]}
        onCommit={vi.fn()}
        onRowsChange={onRowsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add row" }));

    expect(onRowsChange).toHaveBeenCalledWith([
      { label: "Docs", href: "https://example.com" },
      { label: "", href: "" },
    ]);
    expect(document.activeElement).toBe(screen.getByLabelText("Label 2"));
  });

  it("add does not commit by itself", async () => {
    const onCommit = vi.fn();
    render(<Harness commitOn="row-blur" initial={[]} onCommit={onCommit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    await flushMicrotasks();

    expect(onCommit).not.toHaveBeenCalled();
  });

  describe("commitOn: field-blur", () => {
    it("commits on a microtask after a field blur", async () => {
      const onCommit = vi.fn();
      render(
        <Harness
          commitOn="field-blur"
          initial={[{ label: "Docs", href: "https://example.com" }]}
          onCommit={onCommit}
        />,
      );

      const field = screen.getByLabelText("Label 1");
      act(() => {
        field.focus();
      });
      fireEvent.blur(field, { relatedTarget: null });
      // Deferred to a microtask, never synchronous with the blur event.
      expect(onCommit).not.toHaveBeenCalled();

      await flushMicrotasks();
      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("commitOn: row-blur", () => {
    it("does not commit while focus moves between fields within the same row", async () => {
      const onCommit = vi.fn();
      render(
        <Harness
          commitOn="row-blur"
          initial={[{ label: "Docs", href: "https://example.com" }]}
          onCommit={onCommit}
        />,
      );

      const label = screen.getByLabelText("Label 1");
      const href = screen.getByLabelText("Href 1");
      await act(async () => {
        label.focus();
        // Simulate Tab: blur label with the row's own href as relatedTarget.
        fireEvent.blur(label, { relatedTarget: href });
        href.focus();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onCommit).not.toHaveBeenCalled();
    });

    it("commits once when focus leaves the row entirely", async () => {
      const onCommit = vi.fn();
      render(
        <Harness
          commitOn="row-blur"
          initial={[{ label: "Docs", href: "https://example.com" }]}
          onCommit={onCommit}
        />,
      );

      const href = screen.getByLabelText("Href 1");
      act(() => {
        href.focus();
      });
      fireEvent.blur(href, { relatedTarget: null });
      expect(onCommit).not.toHaveBeenCalled();

      await flushMicrotasks();
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("commits when focus moves to a different row", async () => {
      const onCommit = vi.fn();
      render(
        <Harness
          commitOn="row-blur"
          initial={[
            { label: "Docs", href: "https://example.com" },
            { label: "Repo", href: "https://github.com" },
          ]}
          onCommit={onCommit}
        />,
      );

      const firstRowField = screen.getByLabelText("Href 1");
      const secondRowField = screen.getByLabelText("Label 2");
      await act(async () => {
        firstRowField.focus();
        // Real focus move: happy-dom fires blur with relatedTarget set.
        secondRowField.focus();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove", () => {
    it("drops the row and commits on a microtask", async () => {
      const onCommit = vi.fn();
      const onRowsChange = vi.fn();
      render(
        <Harness
          commitOn="row-blur"
          initial={[
            { label: "Docs", href: "https://example.com" },
            { label: "Repo", href: "https://github.com" },
          ]}
          onCommit={onCommit}
          onRowsChange={onRowsChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Remove row 2" }));

      expect(onRowsChange).toHaveBeenCalledWith([
        { label: "Docs", href: "https://example.com" },
      ]);
      expect(screen.queryByLabelText("Label 2")).toBeNull();

      await flushMicrotasks();
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("moves focus to the previous row's remove button", async () => {
      render(
        <Harness
          commitOn="row-blur"
          initial={[
            { label: "Docs", href: "https://example.com" },
            { label: "Repo", href: "https://github.com" },
          ]}
          onCommit={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Remove row 2" }));
      await flushMicrotasks();

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Remove row 1" }),
      );
    });

    it("moves focus to the row that slid into the removed row's place when the first row is removed", async () => {
      render(
        <Harness
          commitOn="row-blur"
          initial={[
            { label: "Docs", href: "https://example.com" },
            { label: "Repo", href: "https://github.com" },
          ]}
          onCommit={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
      await flushMicrotasks();

      // The surviving row re-renders as row 1; focus must land on its remove
      // button rather than skipping past the list to the add button.
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Remove row 1" }),
      );
    });

    it("moves focus to the add button when the removed row was the last one left", async () => {
      render(
        <Harness
          commitOn="row-blur"
          initial={[{ label: "Docs", href: "https://example.com" }]}
          onCommit={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
      await flushMicrotasks();

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add row" }),
      );
    });
  });
});
