# Script and integrations

Component scripts are interpreted, not full JavaScript. In particular, `async`/`await`, classes, `switch`, generators, and `do…while` are unsupported; block scoping differs from normal JavaScript. Use Promise chains or move complex logic to ordinary page JavaScript. `use({ helper: window.helper })` exposes an already-loaded helper to markup and `@js`; it does not load the helper.

`this.loadResources(entries)` in `mount()` loads external JS/CSS, unlike `Jslade.import()`, which registers component source. Entries use `{ type: 'style' | 'script' | 'module', src: '…' }`; `global` checks an existing `window` export, and module exports are in `result.entries[i].module`. Handle rejection and completion after unmount. Resources are cached by type and resolved URL and are not removed on unmount.

`this.wire(name)` is page-wide; `this.localWire(name)` is scoped to an instance and accessible to children through `this.parent.localWire(name)`. Handles provide `send`, `receive`, `get`, and `clear`. Subscribe in `mount()`; instance subscriptions are released on unmount. Page-level `Jslade.wire` subscriptions need explicit cleanup.


## Choosing an integration

- For server-rendered pages, serialize a name-to-full-source map safely into the page, register it before `start()`, and pass initial data through placeholder props. Preserve the server's escaping and CSP requirements.
- For an existing page, use the browser bundle and in-page definitions for prototypes, or import source strings supplied by the host application. Do not assume `.jsd` files are automatically fetched.
- For programmatic or dynamically injected UI, use `renderTo` for a live instance, or mount newly inserted placeholders under their container. Retain the instance to update state and unmount it.
- For component communication, prefer props for parent-to-child data, `localWire` for a particular parent/child tree, and `wire` for page-wide messages.
- For third-party assets, use `loadResources` when the component owns the dependency; use `use` only for helpers already available to the page.
