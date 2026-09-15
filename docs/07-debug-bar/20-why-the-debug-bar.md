# Why the debug bar

Jslade has no Virtual DOM and no official browser DevTools extension. While you learn the
engine — or debug wire traffic, render loops, and lazy assets — the **debug bar** is the
recommended way to see what your components are actually doing.

It shows **live instances**, Wire **`send`** traffic on `wire` / `localWire`, render timings,
compiled templates, registered directives, and `loadResources` activity. **Dev only** — do not
ship it to production.

---

## What you gain

| Without the bar | With the bar |
|-----------------|--------------|
| Guess why a placeholder is empty | **Components** tab — instance tree, live state |
| `console.log` every `wire().send()` | **WireBus** tab — channels, payloads, subscribers |
| Wonder if Chart.js loaded | **Resources** tab — network / cache / skip badges |
| Re-read `.jsd` source to see compile output | **Templates** tab — compiled script + markup |

The bar hooks into **native engine events** (`Jslade._hooks`) — no monkey-patching. Details:
[Architecture and customization](./27-architecture-and-customization.md).

---

## Files (package root)

| File | Role |
|------|------|
| `debugger/jslade-debug.css` | Styles (`--jsd-*` variables) |
| `debugger/jslade-debug.ui.js` | DOM layout and tab chrome |
| `debugger/jslade-debug.js` | Core — consumes `Jslade._hooks` |
| `debugger/debug-lib.js` | Pure helpers (persistence, log caps, Wire grouping) |
| `debugger/jslade-storage.js` | Optional standalone `localStorage` wrapper (not imported by the bar) |

Minimal setup:

```html
<link rel="stylesheet" href="debugger/jslade-debug.css">
<script type="module">
    import { Jslade } from 'jslade'
    import { attachDebug } from './debugger/jslade-debug.js'

    Jslade.import(templates)
    Jslade.start()
    attachDebug(Jslade)
</script>
```

Next step: [Setup and workflow](./21-setup-and-workflow.md).

---

## When to use it in this book

- **Part II tutorials** — verify one instance, edit state live ([Components tab](./22-components-tab.md))
- **Part IV wire** — follow messages on **WireBus** ([WireBus tab](./23-wirebus-tab.md))
- **Part V loadResources** — confirm cache vs network ([Resources tab](./24-resources-and-performance.md))
- **Part VI custom directives** — confirm registration ([Directives tab](./25-templates-and-directives.md))

Quick reference: [Appendix G](../appendices/G-debug-bar-quick-reference.md).

---

## Limitations

| Limitation | Reason |
|------------|--------|
| No time-travel debugging | Requires Virtual DOM + state snapshots |
| No separate raw props panel | Props merge into render context at compile time |
| Memory metric (Chrome only) | `performance.memory` is non-standard |
| Max 200 messages / render timings | Bounded per session to limit memory |
| No router / global store tabs | Jslade has no built-in router or store |

Parent/child links in the **Components** tree reflect Jslade's explicit instance tree — not a
full DOM hierarchy.
