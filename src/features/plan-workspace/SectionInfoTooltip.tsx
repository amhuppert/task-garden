import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { useState } from "react";

interface SectionInfoTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function SectionInfoTooltip({
  label,
  children,
}: SectionInfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, {
    move: false,
    delay: { open: 150, close: 0 },
  });
  const click = useClick(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        {...getReferenceProps()}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
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

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="atlas-panel z-50 max-w-[280px] px-3.5 py-3"
            {...getFloatingProps()}
          >
            <div className="flex flex-col gap-2 text-[0.68rem] leading-relaxed text-muted-foreground">
              {children}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
