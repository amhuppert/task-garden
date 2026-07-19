import type { ReactNode } from "react";
import { Dialog } from "./ui/Dialog";

interface SectionInfoModalProps {
  title: string;
  children: ReactNode;
}

/**
 * Info-icon-triggered modal explaining a workspace section — a thin preset
 * over the `Dialog` primitive (APG Dialog, Modal). Supplies the standard
 * circled-"i" trigger and scrollable explanation body; callers provide only
 * the section title and explanation content.
 */
export function SectionInfoModal({ title, children }: SectionInfoModalProps) {
  return (
    <Dialog
      title={title}
      trigger={
        <button
          type="button"
          aria-label={`${title} explanation`}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="7.25"
              y="7"
              width="1.5"
              height="5"
              rx="0.75"
              fill="currentColor"
            />
            <rect
              x="7.25"
              y="4"
              width="1.5"
              height="1.5"
              rx="0.75"
              fill="currentColor"
            />
          </svg>
        </button>
      }
    >
      {/* The body is purely static text; without a tab stop inside the scroll
          container a keyboard user could not scroll overflowing content. */}
      <section
        aria-label={title}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: static scrollable region must be focusable so keyboard users can scroll it (WCAG 2.1.1; APG modal dialog initial-focus note)
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      </section>
    </Dialog>
  );
}
