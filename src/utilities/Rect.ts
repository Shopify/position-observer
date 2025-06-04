export class Rect {
  /**
   * Intersects two DOMRects.
   *
   * @param rect1 - The first DOMRect.
   * @param rect2 - The second DOMRect.
   * @returns The intersection of the two DOMRects.
   */
  static intersect(rect1: DOMRect, rect2: DOMRect): DOMRect {
    const left = Math.max(rect1.left, rect2.left);
    const right = Math.min(rect1.right, rect2.right);
    const top = Math.max(rect1.top, rect2.top);
    const bottom = Math.min(rect1.bottom, rect2.bottom);

    // Ensure dimensions aren't negative after intersection.
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    return new DOMRect(left, top, width, height);
  }

  /**
   * Clips a DOMRect to a given rectangle.
   *
   * @param rect - The DOMRect to clip.
   * @param clip - The rectangle to clip the DOMRect to.
   * @returns The clipped DOMRect.
   */
  static clip(
    rect: DOMRect,
    clip: Pick<DOMRect, "top" | "right" | "bottom" | "left">
  ) {
    const updatedRect = {
      ...rect.toJSON(),
      top: rect.top + clip.top,
      left: rect.left + clip.left,
      bottom: rect.bottom - clip.bottom,
      right: rect.right - clip.right,
    };

    updatedRect.width = updatedRect.right - updatedRect.left;
    updatedRect.height = updatedRect.bottom - updatedRect.top;

    return updatedRect;
  }

  /**
   * Calculates the offsets of a clipped DOMRect.
   *
   * @param rect - The DOMRect to calculate the offsets for.
   * @param clippedRect - The clipped DOMRect.
   * @returns The offsets of the clipped DOMRect.
   */
  static clipOffsets(rect: DOMRect, clippedRect: DOMRect) {
    return {
      top: clippedRect.top - rect.top,
      left: clippedRect.left - rect.left,
      bottom: rect.bottom - clippedRect.bottom,
      right: rect.right - clippedRect.right,
    };
  }

  /**
   * Checks if two DOMRects are equal.
   *
   * @param rect1 - The first DOMRect.
   * @param rect2 - The second DOMRect.
   * @returns True if the DOMRects are equal, false otherwise.
   */
  static equals(rect1: DOMRect | undefined, rect2: DOMRect | undefined) {
    if (rect1 == null || rect2 == null) return rect1 === rect2;

    return (
      rect1.x === rect2.x &&
      rect1.y === rect2.y &&
      rect1.width === rect2.width &&
      rect1.height === rect2.height
    );
  }

  static sizeEqual(
    rect1: Pick<DOMRect, "width" | "height">,
    rect2: Pick<DOMRect, "width" | "height">
  ) {
    return (
      Math.round(rect1.width) === Math.round(rect2.width) &&
      Math.round(rect1.height) === Math.round(rect2.height)
    );
  }
}
