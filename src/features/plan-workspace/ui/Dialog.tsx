import * as RadixDialog from "@radix-ui/react-dialog";
import { type ReactElement, type ReactNode, useRef } from "react";

type DialogWidth = "sm" | "lg";

// "sm" is the centered info modal, "lg" the top-aligned creation form; header
// density and title treatment follow the preset so migrated consumers keep
// their existing look without extra styling props.
const CHROME: Record<
  DialogWidth,
  {
    overlay: string;
    content: string;
    header: string;
    title: string;
    close: string;
    description: string;
  }
> = {
  sm: {
    overlay: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
    content:
      "atlas-panel fixed left-1/2 top-1/2 z-50 mx-4 flex max-h-[84vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden",
    header:
      "flex shrink-0 items-center justify-between border-b border-border px-6 py-4",
    title: "atlas-kicker text-[0.72rem]",
    close:
      "rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-muted",
    description:
      "shrink-0 px-6 pt-4 text-xs leading-relaxed text-muted-foreground",
  },
  lg: {
    overlay: "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm",
    content:
      "atlas-panel fixed left-1/2 top-6 z-50 flex max-h-[calc(100vh-3rem)] w-[calc(100%-3rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden",
    header:
      "flex shrink-0 items-center justify-between border-b border-border px-4 py-3",
    title: "atlas-title text-base text-foreground",
    close:
      "text-xs text-muted-foreground transition-colors hover:text-foreground",
    description:
      "shrink-0 px-4 pt-3 text-xs leading-relaxed text-muted-foreground",
  },
};

export interface DialogProps {
  /** Caller-supplied trigger button. Omit when fully controlled with no trigger. */
  trigger?: ReactNode;
  /** Always-visible header title; provides the dialog's accessible name. */
  title: string;
  /** Optional supporting text announced as the dialog's accessible description. */
  description?: string;
  /** Controlled open state; leave undefined for uncontrolled trigger-driven use. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Keep the dialog open on outside press; Escape still closes. */
  disableOutsideClose?: boolean;
  width?: DialogWidth;
  children: ReactNode;
}

/**
 * Modal dialog primitive — implements the APG Dialog (Modal) pattern.
 *
 * Presents a titled modal panel layered above the React Flow canvas. It fully
 * owns the portal, dimmed overlay with scroll lock, focus trap, Escape
 * dismissal, focus return to the invoker (the trigger, or in triggerless
 * controlled mode the element focused when `open` flipped true), and
 * `role=dialog`/`aria-modal` semantics; consumers provide only trigger,
 * title, and body content and never touch @radix-ui/* directly.
 */
export function Dialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  disableOutsideClose = false,
  width = "sm",
  children,
}: DialogProps) {
  const chrome = CHROME[width];
  // Without a Radix Trigger, Radix's close handler finds no trigger to
  // refocus and its preventDefault suppresses the FocusScope fallback, so
  // focus would drop to <body>. Capture the invoker at the render where
  // `open` flips true (before Radix moves focus into the panel) and restore
  // it ourselves on close.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(open === true);
  if (trigger === undefined && open === true && !prevOpenRef.current) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  prevOpenRef.current = open === true;
  const handleCloseAutoFocus =
    trigger === undefined
      ? (event: Event) => {
          event.preventDefault();
          const invoker = returnFocusRef.current;
          returnFocusRef.current = null;
          if (invoker?.isConnected) invoker.focus();
        }
      : undefined;
  const preventClose = disableOutsideClose
    ? (event: { preventDefault: () => void }) => event.preventDefault()
    : undefined;
  // Radix auto-wires aria-describedby to the Description; when there is no
  // description we must pass an explicit undefined to opt out of its
  // missing-description warning while keeping the attribute absent.
  const describedBy =
    description === undefined ? { "aria-describedby": undefined } : {};

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined && (
        <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      )}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={chrome.overlay} />
        <RadixDialog.Content
          // Radix conveys modality only by aria-hiding outside content; APG
          // Dialog (Modal) additionally expects the attribute itself.
          aria-modal="true"
          className={chrome.content}
          onPointerDownOutside={preventClose}
          onInteractOutside={preventClose}
          onCloseAutoFocus={handleCloseAutoFocus}
          {...describedBy}
        >
          <div className={chrome.header}>
            <RadixDialog.Title className={chrome.title}>
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button type="button" aria-label="Close" className={chrome.close}>
                ✕
              </button>
            </RadixDialog.Close>
          </div>
          {description !== undefined && (
            <RadixDialog.Description className={chrome.description}>
              {description}
            </RadixDialog.Description>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Wraps a bespoke button (Cancel, footer Close) so activating it closes the
 * enclosing Dialog. The child keeps its own rendering and accessible name.
 */
export function DialogClose({ children }: { children: ReactElement }) {
  return <RadixDialog.Close asChild>{children}</RadixDialog.Close>;
}
