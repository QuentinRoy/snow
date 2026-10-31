/** Computed lengths are pixels; non-rendered elements can return "auto". */
function pixels(value: string): number {
  return Number(value.replace(/px$/u, "")) || 0
}

type ContentBox = Pick<DOMRectReadOnly, "width" | "height" | "x" | "y">

/** Own a decorative canvas whose CSS size and bitmap always change together. */
export function createCanvas(container: HTMLElement) {
  if (container.localName === "canvas") {
    throw new TypeError("snow() expects a container, not a canvas.")
  }

  const canvas = container.ownerDocument.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.style.cssText = "all: unset; display: block; pointer-events: none; position: absolute"

  const style = getComputedStyle(container)
  const paddingX = pixels(style.paddingLeft)
  const paddingY = pixels(style.paddingTop)
  let width = pixels(style.width)
  let height = pixels(style.height)

  if (style.boxSizing === "border-box") {
    width -=
      paddingX +
      pixels(style.paddingRight) +
      pixels(style.borderLeftWidth) +
      pixels(style.borderRightWidth)
    height -=
      paddingY +
      pixels(style.paddingBottom) +
      pixels(style.borderTopWidth) +
      pixels(style.borderBottomWidth)
  }

  let box: ContentBox = {
    width: Math.max(0, width),
    height: Math.max(0, height),
    x: paddingX,
    y: paddingY,
  }

  const previousPosition = container.style.getPropertyValue("position")
  const previousPriority = container.style.getPropertyPriority("position")
  const needsPosition = style.position === "static"

  return {
    canvas,
    resize(nextBox: ContentBox = box, devicePixelSize?: ResizeObserverSize) {
      box = nextBox

      const vertical =
        devicePixelSize !== undefined && getComputedStyle(container).writingMode !== "horizontal-tb"

      canvas.style.width = `${box.width}px`
      canvas.style.height = `${box.height}px`
      canvas.style.left = `${box.x}px`
      canvas.style.top = `${box.y}px`
      canvas.width =
        (vertical ? devicePixelSize?.blockSize : devicePixelSize?.inlineSize) ??
        Math.round(box.width * devicePixelRatio)
      canvas.height =
        (vertical ? devicePixelSize?.inlineSize : devicePixelSize?.blockSize) ??
        Math.round(box.height * devicePixelRatio)

      return box
    },
    mount() {
      if (needsPosition) {
        container.style.setProperty("position", "relative")
      }

      container.append(canvas)
    },
    remove() {
      canvas.remove()

      if (
        needsPosition &&
        container.style.getPropertyValue("position") === "relative" &&
        container.style.getPropertyPriority("position") === ""
      ) {
        container.style.setProperty("position", previousPosition, previousPriority)
      }
    },
  }
}
