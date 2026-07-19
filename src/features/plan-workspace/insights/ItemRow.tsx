/**
 * Clickable work-item row shared by the insight modes: id + title with an
 * optional trailing badge, selecting the item on click. Without an `onClick`
 * the row stays focusable but inert (`aria-disabled`). `badgeLabel` is the
 * screen-reader replacement for a terse visual badge — the visible badge is
 * hidden from AT and the label announced instead (no tooltip: the badge is
 * not interactive).
 */
interface ItemRowProps {
  id: string;
  title: string;
  badge?: string;
  badgeLabel?: string;
  onClick?: (id: string) => void;
}

export function ItemRow({
  id,
  title,
  badge,
  badgeLabel,
  onClick,
}: ItemRowProps) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(id) : undefined}
      aria-disabled={onClick ? undefined : true}
      className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-muted aria-disabled:cursor-default"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-[0.65rem] text-muted-foreground">
          {id}
        </span>
        <span className="line-clamp-2 text-sm leading-snug text-foreground">
          {title}
        </span>
      </div>
      {badge !== undefined && (
        <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
          {badgeLabel !== undefined ? (
            <>
              <span aria-hidden="true">{badge}</span>
              <span className="sr-only">{badgeLabel}</span>
            </>
          ) : (
            badge
          )}
        </span>
      )}
    </button>
  );
}
