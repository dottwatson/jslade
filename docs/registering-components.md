# Registering components

Before Jslade can render or mount a component, the engine must know its **name** and its
**source**. Registration means storing that pair in memory. Compilation happens later, on
first use — you can register dozens of components at boot and pay compile cost only for the
ones actually mounted on the page.

The contract is always the same:

```
component name  →  raw <noembed>…</noembed> source text
```

The raw text includes the full outer `<noembed name="…">…</noembed>` block.
Your backend, build step, or inline HTML provides the map; Jslade parses and compiles when
a placeholder or `renderTo()` call needs that name.

**File extension:** Jslade does not require `*.jsd`. That extension is a **project convention**
for organising sources and for editor syntax highlighting. Your backend or build step can
scan any file format you choose.

Nothing mounts until you call **`Jslade.start()`** (or the alias **`Jslade.bootstrap()`**).
Use **`Jslade.renderTo()`** only after the template is registered — via **`import()`**,
in-page **`<noembed>`**, or **`compile()`**. There is no autostart.

---

## Names and matching rules

Component names are strings using slash-separated paths by convention:

```
cart/item
demo/showcase
admin/users/row
```

Rules that affect registration and mounting:

- **`import()` normalises keys:** backslashes become slashes, leading and trailing slashes
  are removed (`cart\item` and `/cart/item/` both register as `cart/item`).
- **`<noembed name="…">`, `<jslade name="…">`, and `@component('…')` use the name exactly
  as written** — they are not normalised. Match the string you pass to **`import()`**.
- **First registration wins.** If you call `import()` twice with the same name, the second
  source is silently skipped.
- Compile is **lazy.** Registration only stores source; compilation runs when the component
  is first rendered or mounted.

---

## Method 1 — Server-generated import map (production)

This is the pattern most server-rendered applications use. At request time (or at build time
for static sites) the server reads component sources from disk and embeds a JSON object in the
page. The browser passes that object directly to `Jslade.import()`. Examples below use
`*.jsd` — swap the glob for whatever naming convention you prefer.

### Page template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Shop</title>
</head>
<body>
    <h1>Your cart</h1>

    <jslade name="cart/item"
            props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 1 }'>
    </jslade>

    <jslade name="cart/summary" props='{ "items": [] }'></jslade>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.import(/* SERVER_EMBEDS_JSON_HERE */)
        Jslade.start()
    </script>
</body>
</html>
```

The JSON shape:

```json
{
    "cart/item": "<noembed name=\"cart/item\">…entire file…</noembed>",
    "cart/summary": "<noembed name=\"cart/summary\">…entire file…</noembed>"
}
```

Each value is the **complete file contents**, not just the inner `<script>` or `<template>`.

### PHP example

```php
<?php
declare(strict_types=1);

function jslade_import_map(string $componentsDir): array
{
    if (!is_dir($componentsDir)) {
        throw new InvalidArgumentException("Components directory not found: {$componentsDir}");
    }

    $map = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($componentsDir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if (!$file->isFile() || !str_ends_with(strtolower($file->getFilename()), '.jsd')) {
            continue;
        }

        $raw = trim((string) file_get_contents($file->getPathname()));
        if (!preg_match('/<noembed\s+name="([^"]+)"/', $raw, $match)) {
            continue;
        }

        $name = trim(str_replace('\\', '/', $match[1]), '/');
        if ($name === '') {
            continue;
        }
        if (isset($map[$name])) {
            throw new RuntimeException("Duplicate component name \"{$name}\".");
        }

        $map[$name] = $raw;
    }

    ksort($map);
    return $map;
}

function jslade_import_json(array $map): string
{
    return json_encode(
        $map,
        JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE
            | JSON_HEX_TAG
            | JSON_HEX_AMP
            | JSON_HEX_QUOT
            | JSON_HEX_APOS
            | JSON_THROW_ON_ERROR
    );
}

$map = jslade_import_map(__DIR__ . '/components');
$json = jslade_import_json($map);
```

Embed in the page:

```html
<script>
    Jslade.import(<?= $json ?>)
    Jslade.start()
</script>
```

Use `JSON_HEX_TAG` (or equivalent in your stack) so `</script>` sequences inside component
source cannot break out of the script block.

### Node.js example

```js
import fs from 'node:fs'
import path from 'node:path'

function loadJsladeMap(componentsDir) {
    const map = {}

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(abs)
                continue
            }
            if (!entry.name.endsWith('.jsd')) continue

            const raw = fs.readFileSync(abs, 'utf8').trim()
            const match = raw.match(/<noembed\s+name="([^"]+)"/)
            if (!match) continue

            const name = match[1].replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
            if (!name) continue
            if (map[name]) {
                throw new Error(`Duplicate component name "${name}" in ${abs}`)
            }
            map[name] = raw
        }
    }

    walk(componentsDir)
    return map
}

