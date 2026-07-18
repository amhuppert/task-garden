export type ValidationCopy = {
  title: string;
  detail: string;
  code: string;
};

export const VALIDATION_COPY: Record<string, ValidationCopy> = {
  cycle_detected: {
    title: "Would create a cycle",
    detail: "Adding this dependency closes a loop.",
    code: "cycle_detected",
  },
  self_dependency: {
    title: "Can't depend on itself",
    detail: "A work item can't be its own prerequisite.",
    code: "self_dependency",
  },
  duplicate_dependency: {
    title: "Duplicate dependency",
    detail: "This prerequisite is already listed.",
    code: "duplicate_dependency",
  },
  missing_dependency: {
    title: "Unknown dependency",
    detail: "Referenced work item doesn't exist in this plan.",
    code: "missing_dependency",
  },
  missing_lane: {
    title: "Unknown lane",
    detail: "Pick a lane that exists in this plan.",
    code: "missing_lane",
  },
  duplicate_id: {
    title: "ID already used",
    detail: "Another item or lane in this plan shares that slug.",
    code: "duplicate_id",
  },
  yaml_parse: {
    title: "Couldn't read the plan",
    detail: "The plan file is malformed; the edit wasn't saved.",
    code: "yaml_parse",
  },
  target_not_found: {
    title: "Target not found",
    detail: "The item this edit refers to is no longer in the plan.",
    code: "target_not_found",
  },
  network: {
    title: "Write failed — CLI offline",
    detail: "Couldn't reach the local plan server. Your draft is preserved.",
    code: "network",
  },
  write_failed: {
    title: "Couldn't save",
    detail: "The plan server hit a snag writing the file.",
    code: "write_failed",
  },
  invalid_patch: {
    title: "Edit rejected",
    detail:
      "The change didn't pass validation. Check the value — retrying the same edit will fail again.",
    code: "invalid_patch",
  },
  default: {
    title: "Something went sideways",
    detail: "The edit didn't take. Try again.",
    code: "unknown",
  },
};

export function resolveValidationCopy(
  code: string | undefined,
): ValidationCopy {
  if (code === undefined) return VALIDATION_COPY.default;
  return VALIDATION_COPY[code] ?? VALIDATION_COPY.default;
}
