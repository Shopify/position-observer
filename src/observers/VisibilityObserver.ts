import { Rect } from "../utilities/Rect.ts";
import { threshold } from "../utilities/threshold.ts";

export interface VisibilityObserverInit {
  /**
   * The root element to observe.
   */
  root?: IntersectionObserverInit["root"];
}

/**
 * Provides a way to asynchronously observe changes in the visibility of a target element.
 */
export class VisibilityObserver {
  constructor(
    /**
     * A callback function for the visibility observer.
     *
     * @param entries - The entries of the visibility observer.
     */
    callback: VisibilityObserverCallback,
    /**
     * The options for the visibility observer.
     */
    options?: VisibilityObserverInit
  ) {
    this.#options = options;
    this.#callback = (entries) => {
      const changedEntries: IntersectionObserverEntry[] = [];

      for (const entry of entries) {
        const previousIntersection = this.intersections.get(entry.target);

        this.intersections.set(entry.target, entry);

        if (
          previousIntersection?.isIntersecting !== entry.isIntersecting ||
          !Rect.equals(
            previousIntersection?.intersectionRect,
            entry.intersectionRect
          )
        ) {
          changedEntries.push(entry);
        }
      }

      if (changedEntries.length > 0) {
        callback(changedEntries, this);
      }
    };
  }

  /**
   * The callback function to be invoked when the intersection entries change.
   */
  #callback: IntersectionObserverCallback;

  /**
   * The visibility observer for each document.
   */
  #observers: Map<Document, IntersectionObserver> = new Map();

  /**
   * The options for the visibility observer.
   */
  #options?: IntersectionObserverInit;

  /**
   * The latest intersection entries for the observed elements.
   */
  intersections: WeakMap<Element, IntersectionObserverEntry> = new WeakMap();

  /**
   * Observes an element.
   *
   * @param element - The element to observe.
   */
  public observe(element: Element) {
    const document = element.ownerDocument;
    if (!document) return;

    let observer = this.#observers.get(document);

    if (!observer) {
      observer = new IntersectionObserver(this.#callback, {
        ...this.#options,
        threshold,
      });

      this.#observers.set(document, observer);
    }

    observer.observe(element);
  }

  /**
   * Unobserves an element.
   *
   * @param element - The element to unobserve.
   */
  public unobserve(element: Element) {
    const document = element.ownerDocument;
    if (!document) return;

    const observer = this.#observers.get(document);
    if (!observer) return;

    observer.unobserve(element);
    this.intersections.delete(element);
  }

  /**
   * Disconnects the visibility observer.
   */
  public disconnect() {
    for (const observer of this.#observers.values()) {
      observer.disconnect();
    }

    this.#observers.clear();
  }
}

export type VisibilityObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: VisibilityObserver
) => void;
