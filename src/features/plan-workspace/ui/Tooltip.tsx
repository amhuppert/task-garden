import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

/**
 * Shared tooltip configuration boundary. Mount once at the app root; every
 * Tooltip below it shares grouped open-delay and skip-delay behavior.
 */
export function TooltipProvider(props: { children: ReactNode }): ReactNode {
  return <RadixTooltip.Provider>{props.children}</RadixTooltip.Provider>;
}

type TooltipProps = {
  content: ReactNode;
  /**
   * The trigger element itself (rendered asChild — no wrapper is added). It
   * must be focusable: APG tooltips open on keyboard focus, so for disabled
   * controls callers use `aria-disabled` (or a wrapper span) instead of
   * `disabled`.
   */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  /** Per-tooltip open delay in ms; omitted, the provider default applies. */
  delayDuration?: number;
};

/**
 * APG Tooltip: a read-only text popup that labels or describes its focusable
 * trigger. Opens on hover and on keyboard focus, dismisses on Escape, blur,
 * and pointer-leave, and is announced to assistive tech via the trigger's
 * accessible description. Positioning, portalling, and dismissal are owned
 * here; consumers supply only the trigger and the content.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration,
}: TooltipProps): ReactNode {
  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          collisionPadding={8}
          className="atlas-panel z-50 max-w-[220px] px-3 py-2.5 text-xs text-foreground"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
