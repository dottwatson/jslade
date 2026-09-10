# jslade — package agent guide

You are working on the **`jslade` npm package** — a dependency-free client-side component engine.

**Mantras:** *Less is more.* *Keep it easy.*

## Layout

| Area | Path |
|------|------|
| Engine | `src/jslade/` |
| Build output | `dist/` (never hand-edit) |
| Docs | `docs/`, `README.md` |
| Sandbox | `playgrounds/sandbox/` |
| Debug bar | `debugger/` (dev only) |
| Tests | `tests/` — see `tests/README.md`; run `npm run test:ci` |

## Workflows

**Engine change:** `npm run build`

**Docs change:** edit `docs/`; keep `README.md` concise. Public `loadResources` docs:
`docs/load-resources.md` + the section in `docs/components.md`.

**Sandbox component:** edit `playgrounds/sandbox/components/**/*.jsd`; reload via `npm run dev`

## Rules

- 4-space JS, Prettier, no semicolons, single quotes
- Preserve public API in `docs/` and `README.md`
- `@click` handlers: use `this.method()`; no bare `@foreach` loop variables
- `Jslade.import()` registers component source; `this.loadResources()` lazy-loads JS/CSS
- Smallest correct diff

Parent workspace may include optional PHP demo code — it is **not** part of this package.
