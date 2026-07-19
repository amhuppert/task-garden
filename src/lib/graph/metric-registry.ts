import type { EstimateUnit } from "../plan/task-garden-plan.schema";

/**
 * Single source of truth for the plan-metric vocabulary: which metrics exist,
 * what they are called, what they mean, how their values are formatted, and
 * how visual encodings should orient their gradients. Everything else
 * (encoding-mode unions, option arrays, label lookups) is derived from the
 * records below — add a metric here and every consumer picks it up.
 */

// ---------------------------------------------------------------------------
// Registry records
// ---------------------------------------------------------------------------

const METRIC_REGISTRY = [
  {
    key: "value",
    label: "Value",
    summary: "Authored impact value for the item.",
    unitBearing: false,
    higherIsBetter: true,
  },
  {
    key: "value_per_effort",
    label: "Value / Effort",
    summary:
      "Authored value divided by authored estimate. Higher means more impact per effort.",
    unitBearing: false,
    higherIsBetter: true,
  },
  {
    key: "estimate_days",
    label: "Estimate",
    summary: "Authored estimate for the item.",
    unitBearing: true,
    higherIsBetter: false,
  },
  {
    key: "remaining_days",
    label: "Remaining Chain",
    summary:
      "The longest estimated chain from this item to a leaf, including this item.",
    unitBearing: true,
    higherIsBetter: false,
  },
  {
    key: "downstream_effort_days",
    label: "Unlocked Effort",
    summary:
      "The total unique downstream estimated workload unlocked by this item.",
    unitBearing: true,
    higherIsBetter: false,
  },
  {
    key: "degree",
    label: "Degree",
    summary: "Total direct connections (dependencies + dependents).",
    unitBearing: false,
    higherIsBetter: false,
  },
  {
    key: "in_degree",
    label: "In-Degree",
    summary: "Number of direct dependencies this item has.",
    unitBearing: false,
    higherIsBetter: false,
  },
  {
    key: "out_degree",
    label: "Out-Degree",
    summary: "Number of items that directly depend on this item.",
    unitBearing: false,
    higherIsBetter: false,
  },
  {
    key: "betweenness",
    label: "Betweenness",
    summary:
      "How often this item appears on shortest paths between other items. High values indicate structural bridges.",
    unitBearing: false,
    higherIsBetter: false,
  },
  {
    key: "dependency_span",
    label: "Dependency Span",
    summary:
      "How many additional dependency levels lie below this item. Higher means more work downstream.",
    unitBearing: false,
    higherIsBetter: false,
  },
] as const satisfies readonly {
  key: string;
  label: string;
  /** Plain-language description of what the metric measures. */
  summary: string;
  /** True when values are quantities of the plan's estimate unit. */
  unitBearing: boolean;
  /**
   * True when higher values are desirable. Severity gradients run
   * green → red as values rise; benefit metrics invert so green stays "good".
   */
  higherIsBetter: boolean;
}[];

export type MetricKey = (typeof METRIC_REGISTRY)[number]["key"];

export interface MetricDescriptor {
  readonly key: MetricKey;
  readonly label: string;
  readonly summary: string;
  readonly unitBearing: boolean;
  readonly higherIsBetter: boolean;
}

// Keys come from the registry itself, so lookups can never miss.
const DESCRIPTOR_BY_KEY = new Map<MetricKey, MetricDescriptor>(
  METRIC_REGISTRY.map((descriptor) => [descriptor.key, descriptor]),
);

/** All metric keys in canonical display order. */
export const METRIC_KEYS: readonly MetricKey[] = METRIC_REGISTRY.map(
  (descriptor) => descriptor.key,
);

// ---------------------------------------------------------------------------
// Encoding modes (derived)
// ---------------------------------------------------------------------------

// in/out degree are drill-down components of `degree` shown in analysis
// tables; offering them as separate visual encodings would triple the same
// signal, so they are excluded from the encoding option lists.
export type MetricEncodingKey = Exclude<MetricKey, "in_degree" | "out_degree">;

const ANALYSIS_ONLY_METRICS: ReadonlySet<MetricKey> = new Set([
  "in_degree",
  "out_degree",
]);

export const METRIC_ENCODING_OPTIONS: readonly MetricEncodingKey[] =
  METRIC_KEYS.filter(
    (key): key is MetricEncodingKey => !ANALYSIS_ONLY_METRICS.has(key),
  );

export type ColorEncodingMode =
  | "default"
  | "lane"
  | "status"
  | MetricEncodingKey;

export type SizeEncodingMode = "uniform" | MetricEncodingKey;

export const COLOR_MODE_OPTIONS: readonly ColorEncodingMode[] = [
  "default",
  "lane",
  "status",
  ...METRIC_ENCODING_OPTIONS,
];

export const SIZE_MODE_OPTIONS: readonly SizeEncodingMode[] = [
  "uniform",
  ...METRIC_ENCODING_OPTIONS,
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getMetricLabel(key: MetricKey): string {
  return DESCRIPTOR_BY_KEY.get(key)!.label;
}

export function getMetricSummary(key: MetricKey): string {
  return DESCRIPTOR_BY_KEY.get(key)!.summary;
}

export function isUnitBearingMetric(key: MetricKey): boolean {
  return DESCRIPTOR_BY_KEY.get(key)!.unitBearing;
}

/**
 * Gradient orientation: metrics where a higher value is desirable, so color
 * scales invert to keep green meaning "good". Typed over string so encoding
 * modes ("default", "uniform", …) can be tested without casts.
 */
export const HIGHER_IS_BETTER_METRICS: ReadonlySet<string> = new Set(
  METRIC_REGISTRY.filter((descriptor) => descriptor.higherIsBetter).map(
    (descriptor) => descriptor.key,
  ),
);

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const COMPACT_UNIT_SUFFIX: Record<EstimateUnit, string> = {
  hours: "h",
  days: "d",
  points: "pt",
};

/** Compact unit suffix used after a numeric value, e.g. "d", "h", "pt". */
export function compactUnitSuffix(unit: EstimateUnit): string {
  return COMPACT_UNIT_SUFFIX[unit];
}

function formatNumeric(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

/**
 * Formats a metric value for display: unit-bearing metrics carry the plan's
 * compact unit suffix, missing values (non-finite, e.g. value_per_effort
 * without an estimate) render as an em dash, integers never grow fake
 * decimals, and ratios keep two decimal places.
 */
export function formatMetricValue(
  key: MetricKey,
  value: number,
  unit: EstimateUnit,
): string {
  if (!Number.isFinite(value)) return "—";
  if (isUnitBearingMetric(key)) {
    return `${formatNumeric(value)}${compactUnitSuffix(unit)}`;
  }
  // Authored value reads as a score — one decimal is enough.
  if (key === "value") return formatNumeric(value);
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2);
}
