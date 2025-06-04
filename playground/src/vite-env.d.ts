/// <reference types="vite/client" />

import type { PositionObserver } from "positionobserver";

declare global {
  interface Window {
    PositionObserver: typeof PositionObserver;
  }
}

export {};
