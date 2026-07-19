import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Fragment, type ReactNode } from "react";

export interface FilterChipOption {
  value: string;
  label: ReactNode;
  /**
   * Per-chip action rendered as a sibling of the toggle item, never inside
   * it — the chip must stay a single interactive control (no nested
   * interactive content).
   */
  trailing?: ReactNode;
}

export interface FilterChipGroupProps {
  options: FilterChipOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  /** id of the visible section label (kicker) that names the group. */
  labelId: string;
}

/**
 * A labelled row of multi-select filter chips implementing the APG Toggle
 * Button pattern: a `group` named by the section label, containing
 * independent toggle buttons that expose their pressed state via
 * `aria-pressed` and toggle with Space/Enter. Selection is fully
 * controlled through `values`/`onValuesChange`.
 */
export function FilterChipGroup({
  options,
  values,
  onValuesChange,
  labelId,
}: FilterChipGroupProps) {
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
      className="flex flex-wrap gap-1.5"
    >
      {options.map(({ value, label, trailing }) => {
        const chip = (
          <ToggleGroup.Item
            value={value}
            className={`atlas-chip hover:border-border-strong${values.includes(value) ? " atlas-chip-active" : ""}`}
          >
            {label}
          </ToggleGroup.Item>
        );
        if (!trailing) return <Fragment key={value}>{chip}</Fragment>;
        return (
          // `group` enables trailing actions styled with group-hover reveal.
          <span key={value} className="group relative inline-flex items-center">
            {chip}
            {trailing}
          </span>
        );
      })}
    </ToggleGroup.Root>
  );
}
