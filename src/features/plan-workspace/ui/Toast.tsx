import * as RadixToast from "@radix-ui/react-toast";
import type { ReactNode } from "react";

/**
 * ToastViewport — the single mount point for all toasts (APG Alert pattern,
 * toast idiom). Wrap it around the subtree that raises toasts and mount it
 * exactly once. Provides the labelled "Notifications" region in the top-right
 * corner, the F8 hotkey that moves keyboard focus to it, and pausing of toast
 * auto-dismiss timers while the region is hovered, focused, or the window is
 * blurred.
 */
export function ToastViewport(props: { children: ReactNode }) {
  return (
    <RadixToast.Provider swipeDirection="right">
      {props.children}
      <RadixToast.Viewport className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}

type ToastProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Auto-dismiss delay in ms; the timer pauses on hover/focus. */
  duration?: number;
};

/**
 * Toast — a transient notification announced to assistive technology without
 * moving focus (APG Alert pattern, toast idiom). Fully controlled through
 * open/onOpenChange; auto-dismisses after `duration`, and is dismissable via
 * its close button or Escape. Must be rendered inside ToastViewport.
 */
export function Toast({
  open,
  onOpenChange,
  title,
  description,
  duration = 6000,
}: ToastProps) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
      // AT announcement happens via Radix's dedicated live-region announcer;
      // aria-live="off" keeps the focusable toast itself from double-announcing.
      // biome-ignore lint/a11y/useSemanticElements: Radix Root renders an <li> inside the viewport <ol>; <output> is not an option
      role="status"
      aria-live="off"
      aria-atomic="true"
      className="atlas-panel flex items-start gap-3 px-4 py-3"
    >
      <div className="flex-1">
        <RadixToast.Title className="atlas-kicker text-pollen">
          {title}
        </RadixToast.Title>
        {description !== undefined && (
          <RadixToast.Description className="mt-1 text-xs leading-snug text-muted-foreground">
            {description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Close notification"
      >
        <svg
          aria-hidden="true"
          width={14}
          height={14}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-glyph="close"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
