import { PositionObserver } from "../PositionObserver.ts";
import { Rect } from "../utilities/Rect.ts";

type Root = Document | Element;

export type RootObserverCallback = (
  rootBounds: DOMRectReadOnly,
  observer: RootBoundsObserver
) => void;

/**
 * Provides a way to asynchronously observe changes in the bounds of the root element.
 */
export class RootBoundsObserver {
  /**
   * Creates a new root bounds observer.
   *
   * @param root - The root element to observe.
   * @param callback - The callback function to call when the root bounds change.
   */
  constructor(target: Root | null | undefined, callback: RootObserverCallback) {
    const root = getRoot(target);

    if (isElement(root)) {
      this.rootBounds = root.getBoundingClientRect();

      /*
       * Use a PositionObserver (with no root option, i.e. observing against the viewport)
       * to track root element position changes. This covers resize, scroll, AND
       * CSS transform changes on ancestors — fixing stale rootBounds when an
       * ancestor uses transform: translate() (e.g. canvas panning).
       */
      this.#positionObserver = new PositionObserver((entries) => {
        for (const entry of entries) {
          this.rootBounds = entry.boundingClientRect;
          callback(entry.boundingClientRect, this);
        }
      });
      this.#positionObserver.observe(root);
    } else {
      const viewport = root.visualViewport ?? root;

      this.rootBounds = getWindowRect(root);

      /*
       * Update the root bounds when the viewport is resized.
       */
      const handleResize = () => {
        const rect = getWindowRect(root);
        if (Rect.equals(this.rootBounds, rect)) return;

        this.rootBounds = rect;
        callback(rect, this);
      };
      viewport.addEventListener("resize", handleResize, {
        signal: this.#controller.signal,
      });
    }
  }

  /**
   * The position observer if the root is an element.
   */
  #positionObserver: PositionObserver | undefined;

  /**
   * The controller to disconnect the viewport resize listener.
   */
  #controller: AbortController = new AbortController();

  /**
   * The bounds of the root element.
   */
  rootBounds: DOMRect;

  /**
   * Disconnects the root bounds observer.
   */
  public disconnect() {
    this.#positionObserver?.disconnect();
    this.#controller.abort();
  }
}

function getWindowRect(window: Window & typeof globalThis): DOMRect {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;

  return new DOMRect(0, 0, width, height);
}

function isNode(target: EventTarget): target is Node {
  return "nodeType" in target;
}

function isElement(target: EventTarget): target is Element {
  return isNode(target) && target.nodeType === Node.ELEMENT_NODE;
}

function isDocument(root: Node): root is Document {
  return root.nodeType === Node.DOCUMENT_NODE;
}

function getRoot(target: Document | Element | null | undefined) {
  return !target || isDocument(target)
    ? (target?.defaultView ?? window)
    : target;
}
