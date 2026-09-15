# Architecture and customization

## How it hooks into Jslade

`jslade-debug.js` registers listeners on **`Jslade._hooks`** when `attachDebug(Jslade)` runs.

Integrators should prefer the public API — **`Jslade.before()` / `Jslade.after()`** —
documented in [Engine events](../05-integration/19-engine-events.md).

| Legacy hook (`_hooks`) | Public `after(…)` event |
|------------------------|-------------------------|
| `message` | `wire:send` |
| `subscribe` | `wire:subscribe` |
| `resource` | `resource:load` |
| `directive` | `directive:register` |
| `render` | _(internal — no public alias yet)_ |
| `instance` | Use `mount` / `unmount` events |

No monkey-patching — the engine emits; the bar listens.

---

## How it renders

Stat updates use `setTimeout(16)` batching (works when `requestAnimationFrame` is throttled in
background tabs). Handle bar stats refresh even when the panel is **closed**; tab bodies render
only when open.

### Data limits (per session, not persisted)

- Max **200** Wire messages
- Max **200** render timing entries

---

## CSS custom properties

Scoped under `#jslade-debug-bar`:

```css
--jsd-bg: #1a1a2e;
--jsd-bg-header: #16213e;
--jsd-bg-panel: #0f0f23;
--jsd-border: #2a2a4a;
--jsd-text: #e0e0e0;
--jsd-muted: #6c757d;
--jsd-accent: #0d6efd;
--jsd-warn: #ffc107;
--jsd-send: #198754;
--jsd-danger: #dc3545;
--jsd-block: #6f42c1;
--jsd-inline: #fd7e14;
```

Override in your stylesheet to match your brand.

---

## Styling isolation

All rules under `#jslade-debug-bar`. The bar uses `position: fixed; bottom: 0; z-index: 99999`
and adds `padding-bottom` to `<body>` when visible.

```css
body.jslade-debug-active {
    /* your layout tweaks */
}
```

---

## File sizes

| File | Approx. lines | Minified |
|------|---------------|----------|
| `jslade-debug.js` | ~700 | ~8 KB |
| `jslade-debug.ui.js` | ~190 | — |
| `debug-lib.js` | ~70 | — |
| `jslade-debug.css` | ~230 | — |
| `jslade-storage.js` | ~175 | ~1 KB (optional, unused by bar) |
