import {
  PositionIntersectionObserver,
  type PositionIntersectionObserverCallback,
} from "./observers/PositionIntersectionObserver.ts";
import { RootBoundsObserver } from "./observers/RootBoundsObserver.ts";
import {
  VisibilityObserver,
  type VisibilityObserverCallback,
} from "./observers/VisibilityObserver.ts";
import { Rect } from "./utilities/Rect.ts";

export interface PositionObserverInit {
  root?: IntersectionObserverInit["root"];
}

/**
 * Provides a way to asynchronously observe changes in the position of a target element.
 */
export class PositionObserver {
  constructor(
    /**
     * A callback function for the position observer.
     *
     * @param entries - The entries of the position observer.
     */
    callback: PositionObserverCallback,
    /**
     * The options for the position observer.
     */
    options?: PositionObserverInit
  ) {
    this.#callback = callback;
    this.#options = options;
    this.#rootBoundsObserver = new RootBoundsObserver(
      options?.root,
      this.#onRootBoundsChange
    );
    this.#visibilityObserver = new VisibilityObserver(
      this.#onVisibilityChange,
      options
    );
    this.#resizeObserver = new ResizeObserver(this.#onResize);
  }

  /**
   * The callback function to be invoked when the position changes.
   */
  #callback: PositionObserverCallback;

  /**
   * The options for the position observer.
   */
  #options?: PositionObserverInit;

  /**
   * The position observers for the observed elements.
   */
  #positionObservers: Map<Element, PositionIntersectionObserver> = new Map();

  /**
   * The resize observer for the observed elements.
   */
  #resizeObserver: ResizeObserver;

  /**
   * The positions of the observed elements.
   */
  #positions: WeakMap<Element, PositionObserverEntry> = new WeakMap();

  /**
   * The root bounds observer for the observed elements.
   */
  #rootBoundsObserver: RootBoundsObserver;

  /**
   * The visibility observer for the observed elements.
   */
  #visibilityObserver: VisibilityObserver;

  /**
   * Observes an element.
   *
   * @param element - The element to observe.
   */
  public observe(element: Element) {
    this.#visibilityObserver.observe(element);
  }

  /**
   * Unobserves an element.
   *
   * @param element - The element to unobserve. If not provided, the position observer is disconnected.
   */
  public unobserve(element?: Element) {
    if (element) {
      this.#positionObservers.get(element)?.disconnect();
      this.#visibilityObserver.unobserve(element);
      this.#positions.delete(element);
    } else {
      this.disconnect();
    }
  }

  /**
   * Disconnects the observer.
   */
  public disconnect() {
    for (const positionObserver of this.#positionObservers.values()) {
      positionObserver.disconnect();
    }

    this.#positionObservers.clear();
    this.#resizeObserver.disconnect();
    this.#rootBoundsObserver.disconnect();
    this.#visibilityObserver.disconnect();
  }

  /**
   * Notifies the position observer of the changes.
   *
   * @param entries - The entries to notify.
   */
  #notify(entries: PositionObserverEntry[]) {
    const records: PositionObserverEntry[] = [];

    for (const entry of entries) {
      const { target } = entry;
      const previousEntry = this.#positions.get(target);

      if (isEntryEqual(entry, previousEntry)) continue;

      this.#positions.set(target, entry);
      records.push(entry);
    }

    if (records.length > 0) {
      this.#callback(records);
    }
  }

  /**
   * The callback function to be invoked when the root bounds change.
   */
  #onRootBoundsChange = (rootBounds: DOMRectReadOnly) => {
    const entries: PositionObserverEntry[] = [];

    for (const [element] of this.#positionObservers) {
      const boundingClientRect = element.getBoundingClientRect();
      const observer = this.#observePosition(element, boundingClientRect);

      entries.push(
        new PositionObserverEntry(
          element,
          boundingClientRect,
          observer.visibleRect,
          observer.isIntersecting,
          rootBounds
        )
      );
    }

    this.#notify(entries);
  };

  /**
   * Observes the position of an element.
   *
   * @param element - The element to observe.
   * @param clientRect - The client rect of the element.
   */
  #observePosition(element: Element, clientRect: DOMRect) {
    const visibilityObserver = this.#visibilityObserver;

    this.#positionObservers.get(element)?.disconnect();
    const positionObserver = new PositionIntersectionObserver(
      element,
      this.#onPositionChange,
      {
        clientRect,
        root: this.#options?.root,
        rootBounds: this.#rootBoundsObserver.rootBounds,
        get clip() {
          const intersection = visibilityObserver.intersections.get(element);
          if (!intersection) return;

          const { intersectionRect, boundingClientRect } = intersection;

          return Rect.clipOffsets(boundingClientRect, intersectionRect);
        },
      }
    );

    this.#positionObservers.set(element, positionObserver);

    return positionObserver;
  }

  /**
   * The callback function to be invoked when the visibility changes.
   */
  #onVisibilityChange: VisibilityObserverCallback = (entries) => {
    const records: PositionObserverEntry[] = [];

    for (const entry of entries) {
      const { target, isIntersecting, boundingClientRect } = entry;

      if (isIntersecting) {
        this.#observePosition(target, boundingClientRect);
        this.#resizeObserver.observe(target);
      } else {
        this.#positionObservers.get(target)?.disconnect();
        this.#positionObservers.delete(target);
        this.#resizeObserver.unobserve(target);
      }

      const observer = this.#positionObservers.get(target);

      records.push(
        new PositionObserverEntry(
          target,
          boundingClientRect,
          observer?.visibleRect ?? entry.intersectionRect,
          isIntersecting,
          this.#rootBoundsObserver.rootBounds
        )
      );
    }

    this.#notify(records);
  };

  /**
   * The callback function to be invoked when the position changes.
   */
  #onPositionChange: PositionIntersectionObserverCallback = (
    entry,
    observer
  ) => {
    this.#notify([
      new PositionObserverEntry(
        entry.target,
        entry.boundingClientRect,
        observer.visibleRect,
        entry.isIntersecting,
        this.#rootBoundsObserver.rootBounds
      ),
    ]);
  };

  /**
   * The callback function to be invoked when the resize observer entries change.
   */
  #onResize = (entries: ResizeObserverEntry[]) => {
    const records: PositionObserverEntry[] = [];

    for (const entry of entries) {
      const { target, borderBoxSize } = entry;

      const previous = this.#positions.get(target);

      if (previous) {
        const [{ inlineSize: width, blockSize: height }] = borderBoxSize;

        if (Rect.sizeEqual(previous.boundingClientRect, { width, height })) {
          continue;
        }
      }

      const boundingClientRect = target.getBoundingClientRect();
      const observer = this.#observePosition(target, boundingClientRect);

      records.push(
        new PositionObserverEntry(
          target,
          boundingClientRect,
          observer.visibleRect,
          this.#visibilityObserver.intersections.get(target)?.isIntersecting ??
            false,
          this.#rootBoundsObserver.rootBounds
        )
      );
    }

    this.#notify(records);
  };
}

