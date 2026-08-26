---
'@slyxup/billing': patch
---

BillingClient is browser-safe: reads API URL from process.env, import.meta.env.VITE_SLYXUP_API_URL, or fallback without crashing when `process` is undefined.
