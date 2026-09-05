# Getting started

This guide walks through everything you need to load Jslade on a page and mount your first
live component. It assumes you already have a server-rendered HTML page (PHP, Rails, Django,
static files behind a web server, or similar) and you want one region of that page to become
interactive without turning the whole site into a single-page application.

Jslade ships as a single JavaScript file. Your components are plain text: a `<noembed>` block
with optional `<script>`, `<style scoped>`, and `<template>`. Saving them as **`*.jsd`** is a
**convention** for project layout and editor highlighting — the engine never checks the
extension. The browser registers the source, compiles on first use, and mounts instances
where you place `<jslade>` placeholders in your HTML.

---

## What you need before you start

You need three pieces working together:

1. **The engine script** — `dist/jslade.min.js` from the npm package, or the same file copied
   to your static assets directory.
2. **At least one component source** — a `<noembed>` block with a `<template>` and optional
   `<script>` / `<style scoped>`. Often saved as `components/…/*.jsd` for convenience.
3. **A mount point in your HTML** — a `<jslade name="…">` element where the live component
   should appear, plus a short boot script that calls `Jslade.import()` (when templates come
   from the server) and **`Jslade.start()`** (always required).

Nothing becomes interactive until you call **`Jslade.start()`** (alias: **`Jslade.bootstrap()`**).
There is no autostart. If
you forget that call, placeholders stay empty and the page looks broken even when everything
else is correct.

---

## Complete example: a cart line item

The following example is intentionally complete. You can copy each file as-is, adjust paths,
and open the page through a web server.

### Component file: `components/cart/item.jsd`

```html
<noembed name="cart/item">
<script>
props({
    item: null,
    quantity: 1,
})

function increment() {
    this.quantity = this.quantity + 1
}

function decrement() {
    this.quantity = Math.max(1, this.quantity - 1)
}

function lineTotal() {
    if (!this.item) return '0.00'
    return (this.item.price * this.quantity).toFixed(2)
}
</script>

<style scoped>
.row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e3e7ec;
}
.name { flex: 1; }
.qty {
    font-weight: 600;
    min-width: 1.5rem;
    text-align: center;
}
.btn {
    padding: 0.25rem 0.6rem;
    border: 1px solid #ced4da;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
}
.total { color: #087f5b; font-weight: 600; }
</style>

<template>
<div style-scoped class="row">
    <span class="name">{{ item.name }}</span>
    <button type="button" class="btn" @click(this.decrement())">−</button>
    <span class="qty">{{ quantity }}</span>
    <button type="button" class="btn" @click(this.increment())">+</button>
    <span class="total">${{ lineTotal() }}</span>
</div>
</template>
</noembed>
```

The `name` on the outer `<noembed>` tag is the component id. Every placeholder
that mounts this component must use exactly the same name: `cart/item`.

### Page: `cart.html`

In production your backend builds the import map from `.jsd` files on disk. For this
standalone example the map is inlined in the script block. The important part is the shape:
each key is a component name, each value is the **full raw file text** including the outer
`<noembed>` tag.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cart demo</title>
</head>
<body>
    <h1>Shopping cart</h1>

    <jslade name="cart/item"
            props='{ "item": { "name": "Mechanical keyboard", "price": 49 }, "quantity": 1 }'>
    </jslade>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.import({
            'cart/item': '<noembed name="cart/item">\n<script>\nprops({\n    item: null,\n    quantity: 1,\n})\n\nfunction increment() {\n    this.quantity = this.quantity + 1\n}\n\nfunction decrement() {\n    this.quantity = Math.max(1, this.quantity - 1)\n}\n\nfunction lineTotal() {\n    if (!this.item) return \'0.00\'\n    return (this.item.price * this.quantity).toFixed(2)\n}\n<\/script>\n\n<style scoped>\n.row {\n    display: flex;\n    gap: 0.75rem;\n    align-items: center;\n    padding: 0.5rem 0;\n    border-bottom: 1px solid #e3e7ec;\n}\n.name { flex: 1; }\n.qty {\n    font-weight: 600;\n    min-width: 1.5rem;\n    text-align: center;\n}\n.btn {\n    padding: 0.25rem 0.6rem;\n    border: 1px solid #ced4da;\n    background: #fff;\n    border-radius: 4px;\n    cursor: pointer;\n}\n.total { color: #087f5b; font-weight: 600; }\n<\/style>\n\n<template>\n<div style-scoped class="row">\n    <span class="name">{{ item.name }}</span>\n    <button type="button" class="btn" @click(this.decrement())">−</button>\n    <span class="qty">{{ quantity }}</span>\n    <button type="button" class="btn" @click(this.increment())">+</button>\n    <span class="total">${{ lineTotal() }}</span>\n</div>\n</template>\n</noembed>',
        })

        Jslade.start()
    </script>
</body>
</html>
```

When you open this page, the engine registers the component source, compiles it on first
mount, reads the `props` attribute on the `<jslade>` element, and renders the cart row.
Clicking **+** or **−** updates `quantity` in the live instance state and the DOM patches
in place.

In a real project you do not hand-escape the file into a string. Your server reads
`components/cart/item.jsd` and emits JSON. The registration guide covers that pattern in
full.

---

## Boot sequence explained

Understanding the order of operations saves a lot of debugging time.

```
1. Browser loads jslade.min.js
       → global Jslade object is available

2. Your page script runs Jslade.import({ … })
       → component sources are stored in memory (not yet compiled)
       → duplicate names are ignored (first registration wins)

3. Your page script runs Jslade.start()
       → scanDOM() picks up any <noembed name="…"> still in the page
       → every <jslade name="…"> placeholder is found and mounted
       → each component compiles on first use, then renders into its placeholder

