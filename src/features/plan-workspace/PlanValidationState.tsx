import { useEffect, useState } from "react";
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
import { LiveRegion } from "./ui/LiveRegion";

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

function FailureBody({ failure }: { failure: PlanProcessingFailure }) {
  const description = getFailureDescription(failure);

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
  // A live region only announces changes to content already in the DOM, so
  // the loading message must be swapped in after the (initially empty) status
  // region has mounted rather than mounted together with it.
  const [loadingAnnouncement, setLoadingAnnouncement] = useState("");
  const loading = state.status === "loading";
  useEffect(() => {
    setLoadingAnnouncement(loading ? "Loading plan" : "");
  }, [loading]);

  if (state.status === "ready") return null;

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <LiveRegion kind="status" className="sr-only">
          {loadingAnnouncement}
        </LiveRegion>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-moss"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Loading plan</p>
        </div>
      </div>
    );
  }

  // status === "invalid"
  const title = getFailureTitle(state.failure);
  const issueCount = state.failure.issues.length;

  return (
    <div className="mx-auto max-w-xl py-10">
      {/* role=alert announces on insertion, so mounting with content is
          correct here — but only this brief summary belongs in the alert; the
          issue list stays ordinary navigable content below. */}
      <LiveRegion kind="alert" className="sr-only">
        {`${title}. ${issueCount} issue${issueCount === 1 ? "" : "s"} found.`}
      </LiveRegion>
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
          </div>
        </div>

        {/* Body */}
        <div className="mt-4">
          <FailureBody failure={state.failure} />
        </div>
      </div>
    </div>
  );
}
