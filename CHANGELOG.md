# position-observer

## 1.0.2

### Patch Changes

- a9315f9: Fixed a bug where `intersectionRect` in `PositionObserverEntry` could sometimes be an object instead of an instance of `DOMRect`.

## 1.0.1

### Patch Changes

- 7c2459a: Fixed a bug where observing an element that had previously been observed and unobserved would not trigger the `PositionObserverCallback` when if the position of the element had not changed after it being unobserved.

## 1.0.0

### Major Changes

Initial release
