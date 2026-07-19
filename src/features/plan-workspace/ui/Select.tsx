import * as RadixSelect from "@radix-ui/react-select";
import { ChevronGlyph } from "../editing/glyphs";

export type SelectOption = {
  value: string;
  label: string;
  swatchColor?: string; // lane color / status accent; omitted → no swatch
  swatchShape?: "dot" | "bar"; // status dot vs lane bar; default "dot"
  disabled?: boolean;
};

export type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Accessible name for the trigger and the popup listbox. */
  ariaLabel: string;
  /** id of the visible kicker label; when given it takes over trigger labelling. */
  labelId?: string;
  /** id of an optional hint paragraph describing the control. */
  describedById?: string;
  /** Stamped on the trigger (e.g. status-picker-chip). */
  testId?: string;
};

function Swatch({ option }: { option: SelectOption }) {
  if (option.swatchColor === undefined) return null;
  const shape =
    option.swatchShape === "bar"
      ? "h-2.5 w-2.5 rounded-sm"
      : "h-2 w-2 rounded-full";
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${shape}`}
      style={{ backgroundColor: option.swatchColor }}
    />
  );
}

/**
 * Single-value picker for a small closed set of options, rendered as a chip
 * trigger that opens a floating listbox. Implements the APG Select-Only
 * Combobox pattern: combobox trigger with expanded/controls wiring, listbox
 * popup, focus moved to the selected option on open and returned to the
 * trigger on close, arrow-key navigation, typeahead, Enter/Space selection,
 * Escape/outside dismissal. Owns its portal and positioning completely;
 * consumers supply value, options, and labelling only. The selected option
 * always carries a "current" badge. Unknown `value`s render an empty trigger —
 * normalize before calling.
 */
export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  labelId,
  describedById,
  testId,
}: SelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        aria-describedby={describedById}
        data-testid={testId}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm transition-colors hover:border-border-strong data-[state=open]:border-moss"
      >
        <RadixSelect.Value>
          {selected !== undefined && (
            <span className="flex min-w-0 items-center gap-2">
              <Swatch option={selected} />
              <span className="truncate whitespace-nowrap font-semibold">
                {selected.label}
              </span>
            </span>
          )}
        </RadixSelect.Value>
        <RadixSelect.Icon className="shrink-0 text-muted-foreground">
          <ChevronGlyph size={10} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label={ariaLabel}
          className="atlas-panel z-50 min-w-[var(--radix-select-trigger-width)]"
        >
          <RadixSelect.Viewport className="flex max-h-48 flex-col gap-0.5 overflow-y-auto p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                // Radix computes aria-selected as selected && highlighted, so
                // no option exposes the current value once the user arrows
                // away; APG requires the selected option to keep it.
                aria-selected={option.value === value}
                className="flex cursor-default items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs outline-none transition-colors data-[highlighted]:bg-surface-muted data-[disabled]:opacity-40 data-[state=checked]:bg-[color-mix(in_oklab,var(--color-lichen)_20%,transparent)] data-[state=checked]:font-semibold"
              >
                <Swatch option={option} />
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                  current
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
