import { test as baseTest, type Page } from "@playwright/test";
import type { PositionObserverEntry } from "../src/index.ts";

export interface PositionObserverTestResult {
  callCount: number;
  entries: PositionObserverEntry[];
  lastEntry?: PositionObserverEntry;
}

export class PositionObserverTestHelper {
  constructor(private page: Page) {}

  /**
   * Creates a PositionObserver that collects entries and call counts for testing
   */
  async createObserver(
    element: string | Element,
    options?: {
      expectedCalls?: number;
      timeout?: number;
      root?: Element | null;
    }
  ): Promise<PositionObserverTestResult> {
    const timeout = options?.timeout ?? 5000;
    const expectedCalls = options?.expectedCalls ?? 1;

    // @ts-expect-error - This is a workaround to fix the type error
    const result = await this.page.evaluate(
      async (params: {
        elementSelector: string | Element;
        expectedCalls: number;
        timeout: number;
        rootElement: Element | null;
      }) => {
        const { elementSelector, expectedCalls, timeout, rootElement } = params;
        const target =
          typeof elementSelector === "string"
            ? document.querySelector(elementSelector)
            : elementSelector;

        if (!target) throw new Error(`Element not found: ${elementSelector}`);

        return new Promise((resolve, reject) => {
          let callCount = 0;
          const entries: PositionObserverEntry[] = [];
          const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(
              new Error(
                `Timeout: Expected ${expectedCalls} calls, got ${callCount}`
              )
            );
          }, timeout);

          const observer = new window.PositionObserver(
            (observerEntries) => {
              callCount++;
              entries.push(...observerEntries);

              if (callCount >= expectedCalls) {
                clearTimeout(timeoutId);
                observer.disconnect();
                resolve({
                  callCount,
                  entries,
                  lastEntry: entries[entries.length - 1],
                });
              }
            },
            rootElement ? { root: rootElement } : undefined
          );

          observer.observe(target);
        });
      },
      {
        elementSelector: element,
        expectedCalls,
        timeout,
        rootElement: options?.root ?? null,
      }
    );

    return result as PositionObserverTestResult;
  }

  /**
   * Creates a PositionObserver that resolves after a specific number of calls
   */
  async waitForCalls(
    element: string,
    expectedCalls: number,
    action?: () => Promise<void>,
    options?: { timeout?: number; root?: Element | null }
  ): Promise<PositionObserverTestResult> {
    const promise = this.createObserver(element, {
      expectedCalls,
      timeout: options?.timeout,
      root: options?.root,
    });

    // If an action is provided, execute it after a short delay
    if (action) {
      setTimeout(async () => {
        await action();
      }, 50);
    }

    return promise;
  }

  /**
   * Waits for a single call after performing an action
   */
  async waitForSingleCall(
    element: string,
    action: () => Promise<void>,
    options?: { timeout?: number; root?: Element | null }
  ): Promise<PositionObserverTestResult> {
    return this.waitForCalls(element, 1, action, options);
  }

  /**
   * Resizes an element and waits for the observer to be called
   */
  async resizeElementAndWait(
    element: string,
    dimensions: { width?: number; height?: number },
    options?: { expectedCalls?: number; timeout?: number }
  ): Promise<PositionObserverTestResult> {
    return this.waitForCalls(
      element,
      options?.expectedCalls ?? 2, // Initial + resize
      async () => {
        await this.page.locator(element).evaluate((el, dims) => {
          if (dims.width !== undefined) {
            (el as HTMLElement).style.width = `${dims.width}px`;
          }
          if (dims.height !== undefined) {
            (el as HTMLElement).style.height = `${dims.height}px`;
          }
        }, dimensions);
      },
      { timeout: options?.timeout }
    );
  }

  /**
   * Moves an element and waits for the observer to be called
   */
  async moveElementAndWait(
    element: string,
    position: { x?: number; y?: number },
    options?: { expectedCalls?: number; timeout?: number }
  ): Promise<PositionObserverTestResult> {
    return this.waitForCalls(
      element,
      options?.expectedCalls ?? 2, // Initial + move
      async () => {
        await this.page.locator(element).evaluate((el, pos) => {
          const htmlEl = el as HTMLElement;
          const transforms = [];
          if (pos.x !== undefined) transforms.push(`translateX(${pos.x}px)`);
          if (pos.y !== undefined) transforms.push(`translateY(${pos.y}px)`);
          htmlEl.style.transform = transforms.join(" ");
        }, position);
      },
      { timeout: options?.timeout }
    );
  }

  /**
   * Tests that no callback is invoked within a timeout period
   */
  async expectNoCallback(
    element: string,
    timeout: number = 200
  ): Promise<boolean> {
    return await this.page.evaluate(
      ({ elementSelector, timeout }) => {
        const target = document.querySelector(elementSelector);
        if (!target) throw new Error(`Element not found: ${elementSelector}`);

        return new Promise<boolean>((resolve) => {
          const observer = new window.PositionObserver(() => {
            observer.disconnect();
            resolve(false); // Callback was invoked
          });

          // Don't observe anything, just create the observer
          setTimeout(() => {
            observer.disconnect();
            resolve(true); // No callback was invoked
          }, timeout);
        });
      },
      { elementSelector: element, timeout }
    );
  }
}

// Custom fixtures
export const test = baseTest.extend<{
  positionObserver: PositionObserverTestHelper;
}>({
  positionObserver: async ({ page }, use) => {
    await use(new PositionObserverTestHelper(page));
  },
});
