---
'@slyxup/ui': patch
---

Components now self-inject styles and fonts (no more missing borders/radius/fonts if `<SlyxUpStyles />` was forgotten). OAuth buttons redirect to the correct API origin instead of a relative path that broke on deployed apps.
