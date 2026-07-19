/**
 * Radix primitives probe pointer-capture, scroll, and resize APIs that
 * happy-dom does not implement. Tests that mount Radix Select/Popover/Tooltip
 * opt in by calling this at module scope; it is deliberately not a global
 * vitest setup so node-env pure-logic tests stay untouched.
 */
export function installRadixDomShims(): void {
  const proto = Element.prototype;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverShim {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver =
      ResizeObserverShim as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.PointerEvent === "undefined") {
    globalThis.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
}
