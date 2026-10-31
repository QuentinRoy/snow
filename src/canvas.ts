const positions = new WeakMap<
  HTMLElement,
  { count: number; value: string; priority: string; appliedPriority: string }
>()

/** Keep automatic positioning until the last animation releases this container. */
function positionContainer(container: HTMLElement): (() => void) | undefined {
  let position = positions.get(container)

  if (position === undefined) {
    if (getComputedStyle(container).position !== "static") {
      return undefined
    }

    const { style } = container
    position = {
      count: 0,
      value: style.position,
      priority: style.getPropertyPriority("position"),
      appliedPriority: "",
    }
    style.position = "relative"

    if (getComputedStyle(container).position === "static") {
      style.setProperty("position", "relative", "important")
    }

    position.appliedPriority = style.getPropertyPriority("position")
    positions.set(container, position)
  }

  const active = position
  active.count += 1

  return () => {
    active.count -= 1

    if (active.count !== 0) {
      return
    }

    positions.delete(container)
    const { style } = container

    if (
      style.position === "relative" &&
      style.getPropertyPriority("position") === active.appliedPriority
    ) {
      style.setProperty("position", active.value, active.priority)
    }
  }
}

/** Computed lengths are pixels; non-rendered elements can return "auto". */
function pixels(value: string): number {
  return Number(value.replace(/px$/u, "")) || 0
}

/** Own a responsive canvas without stretching its previous bitmap during resize. */
export function createCanvas(host: HTMLElement) {
  if (host.localName === "canvas") {
    throw new TypeError("snow() expects a container, not a canvas.")
  }

  const canvas = host.ownerDocument.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  Object.assign(canvas.style, {
    all: "unset",
    display: "block",
    pointerEvents: "none",
    position: "absolute",
    left: 0,
    top: 0,
    objectFit: "none",
    objectPosition: "0 0",
    overflow: "clip",
    transformOrigin: "0 0",
  })
  let pixelRatio = 0
  let releasePosition: (() => void) | undefined
  let needsPositioning = true

  return {
    canvas,
    get needsPositioning() {
      return needsPositioning
    },
    resize(box?: Pick<DOMRectReadOnly, "width" | "height">) {
      if (needsPositioning && host.isConnected) {
        releasePosition = positionContainer(host)
        needsPositioning = false
      }

      const observedRatio = pixelRatio

      if (pixelRatio !== devicePixelRatio) {
        pixelRatio = devicePixelRatio
        // The CSS box uses bitmap pixels. Scale it back to CSS pixels while object-fit:none
        // keeps the previous bitmap unscaled until the resize observer redraws it.
        Object.assign(canvas.style, {
          width: `${100 * pixelRatio}%`,
          height: `${100 * pixelRatio}%`,
          transform: `scale(${1 / pixelRatio})`,
        })
      }

      let width: number
      let height: number

      if (box === undefined) {
        const style = getComputedStyle(canvas)
        width = pixels(style.width) / pixelRatio
        height = pixels(style.height) / pixelRatio
      } else {
        // An entry describes the CSS box at the ratio applied when it was measured.
        width = box.width / observedRatio
        height = box.height / observedRatio
      }

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)

      return { width, height }
    },
    remove() {
      canvas.remove()
      releasePosition?.()
      releasePosition = undefined
    },
  }
}
