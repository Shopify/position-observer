const INSET = -1;
const MIN_SIZE = 1 - INSET * 2;

/**
 * This function creates a rootMargin string for IntersectionObserver that defines
 * a rectangle around a target element within the root bounds.
 *
 * The rootMargin creates an observation region that is inset by 1px inside the target:
 *
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃                                Top margin                                  ┃
 * ┃                                    │                                       ┃
 * ┃                  Element           │                                       ┃
 * ┃                 ┏━━━━━━━━━━━━━━━━━ ▼ ━━━━━━━━━━━━━━━━━━━━┓                 ┃
 * ┃                 ┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃                 ┃
 * ┃                 ┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃                 ┃
 * ┃ Left margin  ───▶ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ◀─── Right margin ┃
 * ┃                 ┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃                 ┃
 * ┃                 ┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃                 ┃
 * ┃                 ┗━━━━━━━━━━━━━━━━━ ▲ ━━━━━━━━━━━━━━━━━━━━┛                 ┃
 * ┃                                    │                                       ┃
 * ┃                              Bottom margin                                 ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 *
 * @param rect - The DOMRect of the element.
 * @param rootBounds - The DOMRect of the root element.
 * @returns The root margin as a string in format "top right bottom left".
 */
export function rootMargin(rect: DOMRect, rootBounds: DOMRect) {
  const width = Math.max(rect.width, MIN_SIZE);
  const height = Math.max(rect.height, MIN_SIZE);

  const top = rect.top - rootBounds.top - INSET;
  const left = rect.left - rootBounds.left - INSET;
  const right = rootBounds.right - rect.left - width - INSET;
  const bottom = rootBounds.bottom - rect.top - height - INSET;

  return `${-Math.round(top)}px ${-Math.round(right)}px ${-Math.round(bottom)}px ${-Math.round(left)}px`;
}
