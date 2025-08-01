---
"position-observer": patch
---

Fixed a bug where observing an element that had previously been observed and unobserved would not trigger the `PositionObserverCallback` when if the position of the element had not changed after it being unobserved.
