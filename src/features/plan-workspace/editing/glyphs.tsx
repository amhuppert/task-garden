interface GlyphProps {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

const DEFAULT_SIZE = 14;

export function PencilGlyph(props: GlyphProps) {
  const size = props.size ?? DEFAULT_SIZE;
  const ariaHidden = props["aria-hidden"] ?? true;
  return (
    <svg
      aria-hidden={ariaHidden}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-glyph="pencil"
    >
      <title>Edit</title>
      <path d="M11.5 2.5l2 2-8 8H3.5v-2z" />
      <path d="M10 4l2 2" />
    </svg>
  );
}

export function ChevronGlyph(props: GlyphProps) {
  const size = props.size ?? DEFAULT_SIZE;
  const ariaHidden = props["aria-hidden"] ?? true;
  return (
    <svg
      aria-hidden={ariaHidden}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-glyph="chevron"
    >
      <title>Expand</title>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function CloseGlyph(props: GlyphProps) {
  const size = props.size ?? DEFAULT_SIZE;
  const ariaHidden = props["aria-hidden"] ?? true;
  return (
    <svg
      aria-hidden={ariaHidden}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-glyph="close"
    >
      <title>Close</title>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function PlusGlyph(props: GlyphProps) {
  const size = props.size ?? DEFAULT_SIZE;
  const ariaHidden = props["aria-hidden"] ?? true;
  return (
    <svg
      aria-hidden={ariaHidden}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-glyph="plus"
    >
      <title>Add</title>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
