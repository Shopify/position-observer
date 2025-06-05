import { Rect } from "../utilities/Rect.ts";
import { rootMargin } from "../utilities/rootMargin.ts";
import { threshold } from "../utilities/threshold.ts";

export interface PositionIntersectionObserverOptions {
  clientRect: DOMRect;
  clip: Pick<DOMRect, "top" | "right" | "bottom" | "left"> | undefined;
  root: IntersectionObserverInit["root"];
  rootBounds: DOMRect;
}

export type PositionIntersectionObserverCallback = (
  entry: PositionIntersectionObserverEntry,
  observer: PositionIntersectionObserver
) => void;

/**
 * Provides a way to asynchronously observe changes in the position of a target element.
 */
export class PositionIntersectionObserver {
  constructor(
    /**
     * The element to observe.
     */
    element: Element,
    /**
     * A callback function for the position intersection observer.
     */
    callback: PositionIntersectionObserverCallback,
    /**
     * The options for the position intersection observer.
     */
    options: PositionIntersectionObserverOptions
  ) {
    this.#callback = callback;
    this.#options = options;
    this.#clientRect = options.clientRect;

    this.#observe(element);
  }

  #callback: PositionIntersectionObserverCallback;
  #observer: IntersectionObserver | undefined = undefined;
  #options: PositionIntersectionObserverOptions;
  #clientRect: DOMRect;
  #previousIntersectionRatio: number | undefined = undefined;

  /**
   * The visible rectangle of the element within the root.
   *
   * @returns The visible rectangle of the element within the root.
   */
  get visibleRect() {
    const clip = this.#options.clip;
    return clip ? Rect.clip(this.#clientRect, clip) : this.#clientRect;
  }

  /**
   * Whether the element is intersecting with the root.
   *
   * @returns Whether the element is intersecting with the root.
   */
  get isIntersecting() {
    const { width, height } = this.visibleRect;
    return width > 0 && height > 0;
  }

  /**
   * Observes the element.
   */
  #observe(element: Element) {
    const { root, rootBounds } = this.#options;
    const { visibleRect } = this;

    this.#observer?.disconnect();
    this.#observer = new IntersectionObserver(this.#onIntersection, {
      root,
      rootMargin: rootMargin(visibleRect, rootBounds),
      threshold,
    });

    this.#observer.observe(element);
  }

  /**
   * The callback function for the intersection observer.
   */
  #onIntersection: IntersectionObserverCallback = (entries) => {
    if (!this.#observer) return;

    const entry = entries[entries.length - 1];

    if (entry) {
      const { intersectionRatio, boundingClientRect } = entry;

      const previousClientRect = this.#clientRect;
      this.#clientRect = boundingClientRect;

      const previousIntersectionRatio = this.#previousIntersectionRatio;
      const clientRectChanged = !Rect.equals(
        boundingClientRect,
        previousClientRect
      );

      if (
        intersectionRatio !== this.#previousIntersectionRatio ||
        clientRectChanged
      ) {
        const rootBounds = this.#options.rootBounds;
        const rootIntersection = Rect.intersect(boundingClientRect, rootBounds);
        const isIntersecting =
          rootIntersection.width > 0 && rootIntersection.height > 0;

        if (!isIntersecting) {
          // The element is not visible, the visibility observer will handle it.
          return;
        }

        this.#previousIntersectionRatio = intersectionRatio;

        if (previousIntersectionRatio != null || clientRectChanged) {
          this.#callback(
            new PositionIntersectionObserverEntry(
              entry.target,
              boundingClientRect,
              entry.intersectionRect,
              isIntersecting,
              rootBounds
            ),
            this
          );
          this.#observe(entry.target);
        }
      }
    }
  };

  /**
   * Disconnects the position intersection observer.
   */
  public disconnect() {
    this.#observer?.disconnect();
  }
}

class PositionIntersectionObserverEntry {
  constructor(
    public target: Element,
    public boundingClientRect: DOMRect,
    public intersectionRect: DOMRect,
    public isIntersecting: boolean,
    public rootBounds: DOMRect
  ) {}
}
