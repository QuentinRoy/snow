/** Computed lengths are pixels; non-rendered elements can return "auto". */
function pixels(value: string): number {
  return Number(value.replace(/px$/u, "")) || 0
}

/** Own a responsive canvas without stretching its previous bitmap during resize. */
export function createCanvas(container: HTMLElement) {
  if (container.localName === "canvas") {
    throw new TypeError("snow() expects a container, not a canvas.")
  }

  const canvas = container.ownerDocument.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.style.cssText = `
    all: unset;
    display: block;
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
    object-fit: none;
    object-position: 0 0;
    overflow: clip;
    transform-origin: 0 0;
  `
  let pixelRatio = 0

  return {
    canvas,
    resize(box?: Pick<DOMRectReadOnly, "width" | "height">) {
      const observedRatio = pixelRatio

      if (pixelRatio !== devicePixelRatio) {
        pixelRatio = devicePixelRatio
        // The CSS box uses bitmap pixels. Scale it back to CSS pixels while object-fit:none
        // keeps the previous bitmap unscaled until the resize observer redraws it.
        canvas.style.width = `${100 * pixelRatio}%`
        canvas.style.height = `${100 * pixelRatio}%`
        canvas.style.transform = `scale(${1 / pixelRatio})`
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
    mount() {
      container.append(canvas)
    },
    remove() {
      canvas.remove()
    },
  }
}
