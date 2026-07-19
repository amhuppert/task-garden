import * as RadixPopover from "@radix-ui/react-popover";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useRef,
} from "react";

export type PopoverProps = {
  /** Rendered asChild — Radix stamps aria-expanded/aria-haspopup/aria-controls on it. */
  trigger: ReactElement;
  /** Accessible name of the panel. */
  ariaLabel: string;
  /** Controlled mode; uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** e.g. "70vh" — constrains the panel and makes it scroll. */
  maxHeight?: string;
  children: ReactNode;
};

/**
 * Non-modal dialog anchored to a trigger (APG Dialog, Non-Modal pattern).
 * The panel portals above the workspace, positions itself against the trigger
 * with collision avoidance, moves focus into itself on open, dismisses on
 * Escape or outside interaction, and returns focus to the trigger on every
 * non-pointer close (Escape and tabbing out of the panel included); a pointer
 * press outside leaves focus where the user clicked. Consumers supply only
 * the trigger element and panel content.
 */
export function Popover({
  trigger,
  ariaLabel,
  open,
  onOpenChange,
  side = "bottom",
  align = "start",
  maxHeight,
  children,
}: PopoverProps): ReactNode {
  const style: CSSProperties | undefined = maxHeight
    ? { maxHeight }
    : undefined;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Radix suppresses its focus return for ANY outside interaction, including
  // the focusin fired when the user Tabs past the panel's last element — the
  // panel is portalled to the end of <body>, so that strands focus after the
  // document. Track whether the close was pointer-driven: only then may focus
  // stay where it landed; every other close refocuses the trigger.
  const pointerOutsideRef = useRef(false);
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild ref={triggerRef}>
        {trigger}
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          aria-label={ariaLabel}
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          style={style}
          className={`atlas-panel z-50${maxHeight ? " overflow-y-auto" : ""}`}
          onInteractOutside={(event) => {
            if (event.detail.originalEvent.type !== "focusin") {
              pointerOutsideRef.current = true;
            }
          }}
          onCloseAutoFocus={(event) => {
            const wasPointer = pointerOutsideRef.current;
            pointerOutsideRef.current = false;
            if (wasPointer) return;
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
