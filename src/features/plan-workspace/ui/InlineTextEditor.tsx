import { useLayoutEffect, useRef, useState } from "react";

export interface InlineTextEditorProps {
  /** Committed value; draft state stays with the consumer. */
  value: string;
  onInput: (text: string) => void;
  /** Fires on blur, and on Enter when `multiline` is false. */
  onCommit: () => void;
  /** Fires on Escape; the editor restores `value` in the DOM before blurring. */
  onCancel: () => void;
  /** When true, Enter inserts a newline instead of committing. */
  multiline?: boolean;
  ariaLabel: string;
  placeholder?: string;
  testId?: string;
  className?: string;
}

/**
 * InlineTextEditor — an inline plain-text editing surface implementing the
 * WAI-ARIA `textbox` role (single-line by default, multi-line via
 * `multiline`). It displays an externally owned value, reports draft text
 * through `onInput`, commits on blur (and on Enter when single-line), and
 * cancels on Escape — restoring the committed value before focus leaves.
 * It guarantees the user's caret and selection are never disturbed by
 * re-renders while the field is focused.
 */
export function InlineTextEditor({
  value,
  onInput,
  onCommit,
  onCancel,
  multiline = false,
  ariaLabel,
  placeholder,
  testId,
  className,
}: InlineTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync the DOM imperatively rather than rendering {value} as a JSX child.
  // Rendering it as a child causes React to reconcile the text node on every
  // keystroke (each input → onInput → consumer re-render), which writes to
  // nodeValue and collapses the caret to position 0 in real browsers.
  // useLayoutEffect covers both initial mount and external value changes when
  // not focused; while focused we leave the DOM alone so the user can type.
  useLayoutEffect(() => {
    if (focused) return;
    const el = ref.current;
    if (!el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value, focused]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    onInput(event.currentTarget.textContent ?? "");
  };

  const handleBlur = () => {
    setFocused(false);
    onCommit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      // Blur performs the commit so Enter and blur share one commit path.
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      const el = ref.current;
      if (el) {
        el.textContent = value;
      }
      event.currentTarget.blur();
    }
    // multiline: Enter falls through so the browser inserts a newline
  };

  // Focused visuals use data-attribute variants: their attribute selector
  // outranks the consumer's resting border/background utilities, which a
  // plain conditional class could not reliably do (stylesheet-order tie).
  const focusedClasses =
    "data-[focused=true]:border-moss data-[focused=true]:bg-[color-mix(in_oklab,var(--color-lichen)_12%,transparent)]";
  const hoverClasses = focused
    ? ""
    : "hover:border-[color-mix(in_oklab,var(--color-border-strong)_70%,transparent)] hover:border-dashed";
  const placeholderClasses = placeholder
    ? "empty:before:pointer-events-none empty:before:text-iron empty:before:content-[attr(aria-placeholder)]"
    : "";

  return (
    <div
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-multiline={multiline ? "true" : "false"}
      aria-placeholder={placeholder}
      data-testid={testId}
      data-focused={focused ? "true" : undefined}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={[
        "border outline-none transition-colors",
        focusedClasses,
        hoverClasses,
        placeholderClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
