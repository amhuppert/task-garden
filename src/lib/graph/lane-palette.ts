/** Cycling palette of botanical tones for lanes without an authored color. */
const LANE_COLOR_PALETTE = [
  "var(--color-water)",
  "var(--color-moss)",
  "var(--color-pollen)",
  "var(--color-petal)",
  "var(--color-lichen)",
  "var(--color-sage)",
  "var(--color-bark)",
  "var(--color-iron)",
];

/** Returns a palette color for a lane by its index in the lane order. */
export function getLanePaletteColor(laneIndex: number): string {
  return LANE_COLOR_PALETTE[laneIndex % LANE_COLOR_PALETTE.length];
}
