# PositionObserver

The PositionObserver interface provides an asynchronous way to observe changes in the position, size, and intersection state of elements relative to their containing root element.

## Overview

PositionObserver asynchronously monitors changes to element positioning, sizing, and visibility within a specified root container or the viewport. It extends the functionality of the native IntersectionObserver API, and provides detailed position and size information whenever these properties change.

The underlying implementation avoids polling mechanisms and optimizes performance by minimizing calls to `getBoundingClientRect()`, relying instead on a combination of native browser observation APIs.

### Key capabilities

- Observes element position changes within the viewport or custom root containers
- Detects element size modifications, including changes due to CSS transformations
- Monitors intersection state between observed elements and their root container
- Detects changes to the position of an element when the viewport or root resizes

## Installation

```bash
npm install position-observer
```

## Constructor

```js
new PositionObserver(callback, options?)
```

### Parameters

- **callback** - A function called when position changes are detected

  ```typescript
  (entries: PositionObserverEntry[]) => void
  ```

- **options** _(optional)_ - Configuration object
  ```typescript
  {
    root?: Element | Document | null;
  }
  ```

### Return value

A new PositionObserver instance.

## Instance methods

### observe()

Begins observing position changes for the specified element.

```js
observer.observe(target);
```

#### Parameters

- **target** - The Element to observe for position changes.

### unobserve()

Stops observing position changes for the specified element.

```js
observer.unobserve(target);
```

#### Parameters

- **target** - The Element to stop observing.

### disconnect()

Stops observing all target elements and releases all references.

```js
observer.disconnect();
```

## PositionObserverEntry

Represents a single observation result containing geometric information about an observed element.

### Properties

- **target** (Element) - The observed element
- **boundingClientRect** (DOMRectReadOnly) - The element's current position and dimensions
- **intersectionRect** (DOMRectReadOnly) - The visible portion of the element within the root
- **isIntersecting** (boolean) - Whether the element intersects with the root
- **rootBounds** (DOMRectReadOnly) - The root container's dimensions

## Examples

### Basic usage

```js
import { PositionObserver } from "position-observer";

const observer = new PositionObserver((entries) => {
  entries.forEach((entry) => {
    console.log("Element:", entry.target);
    console.log("Position:", entry.boundingClientRect);
    console.log("Is intersecting:", entry.isIntersecting);
    console.log("Intersection area:", entry.intersectionRect);
  });
});

const element = document.querySelector("#my-element");
observer.observe(element);
```

### Position tracking

```js
import { PositionObserver } from "position-observer";

const observer = new PositionObserver((entries) => {
  entries.forEach((entry) => {
    const { target, boundingClientRect, isIntersecting } = entry;

    if (isIntersecting) {
      console.log(`${target.id} position:`, {
        x: boundingClientRect.left,
        y: boundingClientRect.top,
        width: boundingClientRect.width,
        height: boundingClientRect.height,
      });
    }
  });
});

document.querySelectorAll(".tracked-elements").forEach((el) => {
  observer.observe(el);
});
```

### Custom root container

```typescript
const container = document.querySelector("#scroll-container");

const observer = new PositionObserver(
  (entries) => {
    entries.forEach((entry) => {
      console.log("Position within container:", entry.intersectionRect);
    });
  },
  { root: container }
);

observer.observe(document.querySelector("#item-in-container"));
```

## Limitations

### Visibility within the root

PositionObserver only triggers callbacks for elements that intersect with the root container. Position changes that occur while an element is completely outside the root bounds will not be detected until the element re-enters the observable area.

### Precision of small position changes

PositionObserver may not detect very small position changes (approximately 1 pixel or less) due to the threshold-based nature of the underlying IntersectionObserver API. The detection sensitivity is influenced by the relative size of the observed element and its root container.

## Development

Clone the repository and install dependencies:

```bash
npm install
```

### Project structure

```
position-observer/
├── src/                    # Source code
│   ├── PositionObserver.ts # Main PositionObserver class
│   ├── observers/          # Internal observer implementations
│   ├── utilities/          # Helper functions and utilities
│   └── index.ts           # Public API exports
├── tests/                  # Test suite
│   ├── fixtures.ts        # Test utilities and helpers
│   ├── assertions.ts      # Custom test assertions
│   └── test.spec.ts       # Test specifications
├── playground/            # Interactive development environment
├── dist/                  # Built output (generated)
└── package.json          # Project configuration
```

### Available scripts

#### Building

```bash
# Build for production
npm run build

# Build in watch mode for development
npm run dev
```

#### Development

```bash
# Start both build watcher and playground
npm start

# Start only the playground development server
npm run dev:playground

# Lint and fix code style
npm run lint
```

### Testing

The test suite uses Playwright for cross-browser testing and includes comprehensive coverage of PositionObserver functionality.

#### Running tests

```bash
# Run all tests across all browsers
npm test

# Run tests with interactive UI
npm run test:ui
```

## Acknowledgements

- [@samthor](https://github.com/samthor) for earlier exploration of position observation techniques using IntersectionObserver: https://samthor.au/2021/observing-dom/
- [@runjuu](https://github.com/runjuu) for transferring ownership of the `position-observer` package name on npm.

## License

MIT License, refer to [LICENSE.md](./LICENSE.md)
