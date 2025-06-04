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
      const ownerDocument = root.ownerDocument ?? document;

      this.rootBounds = root.getBoundingClientRect();

      /*
       * Update the root bounds when the target element is resized.
       */
      this.#resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const [{ inlineSize: width, blockSize: height }] =
            entry.borderBoxSize;

          if (Rect.sizeEqual(this.rootBounds, { width, height })) {
            continue;
          }

          const rect = entry.target.getBoundingClientRect();

          this.rootBounds = rect;
          callback(rect, this);
        }
      });
      this.#resizeObserver.observe(root);

      /*
       * Update the root bounds when ancestors of the target element are scrolled.
       */
      ownerDocument.addEventListener(
        "scroll",
        (event) => {
          if (
            event.target &&
            event.target !== root &&
            isNode(event.target) &&
            event.target.contains(root)
          ) {
            this.rootBounds = root.getBoundingClientRect();
            callback(this.rootBounds, this);
          }
        },
        { capture: true, passive: true, signal: this.#controller.signal }
      );
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
   * The resize observer if the root is an element.
   */
  #resizeObserver: ResizeObserver | undefined;

  /**
   * The controller to disconnect the root bounds resize and scroll listeners.
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
    this.#resizeObserver?.disconnect();
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
