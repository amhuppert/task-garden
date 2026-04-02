import type {
  PlanProcessingFailure,
  PlanProcessingState,
} from "../../lib/plan/plan-processing-pipeline";
import type { ValidationIssue } from "../../lib/plan/task-garden-plan.schema";
import {
  formatValidationPath,
  getFailureDescription,
  getFailureTitle,
} from "./plan-validation-state.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanValidationStateProps {
  state: PlanProcessingState;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IssueList({ issues }: { issues: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {issues.map((msg) => (
        <li
          key={msg}
          className="flex items-start gap-2 font-mono text-xs text-foreground/80"
        >
          <span className="mt-0.5 shrink-0 text-petal" aria-hidden="true">
            ✕
          </span>
          <span>{msg}</span>
        </li>
      ))}
    </ul>
  );
}

function ValidationIssueList({
  issues,
}: { issues: readonly ValidationIssue[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {issues.map((issue) => (
        <li
          key={`${issue.code}:${issue.path.join(".")}`}
          className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.68rem] uppercase tracking-wider text-petal">
              {issue.code}
            </span>
            <span className="font-mono text-[0.68rem] text-muted-foreground">
              {formatValidationPath(issue.path)}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/90">{issue.message}</p>
        </li>
      ))}
    </ul>
  );
}

function FailureBody({
  failure,
  planKey,
}: {
  failure: PlanProcessingFailure;
  planKey: string;
}) {
  const description = getFailureDescription(failure, planKey);

  return (
    <>
      <p className="text-sm text-muted-foreground">{description}</p>
      {failure.type === "validation" ? (
        <ValidationIssueList issues={failure.issues} />
      ) : (
        <IssueList issues={failure.issues} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders feedback for loading, source-failure, parse-failure, and
 * validation-failure states. Returns null for the ready state — the
 * workspace surfaces handle that.
 */
export function PlanValidationState({ state }: PlanValidationStateProps) {
  if (state.status === "ready") return null;

  if (state.status === "loading") {
    return (
      <output
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
        aria-label="Loading plan"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-moss"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Loading plan</p>
          {state.planKey && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {state.planKey}
            </p>
          )}
        </div>
      </output>
    );
  }

  // status === "invalid"
  const planKey = state.source?.source.planKey ?? "";
  const title = getFailureTitle(state.failure);

  return (
    <div className="mx-auto max-w-xl py-10" role="alert" aria-live="polite">
      <div className="atlas-panel px-6 py-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl text-petal" aria-hidden="true">
            ⚠
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium text-foreground">
              {title}
            </h2>
            {planKey && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {planKey}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-4">
          <FailureBody failure={state.failure} planKey={planKey} />
        </div>
      </div>
    </div>
  );
}
