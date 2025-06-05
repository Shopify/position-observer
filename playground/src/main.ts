import { PositionObserver } from "positionobserver";

window.PositionObserver = PositionObserver;

const targets: NodeListOf<HTMLElement> = document.querySelectorAll(".target");
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
    resizeHandle.src = "/resize-handle.svg";
    resizeHandle.classList.add("resize-handle");
    element.append(resizeHandle);
  }

  document.body.append(element);
  return element;
}
