import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";

export interface FilterListOption {
  value: string;
  label: ReactNode;
  /** Number of plan items carrying this value, shown right-aligned. */
  count?: number;
  /**
   * Per-row action rendered as a sibling of the toggle item, never inside
   * it — the row must stay a single interactive control (no nested
   * interactive content).
   */
  trailing?: ReactNode;
}

export interface FilterListGroupProps {
  options: FilterListOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  /** id of the visible section label (kicker) that names the group. */
  labelId: string;
}

function CheckIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
        active
          ? "border-transparent bg-moss text-primary-foreground"
          : "border-border-strong bg-surface"
      }`}
    >
      {active && (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 4.2L3.2 5.9L6.5 2.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

/**
 * A labelled column of dense multi-select filter rows implementing the APG
 * Toggle Button pattern: a `group` named by the section label, containing
 * independent toggle buttons that expose their pressed state via
 * `aria-pressed` and toggle with Space/Enter. Each row shows a checkbox-style
 * indicator, a truncating label, and an optional item count, so the list
 * stays one fixed-height row per option regardless of label length. Long
 * lists scroll inside a capped-height viewport instead of growing the panel.
 * Selection is fully controlled through `values`/`onValuesChange`.
 */
export function FilterListGroup({
  options,
  values,
  onValuesChange,
  labelId,
}: FilterListGroupProps) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={values}
      onValueChange={onValuesChange}
      aria-labelledby={labelId}
      // APG toggle buttons are ordinary buttons, each its own tab stop.
      // Roving focus would also interleave badly with trailing actions,
      // which sit between items in DOM order. Radix stamps role="toolbar",
      // which promises arrow-key navigation we don't provide — override to
      // a plain labelled group.
      rovingFocus={false}
      // biome-ignore lint/a11y/useSemanticElements: Radix Root renders a div; <fieldset> is not an option here
      role="group"
      className="-mx-1.5 flex max-h-56 flex-col overflow-y-auto overscroll-contain"
    >
      {options.map(({ value, label, count, trailing }) => {
        const active = values.includes(value);
        const row = (
          <ToggleGroup.Item
            value={value}
            className={`flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 text-left text-xs transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckIndicator active={active} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {count !== undefined && (
              // Decorative density hint — kept out of the toggle's accessible
              // name so "Backend" doesn't announce as "Backend 4".
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-[0.65rem] text-muted-foreground/80"
              >
                {count}
              </span>
            )}
          </ToggleGroup.Item>
        );
        if (!trailing)
          return (
            <span key={value} className="flex w-full items-center">
              {row}
            </span>
          );
        return (
          // `group` enables trailing actions styled with group-hover reveal.
          <span key={value} className="group relative flex w-full items-center">
            {row}
            {trailing}
          </span>
        );
      })}
    </ToggleGroup.Root>
  );
}
