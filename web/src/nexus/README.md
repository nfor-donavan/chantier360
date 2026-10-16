# Nexus brand kit (web)

Shared by every Nexus Tech Labs product.

- `product.js` the only file to edit per product (`PRODUCT.name`).
- `NexusPreloader.jsx` loading screen (use as the `Suspense` fallback).
- `NexusFooter.jsx` the "Powered by Nexus Software Engine" footer. Pass `tenantName` for the customer's company.
- `NexusMark.jsx` the vector "N" mark.

The matching styles are the `nx-*` rules at the end of `src/styles.css`, and the first-paint loader is in `index.html`.
These apps use plain CSS rather than Tailwind, so the footer is styled with a CSS class instead of utility classes.