/**
 * An entry in the position observer.
 */
export class PositionObserverEntry {
  constructor(
    /**
     * The target element.
     */
    public target: Element,
    /**
     * The bounding client rect of the target element.
     */
    public boundingClientRect: DOMRectReadOnly,
    /**
     * The intersection rect of the target element with the root.
     */
    public intersectionRect: DOMRectReadOnly,
    /**
     * Whether the target element is intersecting with the root.
     */
    public isIntersecting: boolean,
    /**
     * The bounds of the root element.
     */
    public rootBounds: DOMRectReadOnly
  ) {}
}

/**
 * A callback function for the position observer.
 *
 * @param entries - The entries of the position observer.
 */
export type PositionObserverCallback = (
  entries: PositionObserverEntry[]
) => void;

/**
 * Checks if two position observer entries are equal.
 *
 * @param first - The first position observer entry.
 * @param second - The second position observer entry.
 * @returns True if the position observer entries are equal, false otherwise.
 */
function isEntryEqual(
  first: PositionObserverEntry,
  second: PositionObserverEntry | undefined
) {
  if (second == null) return false;

  return (
    first.target === second.target &&
    first.isIntersecting === second.isIntersecting &&
    Rect.equals(first.boundingClientRect, second.boundingClientRect) &&
    Rect.equals(first.intersectionRect, second.intersectionRect)
  );
}