// In your route handler or SSR render:
const map = loadJsladeMap(path.join(process.cwd(), 'components'))
const scriptContent = `Jslade.import(${JSON.stringify(map)}); Jslade.start();`
```

Any language that can read files and emit JSON can implement the same helper. Only the
`{ "name": "rawSource" }` shape matters to Jslade.

### When to prefer this method

Use a server map when components live on disk or in a CMS, when you want a single source of
truth per deployment, and when you do not want component source visible as HTML in the page
outside the boot script. This scales to large component libraries because only registered
names consume memory and only mounted names pay compile cost.

---

## Method 2 — `Jslade.import()` from JavaScript

Call **`Jslade.import(templates, options?)`** in a page script or module after the engine
loads and before **`Jslade.start()`** when placeholders are already in the DOM.

```js
Jslade.import({
    'cart/item': cartItemRawText,
    'cart/summary': cartSummaryRawText,
})

Jslade.start()
```

| Value type | When to use it |
|---|---|
| **String** (recommended) | Full source text including `<noembed>` wrapper (often saved as `*.jsd`) |
| **Object** `{ script, markup, scopedStyles, scopeTargets }` | Programmatically generated defs, tests, tooling |

### Clearer compile errors

Pass a **`sources`** map so error messages include file paths:

```js
Jslade.import(
    {
        'cart/item': fs.readFileSync('components/cart/item.jsd', 'utf8'),
        'cart/summary': fs.readFileSync('components/cart/summary.jsd', 'utf8'),
    },
    {
        sources: {
            'cart/item': 'components/cart/item.jsd',
            'cart/summary': 'components/cart/summary.jsd',
        },
    }
)
```

### Idempotency

```js
Jslade.import({ 'cart/item': versionA })
Jslade.import({ 'cart/item': versionB })   // ignored — versionA remains registered
```

To replace a definition in the same session you must remove it from the internal registries
manually (advanced) or reload the page. In normal applications each page load registers once.

### Return value

`import()` returns an array of names **newly registered** in that call. An empty array means
every name was already present.

```js
const added = Jslade.import({ 'cart/item': raw })
console.log(added)   // ['cart/item'] on first call, [] on second
```

---

## Method 3 — In-page `<noembed>` markup

For prototypes, documentation pages, and playgrounds you can define components directly in
HTML. **`Jslade.start()`** calls **`scanDOM()`**, which finds every
`<noembed name="…">` element and registers its contents before mounting
placeholders.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Hello demo</title>
</head>
<body>
    <jslade name="demo/hello" props='{ "name": "Ada" }'></jslade>

    <noembed name="demo/hello">
        <script>
            props({ name: 'world' })

            function greet() {
                this.name = 'clicked!'
            }
        </script>

        <template>
            <p>Hello, {{ name }}!</p>
            <button type="button" @click(this.greet())">Greet</button>
        </template>
    </noembed>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.start()
    </script>
</body>
</html>
```

No **`import()`** call is required when every component you mount is defined this way in the
page. If you mix both, call **`import()` before `start()`** when the server map should
override an in-page definition with the same name.

After a component compiles from an in-page definition, the engine **removes the
`<noembed>` node** from the DOM. The definition lives in memory only. For repeated
edit-compile cycles in a playground you re-insert the markup or sync from an editor before
calling **`start()`** again.

---

## Method 4 — `Jslade.renderTo()` (programmatic mount)

When you control the container in JavaScript and do not need a declarative `<jslade>`
placeholder, **`Jslade.renderTo()`** renders and mounts a template that is already
registered (or still held as lazy source from **`import()`** / **`scanDOM()`**).
It does not register new component source by itself.

```js
Jslade.import({ 'cart/item': rawText })

const row = Jslade.renderTo(
    '#cart-lines',
    'cart/item',
    { item: { name: 'Keyboard', price: 49 }, quantity: 2 }
)

row.state.quantity = 5
row.find('.qty').textContent
row.unmount()
```

| Argument | Type | Purpose |
|---|---|---|
| `container` | Element, selector string, or `null` | Where to mount; `null` creates a detached instance |
| `templateName` | string | Registered component name |
| `renderData` | object | Props merged over `props()` defaults |
| `parentRef` | instance or null | Optional parent for tree wiring |

The container element receives **`.component`** pointing at the root instance, the same as
`<jslade>` placeholders after **`start()`**.

```js
const el = document.querySelector('#cart-lines')
const instance = el.component
```

### Detached instances

```js
const widget = Jslade.renderTo(null, 'cart/item', { item, quantity: 1 })
// … later, when the target exists:
widget.renderTo('#sidebar')
```

`mount()` runs **immediately** after the first render completes — even when the container
is `null`. Attaching the instance later with **`instance.renderTo('#target')`** only
appends the container; it does not re-run **`mount()`**. A detached instance can receive
state updates before it is attached to the document.

