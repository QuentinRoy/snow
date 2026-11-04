---
"@quentinroy/snow": minor
---

Add the `<snow-fall>` custom element. Import `@quentinroy/snow/element/register` and write `<snow-fall></snow-fall>` to get snow with no other setup. Like an `<img>`, the element takes its default size from `width` and `height` (300 × 150 if absent), and CSS can override it.

Every option is a live kebab-case attribute, such as `flake-size` or `fill-mode`, and a property with the option's name. Invalid attribute values fall back to defaults.

Add `paused` to freeze the snow. The element also pauses when the system asks for reduced motion, unless you add `ignore-reduced-motion`. Taking the element out of the page stops its animation, and putting it back continues with the same flakes.

To pick your own tag name, import `SnowElement` from `@quentinroy/snow/element` and register it yourself. Both entry points need a browser, so import them from client code only.
