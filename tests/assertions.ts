import { expect as baseExpect } from "@playwright/test";
import type { PositionObserverTestResult } from "./fixtures.ts";
import type { PositionObserverEntry } from "../src/index.ts";

// Extend Playwright's expect with custom matchers
export const expect = baseExpect.extend({
  toHaveBeenCalledTimes(
    received: PositionObserverTestResult,
    expected: number
  ) {
    const pass = received.callCount === expected;
    return {
      message: () =>
        `Expected observer to have been called ${expected} times, but it was called ${received.callCount} times`,
      pass,
    };
  },

  toHaveEntries(received: PositionObserverTestResult, expected: number) {
    const pass = received.entries.length === expected;
    return {
      message: () =>
        `Expected observer to have ${expected} entries, but it has ${received.entries.length} entries`,
      pass,
    };
  },

  toHaveLastEntryWithDimensions(
    received: PositionObserverTestResult,
    expected: { width?: number; height?: number }
  ) {
    if (!received.lastEntry) {
      return {
        message: () =>
          "Expected observer to have a last entry, but it has none",
        pass: false,
      };
    }

    const { lastEntry } = received;
    const { boundingClientRect } = lastEntry;

    let pass = true;
    const mismatches: string[] = [];

    if (
      expected.width !== undefined &&
      boundingClientRect.width !== expected.width
    ) {
      pass = false;
      mismatches.push(
        `width: expected ${expected.width}, got ${boundingClientRect.width}`
      );
    }

    if (
      expected.height !== undefined &&
      boundingClientRect.height !== expected.height
    ) {
      pass = false;
      mismatches.push(
        `height: expected ${expected.height}, got ${boundingClientRect.height}`
      );
    }

    return {
      message: () =>
        pass
          ? `Expected last entry to not have dimensions ${JSON.stringify(expected)}`
          : `Expected last entry to have dimensions matching ${JSON.stringify(expected)}, but found mismatches: ${mismatches.join(", ")}`,
      pass,
    };
  },

  toHaveLastEntryWithPosition(
    received: PositionObserverTestResult,
    expected: { x?: number; y?: number }
  ) {
    if (!received.lastEntry) {
      return {
        message: () =>
          "Expected observer to have a last entry, but it has none",
        pass: false,
      };
    }

    const { lastEntry } = received;
    const { boundingClientRect } = lastEntry;

    let pass = true;
    const mismatches: string[] = [];

    if (expected.x !== undefined && boundingClientRect.left !== expected.x) {
      pass = false;
      mismatches.push(
        `x: expected ${expected.x}, got ${boundingClientRect.left}`
      );
    }

    if (expected.y !== undefined && boundingClientRect.top !== expected.y) {
      pass = false;
      mismatches.push(
        `y: expected ${expected.y}, got ${boundingClientRect.top}`
      );
    }

    return {
      message: () =>
        pass
          ? `Expected last entry to not have position ${JSON.stringify(expected)}`
          : `Expected last entry to have position matching ${JSON.stringify(expected)}, but found mismatches: ${mismatches.join(", ")}`,
      pass,
    };
  },

  toBeIntersecting(received: PositionObserverTestResult) {
    if (!received.lastEntry) {
      return {
        message: () =>
          "Expected observer to have a last entry, but it has none",
        pass: false,
      };
    }

    const pass = received.lastEntry.isIntersecting;
    return {
      message: () =>
        pass
          ? "Expected last entry to not be intersecting"
          : "Expected last entry to be intersecting",
      pass,
    };
  },

  toHaveAllEntriesIntersecting(received: PositionObserverTestResult) {
    const allIntersecting = received.entries.every(
      (entry: PositionObserverEntry) => entry.isIntersecting
    );
    return {
      message: () =>
        allIntersecting
          ? "Expected not all entries to be intersecting"
          : "Expected all entries to be intersecting",
      pass: allIntersecting,
    };
  },

  toHaveDifferentDimensionsBetweenEntries(
    received: PositionObserverTestResult,
    firstIndex: number = 0,
    secondIndex: number = 1
  ) {
    if (received.entries.length <= Math.max(firstIndex, secondIndex)) {
      return {
        message: () =>
          `Expected at least ${Math.max(firstIndex, secondIndex) + 1} entries, but got ${received.entries.length}`,
        pass: false,
      };
    }

    const first = received.entries[firstIndex].boundingClientRect;
    const second = received.entries[secondIndex].boundingClientRect;

    const widthDifferent = first.width !== second.width;
    const heightDifferent = first.height !== second.height;
    const pass = widthDifferent || heightDifferent;

    return {
      message: () =>
        pass
          ? `Expected entries ${firstIndex} and ${secondIndex} to have same dimensions`
          : `Expected entries ${firstIndex} and ${secondIndex} to have different dimensions, but they are the same (${first.width}x${first.height})`,
      pass,
    };
  },

  toHaveDifferentPositionsBetweenEntries(
    received: PositionObserverTestResult,
    firstIndex: number = 0,
    secondIndex: number = 1
  ) {
    if (received.entries.length <= Math.max(firstIndex, secondIndex)) {
      return {
        message: () =>
          `Expected at least ${Math.max(firstIndex, secondIndex) + 1} entries, but got ${received.entries.length}`,
        pass: false,
      };
    }

    const first = received.entries[firstIndex].boundingClientRect;
    const second = received.entries[secondIndex].boundingClientRect;

    const xDifferent = first.left !== second.left;
    const yDifferent = first.top !== second.top;
    const pass = xDifferent || yDifferent;

    return {
      message: () =>
        pass
          ? `Expected entries ${firstIndex} and ${secondIndex} to have same positions`
          : `Expected entries ${firstIndex} and ${secondIndex} to have different positions, but they are the same (${first.left}, ${first.top})`,
      pass,
    };
  },
});
