---
"@quentinroy/snow": minor
---

Add the `<snow-fall>` custom element. Import `@quentinroy/snow/element/register` and write `<snow-fall flake-color="white" density="60"></snow-fall>` to get snow with no other setup. The element is 300 × 150 pixels by default, takes its default size and aspect ratio from `width` and `height`, and lets CSS override both, like an `<img>`.

Every option is a live attribute in kebab-case, such as `flake-size` and `fill-mode`, and a property with the option's name. Numeric attributes follow HTML parsing rules, with invalid values falling back to defaults and negative density reading as zero. Numeric property assignments convert values like HTML properties; non-finite values throw for settings other than dimensions. `width` and `height` reflect like canvas dimensions. `fill-mode` matches without regard to ASCII letter case.

The `flakeColor` property returns the default color when `flake-color` is absent. Removing the attribute restores that default; explicitly empty attributes remain empty.

Add `paused` to freeze the snow, and remove it to continue. The element also stops when the system asks for reduced motion and resumes when that setting is turned off, without changing `paused`. Add `ignore-reduced-motion` to keep animating regardless; `paused` still wins. Taking the element out of the page stops its animation; putting it back continues with the same flakes, ignoring the time away.

To pick your own tag name, import `SnowElement` from `@quentinroy/snow/element` and register it yourself. Both entry points need a browser, so import them from client code only.
