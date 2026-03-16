import { PositionObserver } from "position-observer";

window.PositionObserver = PositionObserver;

const targets: NodeListOf<HTMLElement> =
  document.querySelectorAll(".target, h1");
const debugElements = new Map<
  Element,
  {
    intersectionRect: HTMLElement;
    boundingClientRect: HTMLElement;
  }
>();

const root: Element | null = null;

const positionObserver = new PositionObserver(
  (entries) => {
    for (const entry of entries) {
      const { target, rootBounds, isIntersecting } = entry;

      const debuggers = debugElements.get(target) ?? {
        intersectionRect: createDebugElement("intersection"),
        boundingClientRect: createDebugElement("rect"),
      };

      debugElements.set(target, debuggers);

      for (const [key, element] of Object.entries(debuggers)) {
        const rect = entry[key as "intersectionRect" | "boundingClientRect"];
        const { top, width, height, left } = rect;

        element.style.top = `${top - rootBounds.top}px`;
        element.style.left = `${left - rootBounds.left}px`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.hidden = !isIntersecting;
      }
    }

    console.log(entries);
  },
  {
    root,
  }
);

// DVD Screensaver bouncing logic for #target
const targetElement = document.getElementById("target") as HTMLElement;
const appContainer = document.getElementById("app") as HTMLElement;

// DVD screensaver variables
let dvdX = 50; // Starting x position in pixels
let dvdY = 50; // Starting y position in pixels
let dvdVelocityX = 1.5; // Horizontal speed
let dvdVelocityY = 1; // Vertical speed

function animateDVD() {
  if (!targetElement || !appContainer) return;

  // Get container dimensions (accounting for padding)
  const containerRect = appContainer.getBoundingClientRect();
  const containerStyles = window.getComputedStyle(appContainer);
  const paddingLeft = parseFloat(containerStyles.paddingLeft);
  const paddingTop = parseFloat(containerStyles.paddingTop);
  const paddingRight = parseFloat(containerStyles.paddingRight);
  const paddingBottom = parseFloat(containerStyles.paddingBottom);

  const containerWidth = containerRect.width - paddingLeft - paddingRight;
  const containerHeight = containerRect.height - paddingTop - paddingBottom;

  // Get target element dimensions
  const targetRect = targetElement.getBoundingClientRect();
  const targetWidth = targetRect.width;
  const targetHeight = targetRect.height;

  // Update position
  dvdX += dvdVelocityX;
  dvdY += dvdVelocityY;

  // Check for collision with walls and bounce
  if (dvdX <= 0 || dvdX >= containerWidth - targetWidth) {
    dvdVelocityX = -dvdVelocityX;
    dvdX = Math.max(0, Math.min(dvdX, containerWidth - targetWidth));
  }

  if (dvdY <= 0 || dvdY >= containerHeight - targetHeight) {
    dvdVelocityY = -dvdVelocityY;
    dvdY = Math.max(0, Math.min(dvdY, containerHeight - targetHeight));
  }

  // Apply new position
  targetElement.style.left = `${dvdX}px`;
  targetElement.style.top = `${dvdY}px`;

  requestAnimationFrame(animateDVD);
}

if (targetElement && appContainer) {
  // Remove target element from drag/drop functionality
  const filteredTargets = Array.from(targets).filter(
    (target) => target.id !== "target"
  );

  // Set initial position
  targetElement.style.position = "absolute";
  targetElement.style.left = `${dvdX}px`;
  targetElement.style.top = `${dvdY}px`;

  // Start the animation
  animateDVD();

  // Observe the target for position tracking
  positionObserver.observe(targetElement);

  // Setup drag/drop for remaining targets (excluding #target)
  for (const target of filteredTargets) {
    positionObserver.observe(target);

    target.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);

      target.style.cursor = "grabbing";
    });

    target.addEventListener("pointermove", (event) => {
      if (!target.hasPointerCapture(event.pointerId)) return;

      event.preventDefault();

      const style = getComputedStyle(target);
      const [xString, yString] = style.translate.split(" ");
      const currentX = parseFloat(xString);
      const currentY = parseFloat(yString);
      const x = isNaN(currentX) ? 0 : currentX;
      const y = isNaN(currentY) ? 0 : currentY;
      const { movementX, movementY } = event;

      target.style.translate = `${x + movementX}px ${y + movementY}px`;
    });

    target.addEventListener("pointerup", (event) => {
      target.style.cursor = "";
      target.releasePointerCapture(event.pointerId);
    });
  }
} else {
  // Fallback: setup drag/drop for all targets if elements not found
  for (const target of targets) {
    positionObserver.observe(target);

    target.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);

      target.style.cursor = "grabbing";
    });

    target.addEventListener("pointermove", (event) => {
      if (!target.hasPointerCapture(event.pointerId)) return;

      event.preventDefault();

      const style = getComputedStyle(target);
      const [xString, yString] = style.translate.split(" ");
      const currentX = parseFloat(xString);
      const currentY = parseFloat(yString);
      const x = isNaN(currentX) ? 0 : currentX;
      const y = isNaN(currentY) ? 0 : currentY;
      const { movementX, movementY } = event;

      target.style.translate = `${x + movementX}px ${y + movementY}px`;
    });

    target.addEventListener("pointerup", (event) => {
      target.style.cursor = "";
      target.releasePointerCapture(event.pointerId);
    });
  }
}

document.addEventListener("pointerdown", (event) => {
  const { target } = event;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("resize-handle")) return;

  event.preventDefault();
  target.setPointerCapture(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  const { target } = event;
  if (!(target instanceof HTMLElement)) return;
  if (!target.hasPointerCapture(event.pointerId)) return;
  if (!target.classList.contains("resize-handle")) return;

  event.preventDefault();

  const element = Array.from(debugElements.entries()).find(
    ([, { boundingClientRect }]) => boundingClientRect.contains(target)
  )?.[0];

  if (!(element instanceof HTMLElement)) return;

  const { movementX, movementY } = event;
  const style = getComputedStyle(element);
  const [xString, yString] = style.scale.split(" ");
  const currentX = parseFloat(xString);
  const currentY = parseFloat(yString);
  const x = isNaN(currentX) ? 1 : currentX;
  const y = isNaN(currentY) ? 1 : currentY;

  element.style.scale = `${x + movementX / 150} ${y + movementY / 150}`;
});

document.addEventListener("pointerup", (event) => {
  const { target } = event;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("resize-handle")) return;

  target.releasePointerCapture(event.pointerId);
});

function createDebugElement(name: string) {
  const element = document.createElement("div");
  element.classList.add("debug");
  element.classList.add(`debug--${name}`);

  if (name === "rect") {
    const resizeHandle = document.createElement("img");
    resizeHandle.src = `${import.meta.env.BASE_URL}resize-handle.svg`;
    resizeHandle.classList.add("resize-handle");
    element.append(resizeHandle);
  }

  document.body.append(element);
  return element;
}