---

## Method 5 — `Jslade.compile()` at runtime

When you generate a component entirely in JavaScript without a file on disk:

```js
Jslade.compile('dynamic/banner', {
    script: 'props({ text: "" })',
    markup: '<p>{{ text }}</p>',
    scopedStyles: '',
    scopeTargets: false,
})

const banner = Jslade.renderTo('#slot', 'dynamic/banner', { text: 'Sale today' })
```

**`compile()`** compiles immediately and **replaces** any existing compiled definition
with the same name. Only **`import()`** is idempotent (first registration wins). Prefer
`*.jsd` files (or your team’s convention) for anything maintained by hand.

---

## Mounting with `<jslade>` placeholders

After registration, declarative mounting uses custom elements in your HTML:

```html
<jslade name="cart/item"
        props='{ "item": { "name": "Mouse", "price": 29 }, "quantity": 1 }'>
</jslade>
```

**`Jslade.start()`** finds every `<jslade name="…">` under **`root`** (default: whole
document), compiles if needed, merges props, and attaches a live instance.

Always use **`</jslade>`** — never self-closing form.

### Props on the placeholder

Merged over script defaults from `props()`:

```html
<jslade name="cart/item" props='{ "quantity": 5 }'></jslade>
```

Strict JSON or object literal syntax (see getting-started guide).

---

## AJAX and dynamically inserted HTML

Two common patterns:

### New placeholders in injected HTML

```js
const container = document.getElementById('panel')
container.innerHTML = `
    <jslade name="reports/table" props='{ "rows": [] }'></jslade>
`

Jslade.start({ root: container })
```

Definitions already registered through **`import()`** do not need to be imported again.
Only the new placeholders mount.

Alternatively:

```js
Jslade.mountAll(container)
```

### Templates and data in one API response

```json
{
    "templates": {
        "reports/table": "<noembed name=\"reports/table\">…</noembed>"
    },
    "rows": [
        { "id": 1, "label": "January" },
        { "id": 2, "label": "February" }
    ]
}
```

```js
const payload = await fetch('/api/panel').then(function (r) { return r.json() })

Jslade.import(payload.templates)

const panel = Jslade.renderTo('#slot', 'reports/table', { rows: payload.rows })

// later, update without re-importing templates:
panel.state.rows = newRows
```

Keep a reference to the instance returned from **`renderTo()`** or read
**`element.component`** on the mount node. Templates stay registered; only state changes.

---

## Hybrid registration

You can combine methods on one page:

```js
// Bulk from server
Jslade.import(serverMap)

// start() also scanDOM() — picks up any <noembed> in the page
Jslade.start()
```

Server map first, then **`start()`** — in-page definitions with duplicate names lose because
**first registration wins** and **`import()`** should run before **`start()`** when the
server map must win.

---

## Choosing a registration method

| Scenario | Recommended approach |
|---|---|
| Production site with sources on disk | Server embeds JSON map → `import()` → `start()` |
| Prototype or docs page | In-page `<noembed>` → `start()` only |
| Admin panel loading a widget via fetch | `import()` new templates once → `renderTo()` |
| Single widget controlled entirely in JS | `import()` or `compile()` → `renderTo()` |
| List of rows rendered server-side as HTML strings | `render()` per row (no registration of mount) OR one parent `<jslade>` with data props |

---

## Introspection and troubleshooting

```js
Jslade.list()                    // compiled component names only
Jslade.instances()               // snapshot of live instances by template name
document.querySelector('jslade[name="cart/item"]').component
```

Names still held as lazy source in memory (registered via **`import()`** but not yet
compiled) do **not** appear in **`list()`** until first use.

| Symptom | Likely cause |
|---|---|
| Empty `<jslade>` after load | `start()` not called; name mismatch; self-closing placeholder |
| `import()` returns `[]` but mount fails | Name in placeholder differs from name inside file; compile error in source |
| Second import does not update definition | Idempotency — first registration wins; reload page |
| Child `@component` not found | Parent registered but child name missing from map |
| In-page definition disappeared | Normal — engine removes `<noembed>` after compile |

Run **`Jslade.start({ dev: true })`** during development for console warnings that name the
component and approximate source location when compile fails.

---

## Checklist before shipping

1. Every **`name`** in **`import()`** matches **`<noembed name="…">`** inside the
   corresponding file.
2. Every **`<jslade name="…">`** on the page has a registered definition before mount.
3. **`Jslade.start()`** runs after **`import()`** when both are used.
4. Interactive UI uses **`<jslade>`** or **`renderTo()`**, not **`render()`**, unless the
   output is intentionally static.
5. Lists that change shape pass **`key`** on **`@component`** or repeated elements.
6. Ship **`dist/jslade.min.js`** from the package; run **`npm run build`** in the package
   after upgrading the dependency.
