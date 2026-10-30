import { WithAttributeProps, boolean } from "@quentinroy/custom-element-mixins"
import type { AttributeSerializer } from "@quentinroy/custom-element-mixins"
import { defaultSettings } from "./defaults.ts"
import { adoptStyles } from "./element/styles.ts"
import { snow } from "./snow.ts"
import type { SnowAnimation, SnowOptions } from "./snow.ts"

const defaultWidth = 300
const defaultHeight = 150

/**
 * Build a width/height serializer with the same conversion rules as an HTML canvas.
 *
 * Reading an attribute parses its integer prefix, so "12px" reads as 12. Missing or invalid
 * attributes, negative values, and values above 2³¹−1 use `fallback`. Zero is valid, and
 * reading never rewrites the attribute.
 *
 * Assigning a property first converts to an unsigned 32-bit integer: fractions truncate,
 * values wrap modulo 2³², and NaN/infinities become zero. HTML then replaces values above
 * 2³¹−1 with `fallback`. For example, 12.9 writes "12" and -1 writes the fallback.
 *
 * @param fallback - The missing/invalid value default: 300 for width, 150 for height.
 * @see {@link https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-width | HTML canvas dimensions}
 * @see {@link https://webidl.spec.whatwg.org/#es-unsigned-long | Web IDL unsigned long conversion}
 */
function dimension(fallback: number): AttributeSerializer<unknown, number> {
  return {
    parse(value) {
      const match = /^[\t\n\f\r ]*(?<number>[+-]?\d+)/u.exec(value ?? "")
      const parsed = match ? Number(match.groups?.number) : Number.NaN

      return parsed >= 0 && parsed <= 2_147_483_647 ? parsed || 0 : fallback
    },
    serialize(value) {
      const number = toNumber(value)
      const integer = Number.isFinite(number) ? Math.trunc(number) : 0
      const converted = ((integer % 4_294_967_296) + 4_294_967_296) % 4_294_967_296

      return String(converted > 2_147_483_647 ? fallback : converted)
    },
  }
}

/** A finite number; blank, malformed and non-finite attributes fall back to the default. */
function finiteNumber(fallback: number): AttributeSerializer<unknown, number> {
  return {
    parse(value) {
      const match = /^[\t\n\f\r ]*(?<number>[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/u.exec(
        value ?? "",
      )

      const parsed = match ? Number(match.groups?.number) : Number.NaN

      return Number.isFinite(parsed) ? parsed || 0 : fallback
    },
    serialize(value) {
      const converted = toNumber(value)

      if (!Number.isFinite(converted)) {
        throw new TypeError("The value must be finite.")
      }

      return String(converted)
    },
  }
}

function toNumber(value: number): number {
  // JS assignments can bypass this type; Web IDL's ToNumber must still reject BigInt.
  // oxlint-disable-next-line typescript/no-unnecessary-type-conversion
  return +value
}

function toDOMString(value: string): string {
  // JS assignments can bypass this type; template coercion rejects Symbol, unlike String().
  // oxlint-disable-next-line typescript/no-unnecessary-template-expression
  return `${value}`
}

/** Like `finiteNumber`, but negative values read as zero. */
function nonNegativeNumber(fallback: number): AttributeSerializer<unknown, number> {
  const { parse, serialize } = finiteNumber(fallback)

  return {
    parse(value) {
      return Math.max(0, parse(value))
    },
    serialize,
  }
}

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

const SnowElementBase = WithAttributeProps(HTMLElement, {
  density: nonNegativeNumber(defaultSettings.density),
  fillMode: {
    parse(value: string | undefined): "instant" | "none" {
      return value?.length === 4 && /^none$/iu.test(value) ? "none" : "instant"
    },
    serialize(value: "instant" | "none"): string {
      return toDOMString(value)
    },
  },
  flakeColor: {
    parse: (value: string | undefined): string => value ?? "",
    serialize: toDOMString,
  },
  flakeDirection: finiteNumber(defaultSettings.flakeDirection),
  flakeDirectionDeviation: finiteNumber(defaultSettings.flakeDirectionDeviation),
  flakeSize: finiteNumber(defaultSettings.flakeSize),
  flakeSizeDeviation: finiteNumber(defaultSettings.flakeSizeDeviation),
  flakeSpeed: finiteNumber(defaultSettings.flakeSpeed),
  flakeSpeedDeviation: finiteNumber(defaultSettings.flakeSpeedDeviation),
  height: dimension(defaultHeight),
  ignoreReducedMotion: boolean(),
  paused: boolean(),
  showFps: boolean(),
  width: dimension(defaultWidth),
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

  readonly #surface = document.createElement("div")
  readonly #root = this.attachShadow({ mode: "open" })
  readonly #reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
  #animation: SnowAnimation | undefined
  #setDimensions: ReturnType<typeof adoptStyles>

  readonly #onReducedMotionChange = (): void => {
    this.#syncPlayback()
  }

  constructor() {
    super()
    this.#root.append(this.#surface)
  }

  attributeChangedCallback(): void {
    this.#setDimensions?.(this.width, this.height)
    this.#syncAnimation()
  }

  connectedCallback(): void {
    this.#setDimensions = adoptStyles(this.#root)
    this.#setDimensions?.(this.width, this.height)
    this.#reducedMotion.addEventListener("change", this.#onReducedMotionChange)
    this.#animation ??= snow(this.#surface, { ...this.#readOptions(), paused: true })
    this.#syncPlayback()
  }

  disconnectedCallback(): void {
    this.#reducedMotion.removeEventListener("change", this.#onReducedMotionChange)
    this.#syncPlayback()
  }

  #readOptions(): SnowOptions {
    return {
      ...Object.fromEntries(optionNames.map((name) => [name, this[name]])),
      flakeColor: this.hasAttribute("flake-color") ? this.flakeColor : defaultSettings.flakeColor,
    }
  }

  #syncAnimation(): void {
    if (this.#animation !== undefined) {
      Object.assign(this.#animation, this.#readOptions())
      this.#syncPlayback()
    }
  }

  /** The element's own `paused` only mirrors the attribute, so the core gets the effective value. */
  #syncPlayback(): void {
    if (this.#animation !== undefined) {
      this.#animation.paused =
        !this.isConnected ||
        this.paused ||
        (this.#reducedMotion.matches && !this.ignoreReducedMotion)
    }
  }
}
