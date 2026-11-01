---
"@quentinroy/snow": major
---

Import `snow` by name: `import { snow } from "@quentinroy/snow"`. The factory and its settings have new names to make the API consistent. The default export is gone, and there are no aliases for the old option names. The `SnowAnimation` and `SnowSettings` types are now exported.

Use the package entry points instead of imports through `@quentinroy/snow/dist/...`; package imports now expose only `@quentinroy/snow`, `@quentinroy/snow/element`, and `@quentinroy/snow/element/register`.

Rename these options:

- `meanSize` to `flakeSize`
- `sdSize` to `flakeSizeDeviation`
- `meanSpeed` to `flakeSpeed`
- `sdSpeed` to `flakeSpeedDeviation`
- `meanAngle` to `flakeDirection`
- `sdAngle` to `flakeDirectionDeviation`
- `color` to `flakeColor`
- `isFpsShown` to `showFps`
