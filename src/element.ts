import { WithAttributeProps, boolean } from "@quentinroy/custom-element-mixins"
import { dimension, finiteNumber, pickList, string } from "./attribute-serializers.ts"
import { defaultSettings } from "./defaults.ts"
import { adoptStyles } from "./element/styles.ts"
import { snow } from "./snow.ts"
import type { SnowAnimation, SnowOptions } from "./snow.ts"

const defaultWidth = 300
const defaultHeight = 150

// Every core option except `paused`, which the element combines with reduced motion and whether it
// is connected before passing it on.
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

const elementOnlyNames = ["height", "ignoreReducedMotion", "paused", "width"] as const

const observeAttributes = [...optionNames, ...elementOnlyNames].map((name) =>
  name
    .split(/(?=[A-Z])/u)
    .join("-")
    .toLowerCase(),
)

const SnowElementBase = WithAttributeProps(HTMLElement, {
  density: finiteNumber({ default: defaultSettings.density, min: 0 }),
  fillMode: pickList({ values: ["instant", "none"], default: "instant" }),
  flakeColor: string({ default: defaultSettings.flakeColor }),
  flakeDirection: finiteNumber({ default: defaultSettings.flakeDirection }),
  flakeDirectionDeviation: finiteNumber({ default: defaultSettings.flakeDirectionDeviation }),
  flakeSize: finiteNumber({ default: defaultSettings.flakeSize }),
  flakeSizeDeviation: finiteNumber({ default: defaultSettings.flakeSizeDeviation }),
  flakeSpeed: finiteNumber({ default: defaultSettings.flakeSpeed }),
  flakeSpeedDeviation: finiteNumber({ default: defaultSettings.flakeSpeedDeviation }),
  height: dimension({ default: defaultHeight }),
  ignoreReducedMotion: boolean(),
  paused: boolean(),
  showFps: boolean(),
  width: dimension({ default: defaultWidth }),
})

/** Snowfall drawn on a canvas inside an open shadow root. */
export class SnowElement extends SnowElementBase {
  static get observedAttributes() {
    return observeAttributes
  }

  readonly #root = this.attachShadow({ mode: "open" })
  readonly #container = this.ownerDocument.createElement("div")
  readonly #reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
  #animation: SnowAnimation | undefined
  #setDimensions: ReturnType<typeof adoptStyles>

  constructor() {
    super()
    this.#root.append(this.#container)
  }

  attributeChangedCallback(): void {
    this.#setDimensions?.(this.width, this.height)
    this.#syncAnimation()
  }

  connectedCallback(): void {
    this.#setDimensions = adoptStyles(this.#root)
    this.#setDimensions?.(this.width, this.height)
    this.#reducedMotion.addEventListener("change", this.#syncPlayback)
    this.#animation ??= snow(this.#container, { ...this.#readOptions(), paused: true })
    this.#syncPlayback()
  }

  disconnectedCallback(): void {
    this.#reducedMotion.removeEventListener("change", this.#syncPlayback)
    this.#syncPlayback()
  }

  #readOptions(): SnowOptions {
    return Object.fromEntries(optionNames.map((name) => [name, this[name]]))
  }

  #syncAnimation(): void {
    if (this.#animation !== undefined) {
      Object.assign(this.#animation, this.#readOptions())
      this.#syncPlayback()
    }
  }

  /** The element's own `paused` only mirrors the attribute, so the core gets the effective value. */
  readonly #syncPlayback = (): void => {
    if (this.#animation !== undefined) {
      this.#animation.paused =
        !this.isConnected ||
        this.paused ||
        (this.#reducedMotion.matches && !this.ignoreReducedMotion)
    }
  }
}
