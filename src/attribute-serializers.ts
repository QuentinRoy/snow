// This module is the JavaScript input boundary; Web IDL requires coercing unknown values.
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof

import type { AttributeSerializer } from "@quentinroy/custom-element-mixins"

// The mixin also uses its setter type for property reads, so keep return annotations narrow.
// Serializer implementations still accept unknown JavaScript values at runtime.

/** Web IDL numeric conversion, including rejection of BigInt and Symbol. */
function toNumber(value: unknown): number {
  // @ts-expect-error TypeScript rejects unknown operands; unary + performs the required runtime conversion.
  return +value
}

function toDOMString(value: unknown): string {
  if (typeof value === "symbol") {
    throw new TypeError("The value must be convertible to a DOMString.")
  }

  return String(value)
}

/**
 * Build a width/height serializer with the same conversion rules as an HTML canvas.
 *
 * Reading an attribute parses its integer prefix, so "12px" reads as 12. Missing or invalid
 * attributes, negative values, and values above 2³¹−1 use `default`. Zero is valid, and
 * reading never rewrites the attribute.
 *
 * Assigning a property first converts to an unsigned 32-bit integer: fractions truncate,
 * values wrap modulo 2³², and NaN/infinities become zero. HTML then replaces values above
 * 2³¹−1 with `default`. For example, 12.9 writes "12" and -1 writes the default.
 *
 * @see {@link https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-width | HTML canvas dimensions}
 * @see {@link https://webidl.spec.whatwg.org/#es-unsigned-long | Web IDL unsigned long conversion}
 */
export function dimension({
  default: defaultValue,
}: {
  /** The missing/invalid value default. */
  default: number
}): AttributeSerializer<unknown, number> {
  return {
    parse(value) {
      const match = /^[\t\n\f\r ]*(?<number>[+-]?\d+)/u.exec(value ?? "")
      const parsed = match ? Number(match.groups?.number) : Number.NaN

      return parsed >= 0 && parsed <= 2_147_483_647 ? parsed || 0 : defaultValue
    },
    serialize(value: unknown) {
      const number = toNumber(value)
      const integer = Number.isFinite(number) ? Math.trunc(number) : 0
      const converted = ((integer % 4_294_967_296) + 4_294_967_296) % 4_294_967_296

      return String(converted > 2_147_483_647 ? defaultValue : converted)
    },
  }
}

/**
 * Read finite numbers within optional inclusive bounds; invalid attributes use the default.
 * Finite assignments are reflected unchanged, even when they are outside the read bounds.
 */
export function finiteNumber({
  default: defaultValue,
  min = -Infinity,
  max = Infinity,
}: {
  default: number
  min?: number
  max?: number
}): AttributeSerializer<unknown, number> {
  return {
    parse(value): number {
      const match = /^[\t\n\f\r ]*(?<number>[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/u.exec(
        value ?? "",
      )

      const parsed = match ? Number(match.groups?.number) : Number.NaN

      return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) || 0 : defaultValue
    },
    serialize(value: unknown) {
      const number = toNumber(value)

      if (!Number.isFinite(number)) {
        throw new TypeError("The value must be finite.")
      }

      return String(number)
    },
  }
}

function asciiLowerCase(value: string): string {
  return value.replaceAll(/[A-Z]/gu, (letter: string) => letter.toLowerCase())
}

/** Reflect raw text and read canonical keywords using HTML's ASCII case-insensitive matching. */
export function pickList<const Value extends string>({
  values,
  default: defaultValue,
}: {
  values: readonly Value[]
  default: NoInfer<Value>
}): AttributeSerializer<unknown, Value> {
  return {
    parse(value) {
      if (value === undefined) {
        return defaultValue
      }

      const keyword = asciiLowerCase(value)

      return values.find((candidate) => asciiLowerCase(candidate) === keyword) ?? defaultValue
    },
    serialize: toDOMString,
  }
}

/** Reflect text verbatim, using the configured default when the attribute is missing. */
export function string({
  default: defaultValue,
}: {
  default: string
}): AttributeSerializer<unknown, string> {
  return {
    parse: (value) => value ?? defaultValue,
    serialize: toDOMString,
  }
}
