# Changelog

All notable changes to the `jslade` npm package are documented here.

## 0.3.0

### Changed

- **Wire API** — `Jslade.send` / `sendState` / `receive` and hook arguments `(send, receive)` are replaced by a channel handle:
  - `this.wire(name)` / `Jslade.wire(name)` — public square (`send`, `receive`, `get`, `clear`)
  - `this.localWire(name)` — per-instance courtyard; children use `this.parent.localWire(name)`
- `send` is the flow and the last value; `get()` reads it (optional fallback if empty); `clear()` wipes it without notifying `receive`

### Added

- `Jslade.wire(name).get(fallback?)` — last `send`, or `fallback` / `undefined` if the channel is empty
- **`Jslade.loadResources(entries)` / `this.loadResources(entries)`** — lazy JS/CSS loader (deduped by type + URL; `unmount` does not remove assets)

## 0.2.0

### Added

- **`try` / `catch` / `finally` and `throw`** in method bodies, lifecycle hooks, `@js` blocks and event handlers
- **Optional chaining** — `a?.b`, `a?.[i]`, `a?.()` with full chain short-circuiting
- **Destructuring** in declarations, parameters, `for…of` / `for…in` heads, `catch` bindings and assignments, with nested patterns, defaults, holes and rest
- **Spread / rest** in array literals, object literals, call arguments, `new`, and trailing parameters
- Reserved words are accepted as property names and object keys, so `map.delete(k)` and `{ class: 'x' }` parse
- Leading-dot number literals (`.5`)

### Fixed

- Compound assignment (`+=`, `-=`, `*=`, `/=`, `%=`) applied its operator instead of behaving like a plain `=`
- Nested arrow functions and function expressions now close over their enclosing parameters
- Shorthand methods in object literals (`{ greet() {} }`) parse
- Professional package layout: `dist/`, `docs/`, `playgrounds/sandbox/`, `debugger/`
- Standalone sandbox demo (`npm run dev`) — no PHP required
- `prepublishOnly` build hook and expanded `package.json` exports

### Changed

- DOM runtime prefix **`jsl` → `jsd`**: `data-jsd-on-*`, `data-jsd-id`, `data-jsd-key` (was `data-jsl-*`)
- Component definitions use **`<noembed name="…">`** only — `<jslade-component>` and `<script type="text/x-jslade">` are removed
- Docs: **`*.jsd`** is a project convention (layout + editor highlighting), not required by the engine
- Distribution output moved from `assets/js/` to `dist/`
- Example components moved to `playgrounds/sandbox/components/`
- Documentation moved to `docs/`

## 0.1.x

Initial client engine: Blade-like templates, reactive state, DOM morphing, WireBus, scoped CSS.
