---
"@quentinroy/snow": major
---

Sizes and speeds now use CSS pixels instead of canvas pixels, so snow looks the same at any canvas resolution. To keep the drawing sharp on high-resolution screens, set `canvas.width` and `canvas.height` to the displayed size multiplied by `window.devicePixelRatio`. If you previously compensated for the resolution in `meanSize` or `meanSpeed`, remove that adjustment.
