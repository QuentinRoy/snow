---
"@quentinroy/snow": major
---

Snow now starts with a filled canvas and fills newly exposed areas after a resize, so snow is visible immediately. The new `fillMode` option defaults to `"instant"`. Set `fillMode: "none"` to keep the previous behavior of flakes entering only through the edges.
