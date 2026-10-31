---
"@quentinroy/snow": major
---

Rename the options and switch to a named export. There are no aliases for the old names.

Import `snow` by name: `import { snow } from "@quentinroy/snow"`. The default export is gone. The `SnowAnimation` and `SnowOptions` types are now exported.

Rename these options:

- `meanSize` to `flakeSize`
- `sdSize` to `flakeSizeDeviation`
- `meanSpeed` to `flakeSpeed`
- `sdSpeed` to `flakeSpeedDeviation`
- `meanAngle` to `flakeDirection`
- `sdAngle` to `flakeDirectionDeviation`
- `color` to `flakeColor`
- `isFpsShown` to `showFps`
- `autoFill` to `fillMode`: use `"instant"` for `true` and `"none"` for `false`

Behavior and defaults are unchanged.
