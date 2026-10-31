/** Computed lengths are pixels, but some other values may be returned when the element is not rendered. */
function pixels(value: string): number {
  const match = /^(?<number>\d+(?:\.\d+)?)px$/u.exec(value)

  return Number(match?.groups?.number) || 0
}

/** Own a responsive canvas without stretching its previous bitmap during resize. */
export function createCanvas(host: HTMLElement) {
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
  let positionChecked = false

  return {
    canvas,
    resize(box?: Pick<DOMRectReadOnly, "width" | "height">) {
      if (!positionChecked && host.isConnected) {
        if (getComputedStyle(host).position === "static") {
          console.warn(
            "snow() requires a positioned container, for example position: relative.",
            host,
          )
        }

        positionChecked = true
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
    },
  }
}
