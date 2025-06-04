declare global {
  interface Window {
    PositionObserver: typeof import("./src/index.ts").PositionObserver;
  }
}

export {};
