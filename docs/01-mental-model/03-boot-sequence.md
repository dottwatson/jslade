# Boot sequence

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
    showChannels: false, // log Wire traffic when true
    mount: true,         // false = scan definitions only, do not mount placeholders
    root: document,      // limit placeholder search to a subtree
})
```

| Option | Default | When to change it |
|---|---|---|
| `dev` | `false` | Set `true` during development to surface template and handler issues |
| `showChannels` | `false` | Set `true` when debugging `wire` / `localWire` message flow |
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

