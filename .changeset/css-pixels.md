---
"@quentinroy/snow": major
---

Sizes and speeds now use CSS pixels instead of canvas pixels, so snow looks the same at any screen resolution. Remove any `devicePixelRatio` compensation from `flakeSize`, `flakeSizeDeviation`, `flakeSpeed`, and `flakeSpeedDeviation`.