4. User interacts with the UI
       → methods run, state changes
       → template re-runs for that instance, DOM is patched
       → updated() hook runs (not mount() again)
```

Call **`import()` before `start()`** when templates come from the server and you want that
map to take precedence over any in-page `<noembed>` definitions with the same name.

Call **`start()` again** after you inject new `<jslade>` placeholders via AJAX. The call is
idempotent for definitions already registered; it mounts any placeholder that does not yet
have a live instance attached.

---

## Loading the engine

### Script tag (typical for server-rendered sites)

```html
<script src="/assets/js/jslade.min.js"></script>
<script>
    Jslade.import(/* your map */)
    Jslade.start()
</script>
```

Copy `node_modules/jslade/dist/jslade.min.js` to your public assets folder, or serve it
from the path your bundler emits. The file is self-contained: no other scripts are required.

### npm / ESM (bundled apps or module-based tooling)

```js
import { Jslade } from 'jslade'

Jslade.import({ 'cart/item': rawText })
Jslade.start()
```

The package exposes the engine source as ESM via `src/jslade/index.js` and the production
bundle as UMD via `dist/jslade.min.js`. Most server-rendered integrations use the minified
script tag; bundler setups use the import above.

---

## The `<jslade>` placeholder

The placeholder declares **where** a component mounts and **what initial data** it receives.

```html
<jslade name="cart/item"
        props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 2 }'>
</jslade>
```

| Attribute | Required | Purpose |
|---|---|---|
| `name` | Yes | Must match a registered component name (`cart/item`) |
| `props` | No | Initial data merged over `props()` defaults from the script block |

**Always use a closing tag.** Write `</jslade>`, not `<jslade … />`. HTML parsers treat
self-closing custom elements inconsistently and placeholders may fail silently.

### Props format

Strict JSON works and is the safest choice inside HTML attributes:

```html
props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 1 }'
```

Jslade also accepts JavaScript object literal syntax when JSON.parse fails:

```html
props='{ item: { name: "Keyboard", price: 49 }, quantity: 1 }'
```

If the attribute is malformed, the engine logs a warning and mounts with `{}` merged only
over script defaults.

---

## `Jslade.start()` options

```js
Jslade.start({
    dev: true,           // extra console warnings — use while developing
    showChannels: false, // log WireBus traffic when true
    mount: true,         // false = scan definitions only, do not mount placeholders
    root: document,      // limit placeholder search to a subtree
})
```

| Option | Default | When to change it |
|---|---|---|
| `dev` | `false` | Set `true` during development to surface template and handler issues |
| `showChannels` | `false` | Set `true` when debugging Wire message flow between components |
| `mount` | `true` | Set `false` if you only want to register in-page definitions without mounting yet |
| `root` | `document` | Pass a container element when placeholders live inside a panel loaded via AJAX |

Example: mount only inside a panel that was just inserted:

```js
const panel = document.getElementById('dynamic-panel')
Jslade.start({ root: panel })
```

---

## Verifying the setup

After `start()` runs, the placeholder element receives a **`.component`** property pointing
at the live root instance:

```js
const el = document.querySelector('jslade[name="cart/item"]')
const instance = el.component

console.log(instance.state.quantity)   // current reactive state
console.log(Jslade.list())             // compiled component names only
```

If `el.component` is `undefined`, work through this checklist:

1. Did you call **`Jslade.start()`**?
2. Does the **`name`** on `<jslade>` exactly match a key passed to **`import()`** or a
   `<noembed name="…">` picked up by scanDOM?
3. Is the placeholder written with a **closing `</jslade>`** tag?
4. Did **`import()`** run before **`start()`** when using a server map?
5. Open the browser console with **`Jslade.start({ dev: true })`** and read any warnings.

---

## One-shot HTML vs live components

Jslade offers two render paths. For anything the user can interact with, you want the live
path described in this guide.

| | `Jslade.render(name, data)` | `<jslade>` / `Jslade.renderTo()` |
|---|---|---|
| Output | HTML string | Live DOM inside the page |
| Reactive `state` | No | Yes — writes trigger re-render |
| `mount()` / `updated()` | No | Yes |
| Typical use | Preview snippets, static fragments | Buttons, forms, filters, widgets |

```js
// One-shot: no instance, no reactivity
const html = Jslade.render('cart/item', { item: { name: 'Mouse', price: 29 }, quantity: 1 })
document.getElementById('preview').innerHTML = html

// Live: returns an instance you can update
const row = Jslade.renderTo('#slot', 'cart/item', { item: { name: 'Mouse', price: 29 }, quantity: 1 })
row.state.quantity = 3   // DOM updates
```

Use **`render()`** only when you need a string of HTML and never plan to update it through
Jslade. Use **`<jslade>`** or **`renderTo()`** for every interactive widget on the page.

---

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

---

## Common first-time mistakes

**Empty placeholder after load.** Almost always means `start()` was never called, the
component name does not match the import map, or the placeholder is self-closing.

**Clicks do nothing.** Event handlers must call **`this.methodName()`**, not bare
`methodName()`. Methods must be declared with **`function name() { … }`**, not
`const name = () => {}`.

**Props seem ignored.** Check that the attribute name is `props`, that quotes inside the
JSON are valid for HTML, and that keys match the names used in `props({ … })` in the script
block.

**Component works once but not after AJAX navigation.** New placeholders need
**`Jslade.start({ root: container })`** or **`Jslade.mountAll(container)`** after the HTML
is inserted. Definitions already in memory do not need to be imported again unless names
changed.

**Styles missing on a scoped component.** Scoped CSS requires both `<style scoped>` in the
file and the **`style-scoped`** attribute on the markup root inside the template block.
Without `style-scoped`, rules compile but nothing in the DOM matches them.
