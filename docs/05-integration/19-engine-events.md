# Engine events

Cross-cutting hooks on the public `Jslade` object. Use them for lazy loading,
logging, feature flags, or integration with your backend — without monkey-patching
the engine.

```js
Jslade.before('component:request', fn)
Jslade.after('mount', fn)
Jslade.once('compile', fn)
Jslade.off('mount', fn)
```

---

## API

| Method | Phase | Notes |
|--------|-------|-------|
| `before(event, fn)` | Runs **before** the action | `return false` (strict `===`) stops the pipeline |
| `after(event, fn)` | Runs **after** the action | Observational — return value ignored |
| `once(event, fn)` | One-shot **after** listener | Self-removes after the first fire |
| `off(event, fn)` | Removes `fn` | Pass the same function reference you registered |

**Async `before` handlers** (returning a `Promise`) are supported when you use
`Jslade.startAsync()`, `Jslade.renderToAsync()`, or `Jslade.mountAllAsync()`.
Sync `start()` / `renderTo()` throw if a `before` listener returns a Promise.

---

## Events

| Event | When | Payload highlights |
|-------|------|-------------------|
| `component:request` | A component name is needed (`<jslade>`, `renderTo`, `@component`, `render`) | `name`, `via`, `state`, `origin`, `sourceFile` |
| `compile` | Source is compiled into `compiledComponents` | `name`, `origin`, `sourceFile`, `ms` (after) |
| `mount` | Live instance created and `mount()` hook runs | `name`, `via`, `instance`, `props`, `origin` |
| `unmount` | Instance teardown | `name`, `instance`, `origin` |
| `resource:load` | `loadResources()` / `this.loadResources()` | `type`, `src`, `status`, `time` |
| `directive:register` | `Jslade.directive()` / `Jslade.if()` | `name`, `type` |
| `wire:send` | Wire message published | `channel`, `value`, `local`, `time` |
| `wire:subscribe` | `receive()` registered | `channel`, `local`, `instance` |
| `wire:unsubscribe` | Unsubscribe function called | `channel`, `local`, `instance` |

### `via` (component:request / mount)

| Value | Trigger |
|-------|---------|
| `placeholder` | `<jslade name="…">` |
| `renderTo` | `Jslade.renderTo()` |
| `child` | `@component('…')` in a template |
| `render` | `Jslade.render()` or internal render path |
| `internal` | Engine-internal ensure path |

### `state` / `origin` (component metadata)

| `state` | Meaning |
|---------|---------|
| `missing` | Not registered yet |
| `registered` | Source in memory, not compiled |
| `compiled` | Ready in `compiledComponents` |

| `origin` | Meaning |
|----------|---------|
| `import` | Registered via `Jslade.import()` |
| `dom` | Found via `scanDOM()` / in-page `<noembed>` |
| `inline` | Pre-parsed object passed to `import()` |
| `null` | Unknown / not applicable |

`sourceFile` is set when you pass `{ sources: { 'name': 'path/file.jsd' } }` to
`import()`.

---

## Lazy load example

```js
Jslade.before('component:request', async ({ name, state }) => {
    if (state !== 'missing') return

    const res = await fetch('/components/' + name + '.jsd')
    if (!res.ok) return false

    const src = await res.text()
    Jslade.import({ [name]: src }, { sources: { [name]: 'components/' + name + '.jsd' } })
})

await Jslade.startAsync({ dev: true })
```

After `import()`, call `Jslade.mountAll()` or `mountAllAsync()` again if new
placeholders appeared while the page was already running.

---

## Blocking with `return false`

```js
Jslade.before('mount', ({ name }) => {
    if (name === 'admin/panel' && !window.userIsAdmin) return false
})
```

Blocked mount/unmount/compile/request paths fail silently in production; with
`Jslade.start({ dev: true })` you still get console warnings for skipped
placeholders.

---

## Debug bar

The debug bar still listens on `Jslade._hooks` (legacy internal arrays). Public
`after('wire:send')` and `after('resource:load')` mirror the same payloads.

See [Architecture and customization](../07-debug-bar/27-architecture-and-customization.md).

---

## Checking whether a component exists

```js
Jslade.hasComponent('demo/counter')   // true if registered or compiled
Jslade.list()                         // compiled names only
```

Event payloads use **`state`**: `missing` | `registered` | `compiled` — same distinction.

---

## Related

- [Registering components](./15-registering-components.md)
- [Lazy JS/CSS (loadResources)](./17-load-resources.md)
- [Instance API](../04-composition/14-instance-api.md) — per-component `mount()` / `unmount()` hooks
