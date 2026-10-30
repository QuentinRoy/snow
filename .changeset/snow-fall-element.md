---
"@quentinroy/snow": minor
---

Add the `<snow-fall>` custom element. Import `@quentinroy/snow/element/register` and write `<snow-fall flake-color="white" density="60"></snow-fall>` to get snow with no other setup. The element is 300 × 150 pixels by default, takes its default size and aspect ratio from `width` and `height`, and lets CSS override both, like an `<img>`.

Every option is a live attribute in kebab-case, such as `flake-size` and `fill-mode`, and a property with the option's name. Invalid values fall back to the default.

To pick your own tag name, import `SnowElement` from `@quentinroy/snow/element` and register it yourself. Both entry points need a browser, so import them from client code only.
