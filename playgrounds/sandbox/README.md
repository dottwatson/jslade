# Playground sandbox

Static demo for the Jslade engine — no PHP, no bundler.

## Run locally

From the package root:

```sh
npm install
npm run build
npm run dev
```

Open [http://localhost:5173/playgrounds/sandbox/](http://localhost:5173/playgrounds/sandbox/).

## Files

| Path | Role |
|------|------|
| `index.html` | Loads `dist/jslade.min.js`, fetches `.jsd` components, mounts showcase |
| `components/demo/showcase.jsd` | Parent demo — `localWire` ping/select with chips |
| `components/demo/showcase-chip.jsd` | Child — `this.parent.localWire` |
| `components/demo/lazy-widget.jsd` | `loadResources` — lazy JS/CSS island |
| `assets/demo-widget.js` / `.css` | UMD + stylesheet fetched by the lazy widget |

Guide: [docs/load-resources.md](../../docs/load-resources.md).

## Notes

- `npm run dev` serves the package root; component paths are relative to this folder.
- Rebuild the engine after source changes: `npm run build`.
