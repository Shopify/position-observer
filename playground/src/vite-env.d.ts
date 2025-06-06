/// <reference types="vite/client" />

import type { PositionObserver } from "position-observer";

declare global {
  interface Window {
    PositionObserver: typeof PositionObserver;
  }
}

export {};
