import { test } from "./fixtures.ts";
import { expect } from "./assertions.ts";

test.describe("PositionObserver", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:8000/`);
  });

  test("does not invoke the callback on initialization if no elements are observed", async ({
    positionObserver,
  }) => {
    const noCallback = await positionObserver.expectNoCallback("#target");
    expect(noCallback).toBe(true);
  });

  test("should report the position of an element when initialized", async ({
    positionObserver,
    page,
  }) => {
    const result = await positionObserver.createObserver("#target", {
      expectedCalls: 1,
    });

    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveEntries(1);
    expect(result).toBeIntersecting();

    const boundingBox = await page.locator("#target").boundingBox();
    if (boundingBox) {
      expect(result).toHaveLastEntryWithDimensions({
        width: boundingBox.width,
        height: boundingBox.height,
      });
    }
  });

  test("should invoke the callback when element size changes", async ({
    positionObserver,
  }) => {
    const result = await positionObserver.resizeElementAndWait("#target", {
      width: 200,
      height: 150,
    });

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveEntries(2);
    expect(result).toHaveAllEntriesIntersecting();
    expect(result).toHaveLastEntryWithDimensions({ width: 200, height: 150 });
    expect(result).toHaveDifferentDimensionsBetweenEntries();
  });

  test("should invoke the callback when element is moved", async ({
    positionObserver,
  }) => {
    const result = await positionObserver.moveElementAndWait("#target", {
      x: 100,
      y: 50,
    });

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveDifferentPositionsBetweenEntries();

    // Check that the element moved by the expected amount
    const firstEntry = result.entries[0];
    const lastEntry = result.entries[1];
    const deltaX =
      lastEntry.boundingClientRect.left - firstEntry.boundingClientRect.left;
    const deltaY =
      lastEntry.boundingClientRect.top - firstEntry.boundingClientRect.top;

    expect(deltaX).toBe(100);
    expect(deltaY).toBe(50);
  });

  test("should handle rapid consecutive changes", async ({
    positionObserver,
    page,
  }) => {
    const resultPromise = positionObserver.createObserver("#target", {
      expectedCalls: 3, // initial + changes (some may be batched)
      timeout: 10000,
    });

    // Make changes sequentially after a delay
    await page.waitForTimeout(100);
    
    const locator = page.locator("#target");
    await locator.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.width = "150px";
    });
    
    await page.waitForTimeout(200);
    
    await locator.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.height = "120px";
    });
    
    await page.waitForTimeout(200);
    
    await locator.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.transform = "translateX(50px)";
    });

    const result = await resultPromise;

    expect(result).toHaveBeenCalledTimes(3);
    expect(result).toHaveEntries(3);
    expect(result).toHaveAllEntriesIntersecting();
  });

  test("should detect when element moves outside viewport", async ({
    positionObserver,
  }) => {
    const result = await positionObserver.moveElementAndWait("#target", {
      x: 2000, // Move far to the right, outside viewport
      y: 0,
    });

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveDifferentPositionsBetweenEntries();

    // First entry should be intersecting, second should not
    expect(result.entries[0].isIntersecting).toBe(true);
    expect(result.entries[1].isIntersecting).toBe(false);
  });

  test("should handle element visibility changes", async ({
    positionObserver,
    page,
  }) => {
    const resultPromise = positionObserver.createObserver("#target", {
      expectedCalls: 3, // initial + hide + show
      timeout: 10000, // Increase timeout
    });

    setTimeout(async () => {
      // Move element far out of view (more reliable than display:none)
      await page.locator("#target").evaluate((el: Element) => {
        (el as HTMLElement).style.transform = "translateX(-9999px)";
      });

      setTimeout(async () => {
        // Move element back into view
        await page.locator("#target").evaluate((el: Element) => {
          (el as HTMLElement).style.transform = "translateX(0px)";
        });
      }, 100);
    }, 50);

    const result = await resultPromise;

    expect(result).toHaveBeenCalledTimes(3);
    expect(result).toHaveEntries(3);

    // Check intersection states: visible -> hidden -> visible
    expect(result.entries[0].isIntersecting).toBe(true);
    expect(result.entries[1].isIntersecting).toBe(false);
    expect(result.entries[2].isIntersecting).toBe(true);
  });

  test("should handle observer disconnect", async ({
    positionObserver,
    page,
  }) => {
    // Create observer and get initial call
    const result = await positionObserver.createObserver("#target", {
      expectedCalls: 1,
    });

    expect(result).toHaveBeenCalledTimes(1);

    // Now verify no more callbacks after changes
    const noCallback = await page.evaluate(() => {
      const target = document.querySelector("#target");
      if (!target) throw new Error("Element not found");

      return new Promise<boolean>((resolve) => {
        let callbackInvoked = false;

        const observer = new window.PositionObserver(() => {
          callbackInvoked = true;
        });

        observer.observe(target);
        observer.disconnect(); // Disconnect immediately

        // Make a change that would normally trigger callback
        (target as HTMLElement).style.width = "300px";

        setTimeout(() => {
          resolve(!callbackInvoked); // Should be true (no callback)
        }, 200);
      });
    });

    expect(noCallback).toBe(true);
  });

  test("should handle viewport resize", async ({
    positionObserver,
    page,
    browserName,
  }) => {
    const resultPromise = positionObserver.createObserver("#target", {
      expectedCalls: 2, // initial + viewport resize
    });

    setTimeout(async () => {
      // Resize the viewport
      await page.setViewportSize({ width: 800, height: 400 });
    }, 50);

    const result = await resultPromise;

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveEntries(2);

    // Root bounds should be different
    const firstRootBounds = result.entries[0].rootBounds;
    const secondRootBounds = result.entries[1].rootBounds;

    // Firefox sometimes has undefined rootBounds on viewport resize
    if (browserName === "firefox" && !secondRootBounds) {
      return;
    }

    expect(firstRootBounds.width).not.toBe(secondRootBounds.width);
    expect(secondRootBounds.width).toBe(800);
    expect(secondRootBounds.height).toBe(400);
  });

  test("should handle element scaling up", async ({
    positionObserver,
    page,
  }) => {
    const result = await positionObserver.waitForCalls(
      "#target",
      2, // initial + scale
      async () => {
        await page.locator("#target").evaluate((el: Element) => {
          (el as HTMLElement).style.transform = "scale(1.5)";
        });
      }
    );

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveDifferentDimensionsBetweenEntries();

    // Element should be larger after scaling
    const firstEntry = result.entries[0];
    const lastEntry = result.entries[1];

    expect(lastEntry.boundingClientRect.width).toBeCloseTo(
      firstEntry.boundingClientRect.width * 1.5
    );
    expect(lastEntry.boundingClientRect.height).toBeCloseTo(
      firstEntry.boundingClientRect.height * 1.5
    );
  });

  test("should handle element scaling down", async ({
    positionObserver,
    page,
  }) => {
    const result = await positionObserver.waitForCalls(
      "#target",
      2, // initial + scale
      async () => {
        await page.locator("#target").evaluate((el: Element) => {
          (el as HTMLElement).style.transform = "scale(0.5)";
        });
      }
    );

    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveDifferentDimensionsBetweenEntries();

    // Element should be larger after scaling
    const firstEntry = result.entries[0];
    const lastEntry = result.entries[1];

    expect(lastEntry.boundingClientRect.width).toBeCloseTo(
      firstEntry.boundingClientRect.width / 2
    );
    expect(lastEntry.boundingClientRect.height).toBeCloseTo(
      firstEntry.boundingClientRect.height / 2
    );
  });

  test("should trigger callback when re-observing previously unobserved element with same position", async ({
    positionObserver,
    page,
  }) => {
    // First observation
    const firstResult = await positionObserver.createObserver("#target", {
      expectedCalls: 1,
    });

    expect(firstResult).toHaveBeenCalledTimes(1);
    expect(firstResult).toHaveEntries(1);

    // Unobserve and immediately re-observe without changing position
    const reObserveResult = await page.evaluate(() => {
      const target = document.querySelector("#target");
      if (!target) throw new Error("Element not found");

      return new Promise<{entries: any[], callCount: number}>((resolve) => {
        let callCount = 0;
        const entries: any[] = [];

        const observer = new window.PositionObserver((observerEntries) => {
          callCount++;
          entries.push(...observerEntries);
        });

        // Initial observation
        observer.observe(target);
        
        setTimeout(() => {
          // Unobserve the element
          observer.unobserve(target);
          
          // Re-observe immediately without position change
          observer.observe(target);
          
          setTimeout(() => {
            resolve({ entries, callCount });
          }, 100);
        }, 50);
      });
    });

    // Should get callback for initial observation AND re-observation
    expect(reObserveResult.callCount).toBe(2);
    expect(reObserveResult.entries).toHaveLength(2);
    
    // Both entries should have the same position since element didn't move
    const [firstEntry, secondEntry] = reObserveResult.entries;
    expect(firstEntry.boundingClientRect.left).toBe(secondEntry.boundingClientRect.left);
    expect(firstEntry.boundingClientRect.top).toBe(secondEntry.boundingClientRect.top);
  });

  test("should clear all position observers when disconnected", async ({
    positionObserver,
    page,
  }) => {
    // Create multiple elements to observe
    await page.evaluate(() => {
      const container = document.body;
      
      // Create additional test elements
      const element1 = document.createElement("div");
      element1.id = "test-element-1";
      element1.style.cssText = "width: 100px; height: 100px; background: red; position: absolute; top: 100px; left: 100px;";
      
      const element2 = document.createElement("div");
      element2.id = "test-element-2";
      element2.style.cssText = "width: 100px; height: 100px; background: blue; position: absolute; top: 200px; left: 200px;";
      
      container.appendChild(element1);
      container.appendChild(element2);
    });

    // Observe multiple elements and then disconnect
    const result = await page.evaluate(() => {
      const target = document.querySelector("#target");
      const element1 = document.querySelector("#test-element-1");
      const element2 = document.querySelector("#test-element-2");
      
      if (!target || !element1 || !element2) throw new Error("Elements not found");

      return new Promise<{initialCallCount: number, postDisconnectCallCount: number}>((resolve) => {
        let initialCallCount = 0;
        let postDisconnectCallCount = 0;

        const observer = new window.PositionObserver(() => {
          if (initialCallCount < 3) {
            initialCallCount++;
          } else {
            postDisconnectCallCount++;
          }
        });

        // Observe all elements
        observer.observe(target);
        observer.observe(element1);
        observer.observe(element2);

        setTimeout(() => {
          // Disconnect observer
          observer.disconnect();
          
          // Try to trigger changes after disconnect - should not invoke callback
          (target as HTMLElement).style.width = "200px";
          (element1 as HTMLElement).style.width = "200px";
          (element2 as HTMLElement).style.width = "200px";
          
          setTimeout(() => {
            resolve({ initialCallCount, postDisconnectCallCount });
          }, 100);
        }, 100);
      });
    });

    // Should get initial callback (batched for all 3 elements) but no callbacks after disconnect
    expect(result.initialCallCount).toBe(1);
    expect(result.postDisconnectCallCount).toBe(0);

    // Clean up test elements
    await page.evaluate(() => {
      document.getElementById("test-element-1")?.remove();
      document.getElementById("test-element-2")?.remove();
    });
  });
});
