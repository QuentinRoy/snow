---
"@quentinroy/snow": patch
---

Built entry files now contain their implementations and import each other directly: registration imports the element, and the element imports the core. A small defaults module stays shared. Output filenames are stable, with no hashed facade modules. Published JavaScript targets ES2022.
