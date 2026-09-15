# CSP, security, performance

---

## Content Security Policy

Jslade is designed for pages with strict CSP:

- Component scripts are **parsed and interpreted** — `eval()` is never used.
- Event directives compile to **`data-jsd-on-*`** attributes, not inline `onclick`.
- Template output uses **`{{ }}`** escaping by default; `{!! expr !!}` is raw HTML — use only
  for trusted content.

When using `loadResources`, classic scripts need `script-src` for that origin; `type: 'module'`
entries need the module URL allowlisted. Pass `attrs: { nonce: '…' }` for nonce-based CSP.

Details: [JavaScript subset](../03-component/11-javascript-subset.md),
[loadResources](./17-load-resources.md).

---

## Security checklist

| Topic | Guidance |
|-------|------------|
| User-generated markup | Never `{!! userHtml !!}` unless sanitized server-side |
| Props from HTML attributes | Treat as untrusted if authors can edit the page |
| Wire channels | Any script on the page can `Jslade.wire('name').send()` — do not rely on wire for auth |
| External scripts via `loadResources` | Same trust model as any third-party `<script src>` |

---

## Performance model

Each state change on a live instance **re-runs the full template function** for that instance,
then patches the DOM. There is no fine-grained dependency tracking.

| Implication | Mitigation |
|-------------|------------|
| Large templates re-render wholesale | Split heavy regions into child `@component`s with stable `key` |
| `updated()` must not write state unconditionally | Causes chained re-renders; engine stops after 50 with a console error |
| Many instances on one page | Each instance is independent — acceptable for typical island counts |

Use the debug bar **Performance** tab to watch render counts and cumulative timing
([Resources and Performance](../07-debug-bar/24-resources-and-performance.md)).

---

## When Jslade is not the right tool

- Full client application with routing and a rich ecosystem → React, Vue, Svelte, etc.
- Very large reactive trees with constant micro-updates → frameworks with granular reactivity
- Team already standardized on a SPA stack → adding a second template language rarely pays off

For deep integration patterns see [Registering components](./15-registering-components.md) and
[Instance API](../04-composition/14-instance-api.md).
