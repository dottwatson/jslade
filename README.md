# Jslade

[![npm version](https://img.shields.io/npm/v/jslade.svg)](https://www.npmjs.com/package/jslade) [![license](https://img.shields.io/npm/l/jslade.svg)](LICENSE.md)

**Client-side components for server-rendered pages.**  
Blade-like templates, reactive `state`, scoped CSS — one script tag, no SPA required.

---

## What is Jslade?

Jslade is a **dependency-free client component engine**. You drop it into a page that your
server already renders and turn selected regions — carts, filters, modals, widgets — into
**live, reactive UI** without rebuilding the site as a single-page app.

Components are **plain text**: a `<noembed>` block with optional
`<script>`, `<style scoped>`, and `<template>`. Saving as **`*.jsd`** is a project convention
(for layout and editor syntax highlighting) — Jslade only parses the `<noembed>` string. Templates use familiar Blade-style syntax:
`@if`, `@foreach`, `{{ }}`, `@click`, and more.

When `state` changes, Jslade re-renders the component template and **patches the existing
DOM** — no virtual DOM, no build step required for your components.

---

## Why use it

- **Fits server-rendered sites** — PHP, Rails, Django, static HTML: add interactivity where
  you need it, leave the rest alone.
- **One script tag** — ship `jslade.min.js` (~69 KB minified) and your component files.
- **Components as data** — load from disk, a CMS, or inline JSON from your backend.
- **Familiar templates** — `@if` / `@foreach` / `{{ }}` instead of learning a new JSX dialect.
- **CSP-friendly** — parsed JavaScript subset, no `eval()`, event handlers via
  `data-jsd-on-*` attributes (no inline `onclick`).
- **Scoped CSS** — `<style scoped>` + `style-scoped` on markup roots, no CSS-in-JS.
- **Tree of instances** — `@component` children, parent/child scope, Wire channels between
  siblings.

---

## Why not use it

- **Full client app** with routing, global store, and a rich ecosystem — use React, Vue,
  Svelte, or similar.
- **Huge reactive trees** — each state change re-renders the **whole template** for that
  instance; fine-grained reactivity is not the model.
- **Team already on a SPA stack** — adding a second templating language rarely pays off.
- **Heavy async UI** — the script subset has no `async`/`await`; put that logic in plain JS
  modules and call it from components.

For deep dives see [docs/getting-started.md](./docs/getting-started.md).

---

## Load it on a page

Full minimal example: one component file, one mount point, boot sequence.

**`components/cart/item.jsd`**

```html
<noembed name="cart/item">
<script>
props({ item: null, quantity: 1 })

function increment() {
    this.quantity++
}
</script>

<style scoped>
.row { display: flex; gap: .75rem; align-items: center; }
.qty { font-weight: 600; min-width: 1.5rem; text-align: center; }
</style>

<template>
<div style-scoped class="row">
    <span>{{ item.name }}</span>
    <button type="button" @click(this.increment())">+</button>
    <span class="qty">{{ quantity }}</span>
</div>
</template>
</noembed>
```

**`index.html`** (your server embeds the import map — any language that can emit JSON works)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Cart</title>
</head>
<body>
    <h1>Your cart</h1>

    <jslade name="cart/item"
            props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 1 }'>
    </jslade>

    <script src="/node_modules/jslade/dist/jslade.min.js"></script>
    <script>
        Jslade.import({
            'cart/item': '<noembed name="cart/item">…full .jsd file contents…</noembed>'
        })
        Jslade.start()
    </script>
</body>
</html>
```

**Boot sequence**

```
load jslade.min.js
  → Jslade.import({ name: rawSource })   // register components (lazy compile)
  → Jslade.start()                       // scan DOM, mount <jslade> placeholders
  → user interaction → reactive re-renders
```

- Call **`import()` before `start()`** when templates come from the server.
- Use a closing **`</jslade>`** tag — self-closing placeholders break in HTML parsers.
- **`start()`** is explicit; nothing mounts until you call it.

**npm / ESM**

```js
import { Jslade } from 'jslade'
```

---

## Component example

A self-contained task list showing props, methods, lifecycle, scoped CSS, conditionals,
loops, events, and `$loop` metadata.

```html
<noembed name="demo/tasks">
<script>
props({
    title: 'Tasks',
    items: [
        { id: 1, label: 'Buy milk', done: false },
        { id: 2, label: 'Ship release', done: true },
    ],
    draft: '',
})

function add() {
    var text = (this.draft || '').trim()
    if (!text) return
    this.items = this.items.concat({ id: Date.now(), label: text, done: false })
    this.draft = ''
}

function toggle(e) {
    var id = Number(e.currentTarget.getAttribute('data-id'))
    this.items = this.items.map(function (item) {
        return item.id === id ? { id: item.id, label: item.label, done: !item.done } : item
    })
}

function remove(e) {
    var id = Number(e.currentTarget.getAttribute('data-id'))
    this.items = this.items.filter(function (item) { return item.id !== id })
}

mount(function () {
    // runs once when the instance is created
})
</script>

<style scoped>
.panel { border: 1px solid #e3e7ec; border-radius: 8px; padding: 1rem; }
.panel h2 { margin: 0 0 .75rem; font-size: 1.1rem; }
.row { display: flex; gap: .5rem; align-items: center; margin-bottom: .35rem; }
.row.done span { text-decoration: line-through; color: #868e96; }
.add { display: flex; gap: .5rem; margin-top: .75rem; }
.empty { color: #868e96; font-style: italic; }
</style>

<template>
<div style-scoped class="panel">
    <h2>{{ title }}</h2>

    @if(items.length === 0)
        <p class="empty">No tasks yet.</p>
    @else
        @foreach(items as item)
            <div class="row {{ item.done ? 'done' : '' }}">
                <input type="checkbox"
                       data-id="{{ item.id }}"
                       @change(this.toggle(event))"
                       {{ item.done ? 'checked' : '' }}>
                <span>{{ item.label }}</span>
                <button type="button"
                        data-id="{{ item.id }}"
                        @click(this.remove(event))">×</button>
                @if($loop.last)
                    <small>(last)</small>
                @endif
            </div>
        @endforeach
    @endif

    <div class="add">
        <input type="text"
               placeholder="New task…"
               value="{{ draft }}"
               @input(this.draft = event.target.value)">
        <button type="button" @click(this.add())">Add</button>
    </div>
</div>
</template>
</noembed>
```

**Built-in directives used here**

| Directive | Role |
|---|---|
| `@if` / `@else` | Conditional blocks |
| `@foreach` | Loop over `items` |
| `$loop.last` | Loop metadata |
| `@click` / `@change` / `@input` | DOM events (CSP-safe) |
| `{{ }}` | Output escaped text |

Child components: `@component('other/name', { key: id, …props })`.  
More syntax: [docs/components.md](./docs/components.md).

---

## Register components

Jslade needs a **name → source** map before it can mount a placeholder.

### 1. Server import map (recommended for production)

Your backend reads component sources (often saved as `*.jsd`) and passes the map to the page:

```html
<script>
Jslade.import(<?= json_encode($componentMap, JSON_HEX_TAG | JSON_HEX_AMP) ?>)
Jslade.start()
</script>
```

Each value is the **full raw source text**, including the outer
`<noembed name="…">` tag. The `*.jsd` extension is optional — a naming convention only.

```js
// Node sketch
import fs from 'node:fs'
import path from 'node:path'

const map = {}
for (const file of fs.readdirSync('components', { recursive: true })) {
    if (!file.endsWith('.jsd')) continue
    const raw = fs.readFileSync(path.join('components', file), 'utf8')
    const name = raw.match(/<noembed\s+name="([^"]+)"/)[1]
    map[name] = raw
}
```

Details: [docs/registering-components.md](./docs/registering-components.md).

### 2. In-page `<noembed>` (prototypes & playgrounds)

Define the component in HTML; `start()` picks it up via `scanDOM()`:

```html
<noembed name="demo/hello">
<script>props({ name: 'world' })</script>
<template><p>Hello, {{ name }}!</p></template>
</noembed>

<jslade name="demo/hello" props='{ "name": "Ada" }'></jslade>

<script src="/dist/jslade.min.js"></script>
<script>Jslade.start()</script>
```

After compile, the engine removes the source `<noembed>` node from the DOM.

### 3. `Jslade.import()` from JavaScript

```js
Jslade.import({
    'cart/item': rawString,
    'cart/summary': anotherRawString,
}, {
    sources: { 'cart/item': 'components/cart/item.jsd' }, // clearer error messages
})
```

**Rules**

- First registration wins — later imports of the same name are skipped.
- Names are normalised: `cart\item` → `cart/item`.
- Compile is **lazy** — first render or mount triggers it.

### Mount placeholders

```html
<jslade name="cart/item" props='{ "item": { "name": "Keyboard" }, "quantity": 2 }'></jslade>
```

Or programmatically:

```js
const instance = Jslade.renderTo('#target', 'cart/item', { item: { name: 'Keyboard' }, quantity: 2 })
instance.state.quantity = 5   // DOM updates
instance.unmount()
```

---

## Custom directives

Register **before** `start()`. Two APIs:

**Inline directive** — transforms a single tag/expression:

```js
Jslade.directive('badge', (ctx) => ctx.inline`<span class="badge">${ctx.expr}</span>`)
```

```html
<p>Status: @badge(active)</p>
```

**Conditional directive** — boolean guard like `@if`:

```js
Jslade.if('admin', () => window.user && window.user.role === 'admin')
```

```html
@admin
    <button type="button">Delete user</button>
@endadmin
```

**Block directive** — wraps a region (`{ block: true }`). The argument in
`@panel(...)` is available as **`ctx.expr`**:

```js
Jslade.directive('panel', { block: true }, (ctx) => {
    if (ctx.expr) {
        ctx.inline`<div class="panel"><h2>${ctx.expr}</h2>`
        ctx.wrap('', '</div>')
    } else {
        ctx.wrap('<div class="panel">', '</div>')
    }
})
```

```html
@panel(title)
    <p>{{ description }}</p>
@endpanel

@panel('Static heading')
    <p>Content with a fixed title.</p>
@endpanel
```

`ctx.wrap(openHtml, closeHtml)` takes two HTML strings — not a tag name or `children`.
Block helpers: `ctx.wrap`, `ctx.when`, `ctx.loop`.  
Built-in: `@if`, `@elseif`, `@else`, `@foreach`, `@for`, `@component`, `@js`, and
`@click`, `@input`, `@change`, `@submit`, `@keydown`, `@focus`, `@blur`.

---

## Documentation

| Guide | Contents |
|---|---|
| [docs/getting-started.md](./docs/getting-started.md) | Quick start, first component |
| [docs/components.md](./docs/components.md) | Lifecycle, state, parent/child tree |
| [docs/registering-components.md](./docs/registering-components.md) | Loading from backend, fetch, scanDOM |
| [docs/build.md](./docs/build.md) | Building the package (contributors) |
| [docs/debug-readme.md](./docs/debug-readme.md) | Dev debug bar |

Try the sandbox: `npm install && npm run build && npm run dev` →
[http://localhost:5173/playgrounds/sandbox/](http://localhost:5173/playgrounds/sandbox/).

---

## Changelog

[CHANGELOG.md](./CHANGELOG.md)

---

## License

[MIT](./LICENSE.md) — Copyright (c) Jslade contributors.
