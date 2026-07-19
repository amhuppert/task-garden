import * as RadixRadioGroup from "@radix-ui/react-radio-group";

export type ChipRadioOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type ChipRadioGroupProps = {
  options: ChipRadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** id of the visible kicker span labelling the group */
  labelId: string;
  /** id of an optional hint paragraph describing the group */
  describedById?: string;
};

/**
 * Mutually exclusive single-select rendered as a row of segmented chips,
 * implementing the APG Radio Group pattern: a `radiogroup` labelled by the
 * visible kicker, chip `radio` items with `aria-checked`, roving tabindex,
 * and arrow-key selection that wraps and skips disabled chips. Consumers
 * supply options and the controlled value; everything else lives here.
 */
export function ChipRadioGroup({
  options,
  value,
  onValueChange,
  labelId,
  describedById,
}: ChipRadioGroupProps) {
  return (
    <RadixRadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      aria-labelledby={labelId}
      aria-describedby={describedById}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((option) => (
        <RadixRadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="atlas-chip hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:atlas-chip-active"
        >
          {option.label}
        </RadixRadioGroup.Item>
      ))}
    </RadixRadioGroup.Root>
  );
}
