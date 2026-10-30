import {
  WithAttributeProps,
  boolean,
  number,
  pickList,
  string,
} from "@quentinroy/custom-element-mixins"
import type { AttributeSerializer } from "@quentinroy/custom-element-mixins"
import { snow } from "./snow"
import type { SnowAnimation, SnowOptions } from "./snow"

const defaultWidth = 300
const defaultHeight = 150

/** A finite number; blank, malformed and non-finite attributes fall back to the default. */
function finiteNumber(fallback: number): AttributeSerializer<unknown, number> {
  return number({ default: fallback, finite: true, rejectEmpty: true })
}

/** Like `finiteNumber`, but negative values fall back to the default too. */
function nonNegativeNumber(fallback: number): AttributeSerializer<unknown, number> {
  const { parse, serialize } = finiteNumber(fallback)

  return {
    parse(value) {
      const parsed = parse.call(this, value)

      return parsed < 0 ? fallback : parsed
    },
    serialize,
  }
}

// The core options the element forwards as they are.
const optionNames = [
  "density",
  "fillMode",
  "flakeColor",
  "flakeDirection",
  "flakeDirectionDeviation",
  "flakeSize",
  "flakeSizeDeviation",
  "flakeSpeed",
  "flakeSpeedDeviation",
  "showFps",
] as const satisfies readonly (keyof SnowOptions)[]

const elementOnlyNames = ["height", "width"] as const

const SnowElementBase = WithAttributeProps(HTMLElement, {
  density: nonNegativeNumber(30),
  fillMode: pickList({ default: "instant", values: ["instant", "none"] }),
  flakeColor: string({ default: "rgba(255,255,255,0.9)" }),
  flakeDirection: finiteNumber(0),
  flakeDirectionDeviation: finiteNumber(5),
  flakeSize: finiteNumber(10),
  flakeSizeDeviation: finiteNumber(2),
  flakeSpeed: finiteNumber(150),
  flakeSpeedDeviation: finiteNumber(10),
  height: nonNegativeNumber(defaultHeight),
  showFps: boolean(),
  width: nonNegativeNumber(defaultWidth),
})

/** Snowfall drawn on a canvas inside an open shadow root. */
export class SnowElement extends SnowElementBase {
  static get observedAttributes(): string[] {
    return [...optionNames, ...elementOnlyNames].map((name) =>
      name
        .split(/(?=[A-Z])/u)
        .join("-")
        .toLowerCase(),
    )
  }

  readonly #canvas = document.createElement("canvas")
  readonly #style = document.createElement("style")
  #animation: SnowAnimation | undefined

  constructor() {
    super()
    this.#canvas.setAttribute("aria-hidden", "true")
    this.attachShadow({ mode: "open" }).append(this.#style, this.#canvas)
    this.#updateStyle()
  }

  attributeChangedCallback(): void {
    this.#updateStyle()
    this.#syncAnimation()
  }

  connectedCallback(): void {
    this.#animation ??= snow(this.#canvas, this.#readOptions())
  }

  #readOptions(): SnowOptions {
    return Object.fromEntries(optionNames.map((name) => [name, this[name]]))
  }

  #syncAnimation(): void {
    if (this.#animation !== undefined) {
      Object.assign(this.#animation, this.#readOptions())
    }
  }

  /**
   * The size is only a default and an aspect ratio, so page CSS can override it like it can for an
   * `<img>`. `contain: size` stops the canvas from sizing the element. The core resizes the canvas
   * bitmap to fit the element, so without it the two would keep changing each other.
   */
  #updateStyle(): void {
    const { height, width } = this
    this.#style.textContent = `
      :host {
        aspect-ratio: ${width} / ${height};
        contain: size;
        contain-intrinsic-size: ${width}px ${height}px;
        display: inline-block;
      }
      canvas {
        display: block;
        height: 100%;
        width: 100%;
      }
    `
  }
}
