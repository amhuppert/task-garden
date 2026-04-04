import * as Dialog from "@radix-ui/react-dialog";

interface SectionInfoModalProps {
  title: string;
  children: React.ReactNode;
}

export function SectionInfoModal({ title, children }: SectionInfoModalProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
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
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="atlas-panel fixed left-1/2 top-1/2 z-50 mx-4 flex max-h-[84vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="atlas-kicker text-[0.72rem]">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
              {children}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
