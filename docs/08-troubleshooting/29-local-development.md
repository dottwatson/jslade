# Local development

## Local development

From the package directory:

```sh
npm install
npm run build
npm run dev
```

This serves the package root at `http://localhost:5173`. Useful entry points:

| URL | Purpose |
|---|---|
| `playgrounds/sandbox/` | Static demo loading `.jsd` components from disk |
| `playgrounds/playground/` | Live editor for component source |
| `tests/patch.html` | Manual DOM patch regression checks |

Edit a `.jsd` file under `playgrounds/sandbox/components/` and reload — no frontend build
step is required for component changes (rebuild with `npm run build` only after engine edits).

The sandbox includes **`demo/lazy-widget`**: a component that calls `this.loadResources()`
on mount to pull a local JS/CSS pair. That is the pattern for Chart, Leaflet, or any UMD
you do not want in the page `<head>`.

---

