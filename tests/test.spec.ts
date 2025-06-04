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

    // Much cleaner assertions
    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveEntries(1);
    expect(result).toBeIntersecting();

    // Verify against actual element dimensions
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
    // This replaces ~40 lines of complex Promise-based code!
    const result = await positionObserver.resizeElementAndWait("#target", {
      width: 200,
      height: 150,
    });

    // Clean, readable assertions
    expect(result).toHaveBeenCalledTimes(2);
    expect(result).toHaveEntries(2);
    expect(result).toHaveAllEntriesIntersecting();
    expect(result).toHaveLastEntryWithDimensions({ width: 200, height: 150 });
    expect(result).toHaveDifferentDimensionsBetweenEntries();
  });

  // Additional test scenarios made easy
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
      expectedCalls: 4, // initial + 3 changes
    });

    // Perform rapid changes
    setTimeout(async () => {
      const locator = page.locator("#target");
      await locator.evaluate((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.width = "150px";
      });

      setTimeout(async () => {
        await locator.evaluate((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.height = "120px";
        });

        setTimeout(async () => {
          await locator.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.transform = "translateX(50px)";
          });
        }, 50);
      }, 50);
    }, 50);

    const result = await resultPromise;

    expect(result).toHaveBeenCalledTimes(4);
    expect(result).toHaveEntries(4);
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
});
