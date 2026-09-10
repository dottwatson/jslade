# External libraries (`loadResources`)

Lazy-load JS and CSS when a component mounts. The page `<head>` stays empty until that
island actually appears. The same URL is fetched **once** for the whole page.

```js
Jslade.loadResources(entries)   // from page script — same cache
this.loadResources(entries)     // from a live instance — delegates to Jslade
```

Both return a **Promise**. Call them from **`mount()`**. This is **not** `Jslade.import()` —
that API registers component **source** strings (`<noembed>…</noembed>`), not network assets.

Full API notes also live in [components.md](./components.md#external-libraries-loadresources).
Live demo: `playgrounds/sandbox/` → `demo/lazy-widget`.

---

## For dummies

Imagine Chart.js. The UMD file, when it runs, does this by itself:

```js
window.Chart = { /* … */ }
```

You do not tell it the name. The **library** chooses `window.Chart`.

**Without `global`** — “download and stop”:

```js
this.loadResources([
    { type: 'script', src: '/assets/chart.umd.min.js' },
]).then(function () {
    new Chart(...)          // ok after load: Chart is window.Chart
    new window.Chart(...)   // same object
})
```

Jslade only knows the file arrived. If the URL is wrong and the file is empty, the Promise
can still resolve, and `new Chart` crashes.

**With `global: 'Chart'`** — “download **and** check that `window.Chart` exists”:

```js
this.loadResources([
    { type: 'script', src: '/assets/chart.umd.min.js', global: 'Chart' },
]).then(function (result) {
    new result.global.Chart(...)  // === window.Chart
})
```

If after `load` there is no `window.Chart`, the Promise **rejects**.

`result.global` is **not** `window.global`. It is a plain object on the result:
`{ Chart: window.Chart }`. It does **not** create a second copy and it does **not** let you
run Chart 2.3 and 2.7 side by side — both UMDs overwrite `window.Chart`.

| You write | What happens |
|---|---|
| omit `global` | File arrived. Use `window.Chart` / `Chart` yourself. |
| `global: 'Chart'` | File arrived **and** `window.Chart` exists, or the Promise fails. |
| `type: 'module'` | Use `result.entries[i].module`. Usually no `global`. |
| `type: 'style'` | CSS in the page. Nothing on `window`. |

Jslade never puts the library on `window`. A UMD does that. A real ESM module usually does
not.

The component script parser has **no `async` / `await`**. Always `.then()` / `.catch()`.

---

## When to use what

| | When | What it does |
|---|---|---|
| Layout `<script>` / `<link>` | Every page needs the lib | Browser loads it with the page |
| **`use({ hl: window.hl })`** | Lib is **already** on `window`; the **template** must call it | Binds a name into markup / `@js`. No download. |
| **`this.loadResources([…])`** | This component owns the dependency | Injects `<script>` / `<link>` or `import()` |

`loadResources` does **not** feed `use()`. After a UMD runs, `new Chart(…)` works **inside
the `.then()`** because unknown names resolve on `window`. Markup `{{ Chart }}` on first
paint is still empty — set `state.ready` after load, or use `use()` only if the lib was on
the page before compile.

---

## Entry shape

`entries` is an array, or a single object (wrapped as one item).

| Field | Required | Meaning |
|---|---|---|
| `type` | yes | `'style'` · `'script'` (classic UMD) · `'module'` (native `import()`) |
| `src` | yes | Absolute or root-relative URL. After resolve, this is the cache key. |
| `global` | no | After script/module load, `window[global]` must exist or the Promise rejects. Copied to `result.global[name]`. Does **not** rename the library. |
| `test` | no | `() => boolean`. `true` → skip the network (already available). `global` is still checked. |
| `attrs` | no | Extra DOM attributes (`media`, `integrity`, `crossOrigin`, `nonce`, `defer`, …). Applied after defaults, so they win. |
| `timeout` | no | Reject after N ms. Omitted = wait until `load` / `error`. A hung URL without timeout occupies the cache for the page lifetime. |

```js
this.loadResources([
    { type: 'style', src: '/assets/leaflet.css', attrs: { media: 'all' } },
    { type: 'script', src: '/assets/leaflet.js', global: 'L' },
])

this.loadResources({ type: 'module', src: '/assets/widgets/map.js' })

this.loadResources({
    type: 'script',
    src: '/vendor/highlight.js',
    global: 'hljs',
    test: function () { return typeof hljs === 'function' },
    timeout: 15000,
})
```

---

## How a load runs

1. Entries run **in array order**. Put CSS before JS when the script needs those rules. The
   next URL starts only after the previous Promise settles. `async` on a `<script>` tag does
   **not** mean “download this array in parallel”. Two separate `loadResources()` calls can
   overlap.
2. Cache key is `type + resolved src`. Two islands asking for the same file share one
   Promise and one DOM node.
3. `test()` true → no insert; still check `global` if you passed it.
4. Else if a matching `script[src]` or `link[rel=stylesheet]` is already in the document
   (raw attribute or resolved URL) → do not insert a second tag.
5. Else inject into `document.head`: `<script src async>` or `<link rel="stylesheet">`.
   `type: 'module'` uses native `import()` — no `<script type="module">`.
6. `global` is checked on **every** success path (`test`, DOM hit, network).
7. Failure or timeout **drops that cache key** so a later call can retry. A tag **this**
   call inserted is removed on `error`. Tags that were already on the page stay.
8. **`unmount()` does not remove** scripts or styles.

With `Jslade.start({ dev: true })`, the console logs cache hits versus network inserts.

---

## Promise result

```js
{
    entries: [
        { type: 'style', src: '/assets/chart.css' },
        { type: 'script', src: '/assets/chart.umd.min.js', global: 'Chart' },
        { type: 'module', src: '/assets/widgets/map.js', module: /* namespace */ },
    ],
    global: { Chart: window.Chart },
}
```

Use `result.global.Chart`, `window.Chart`, or a bare `Chart` in the `.then()` — same object
when the UMD defined it.

---

## Complete component

Put results you need in **`state`**. A re-render after `ready = true` will overwrite DOM
text you wrote by hand. A Chart instance can live on `this._chart` (not in `props()`).

```html
<noembed name="demo/chart">
<script>
props({ ready: false, error: '' })

mount(function () {
    if (this._assetsReady) return
    this._assetsReady = true
    var self = this
    this.loadResources([
        { type: 'style', src: '/assets/chart.css' },
        { type: 'script', src: '/assets/chart.umd.min.js', global: 'Chart' },
    ]).then(function (result) {
        if (self._unmounted) return
        self._chart = new result.global.Chart(self.find('canvas'), {
            type: 'bar',
            data: { labels: ['A', 'B'], datasets: [{ data: [3, 7] }] },
        })
        self.ready = true
    }).catch(function (err) {
        if (self._unmounted) return
        self.error = String(err.message || err)
    })
})

unmount(function () {
    if (this._chart) {
        this._chart.destroy()
        this._chart = null
    }
    // does not unload script/style from the page
})
</script>

<template>
<div>
    @if(error)
        <p>{{ error }}</p>
    @else
        <canvas></canvas>
        @if(!ready)
            <p>Loading chart…</p>
        @endif
    @endif
</div>
</template>
</noembed>
```

`mount()` already runs once per instance; `_assetsReady` is extra safety. Always return
early in `.then()` / `.catch()` when `_unmounted` is set — the CDN can finish after teardown.

---

## Constraints

- No dependency graph, versions, or automatic unload.
- No `<resources>` block in `.jsd` — you call `loadResources` yourself.
- First inserter wins for `integrity` / `nonce` / URL flavour. Pass the **same** `src`
  string the page already used if a tag might exist.
- **CSP:** classic scripts need `script-src` for that origin; `import()` needs the module
  URL allowlisted (and CORS + JS MIME if cross-origin). Nonce-based CSP:
  `attrs: { nonce: '…' }`.
- `render()` (HTML string only) never runs `mount()` — this API is for live instances.

---

## Pitfalls

| What goes wrong | What to do |
|---|---|
| `Chart is not defined` | Construct inside `.then()`, not synchronously in `mount()` |
| Two Chart versions | Impossible with UMDs that both set `window.Chart`. Use ESM namespaces or an iframe. |
| Box text reset after load | Put the label in `state`; do not rely on `textContent` surviving a re-render |
| Hung forever | Set `timeout` on the entry |
| CSP / nonce failure | Pass `attrs.nonce`; allowlist the URL |
| `await this.loadResources(…)` | Not parsed. Use `.then()` |
| Named it `import` | Conflicts with `Jslade.import()`. This API is only `loadResources` |
