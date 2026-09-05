# Components

This guide explains how to write Jslade components: file structure, script block, template
directives, styling, parent/child trees, lifecycle, reactive state, and communication between
instances. It is written for developers implementing features, not for contributors working
on the engine source.

A component is always a **`<noembed>…</noembed>`** block — saved on disk, embedded in HTML,
or delivered at runtime. The browser compiles it the first time that name is rendered or
mounted. After compilation the source string is no longer needed for that session, but in
practice you keep sources on disk or in your CMS and register them on each page load.

You can **declare** a component in three equivalent ways: pass raw source to
**`Jslade.import()`**, write a **`<noembed>`** block directly in the page, or
register programmatically **after `Jslade.start()`** when an AJAX response arrives. The
markup shape is always the same; only the delivery channel changes.

---

## File structure

Every component follows the same outer shape. **The engine does not care about file names or
extensions** — it only parses the `<noembed>` string. Saving sources as **`*.jsd`** is a
**convention** in this package: it keeps components easy to find and lets VS Code / Cursor apply
syntax highlighting (when you configure a grammar or file association for `.jsd`). You may
use any path, extension, or storage (`.txt`, no extension, database, CMS) as long as
`Jslade.import()` receives the full `<noembed>…</noembed>` text.

```html
<noembed name="namespace/component-name">
<script>
    … JavaScript: props, methods, lifecycle …
</script>

<style scoped>
    … optional component-local CSS …
</style>

<template>
    … markup: HTML + Jslade directives …
</template>
</noembed>
```

| Block | Required | Purpose |
|---|---|---|
| `<noembed name="…">` | Yes | Declares the component id used in `import()`, `<jslade name="…">`, and `@component('…')` |
| `<script>` | No | `props()`, `use()`, methods, `mount()` / `updated()` / `unmount()` |
| `<style scoped>` | No | CSS limited to nodes marked with `style-scoped` in the template |
| `<template>` | Yes | Markup template (may be empty but the block must exist) |

The three inner blocks may appear in **any order**. Only one block of each kind is allowed
per file. Nested `<template>` tags inside the markup block are **not** allowed.

The `name` uses slash-separated paths by convention (`cart/item`, `demo/showcase`).
**`import()`** normalises keys (`cart\item` → `cart/item`); names on **`<noembed>`**,
**`<jslade>`**, and **`@component('…')`** must match the registered string exactly.

When you pass the file to `Jslade.import()`, pass the **entire file text** including the
outer `<noembed>` wrapper. You do not construct `{ script, markup, … }` objects
yourself unless you are generating components programmatically at runtime.

---

## Declaring components

The **`<noembed>`** tag is the only wrapper for component definitions. A **`.jsd` file** is
conventionally that same block saved on disk — the extension is optional and not interpreted
by Jslade.

Browsers parse `<noembed>` as **raw text**: inner `<script>` blocks do not run at page load,
and directive attributes such as `@input(this.onDraft(event))` keep their original casing.
The engine reads the definition from the element’s **`outerHTML`** string (via **`scanDOM()`**
or **`import()`**), not from parsed child nodes.

The `<noembed>` block is the single source format. How it reaches the browser is
up to you.

| Channel | Typical use |
|---|---|
| **`.jsd` on disk + `Jslade.import()`** | Production — server reads sources and embeds a JSON map |
| **`<noembed>` in the HTML page** | Prototypes, documentation, playgrounds — no import call needed |
| **Runtime registration** | AJAX panels, lazy-loaded widgets, code loaded after the first `start()` |

Mounting is always separate: a **`<jslade name="…">`** placeholder in the page, or
**`Jslade.renderTo()`** in JavaScript. Writing the component definition does not display
anything until a placeholder is mounted or `renderTo()` runs.

### In-page declaration

You can embed the full component in HTML. On **`Jslade.start()`**, **`scanDOM()`** finds
every `<noembed name="…">` and registers it before placeholders mount.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Inline component</title>
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

No **`import()`** call is required when every mounted component is defined this way in the
page. The definition and the placeholder can live anywhere in the document — order does not
matter as long as **`start()`** runs after both are in the DOM.

After the component compiles, the engine **removes the `<noembed>` node** from the
DOM. The compiled definition stays in memory for the rest of the session.

### File on disk + `Jslade.import()` (production)

```html
<jslade name="demo/showcase" props='{ "title": "My board" }'></jslade>

<script src="/assets/js/jslade.min.js"></script>
<script>
    Jslade.import({
        'demo/showcase': '…full showcase.jsd text…',
        'demo/showcase-chip': '…full showcase-chip.jsd text…',
    })
    Jslade.start()
</script>
```

Parent components that use **`@component('demo/showcase-chip', …)`** need every referenced
name registered before they mount.

### Runtime — after `Jslade.start()` has already run

The first **`start()`** does not lock the registry. You can register **new names** later —
from an AJAX payload, a user action, or injected HTML — as long as that name was not
registered earlier in the same page session (**first registration wins**; you cannot replace
an existing name without reloading the page).

#### Pattern A — AJAX delivers component source + data

The API returns the raw `<noembed>` string together with initial props:

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
Jslade.start({ dev: true })

document.getElementById('load-report').addEventListener('click', function () {
    fetch('/api/report-panel')
        .then(function (r) { return r.json() })
        .then(function (payload) {
            Jslade.import(payload.templates)

            var slot = document.getElementById('report-slot')
            slot.innerHTML = '<jslade name="reports/table"></jslade>'

            Jslade.start({ root: slot })

            var el = slot.querySelector('jslade[name="reports/table"]')
            if (el && el.component) {
                el.component.state.rows = payload.rows
            }
        })
})
```

Alternatively mount imperatively without a placeholder:

```js
Jslade.import(payload.templates)

var panel = Jslade.renderTo('#report-slot', 'reports/table', { rows: payload.rows })

// later — update data without re-importing the template:
panel.state.rows = newRows
```

Keep the **`renderTo()`** return value or **`element.component`** to update state after the
initial mount.

#### Pattern B — inject `<noembed>` markup into the page

Useful when the server sends HTML fragments or you build the definition in a playground
editor:

```js
Jslade.start()

function loadWidget(sourceHtml) {
    var anchor = document.getElementById('widget-anchor')
    anchor.innerHTML = sourceHtml

    Jslade.start({ root: anchor })
}
```

```html
<div id="widget-anchor"></div>
<div id="widget-mount">
    <jslade name="dynamic/widget" props='{ "label": "Live" }'></jslade>
</div>
```

```js
loadWidget(
    '<noembed name="dynamic/widget">' +
    '<script>props({ label: "" })<\/script>' +
    '<template><p>{{ label }}</p></template>' +
    '</noembed>'
)

Jslade.start({ root: document.getElementById('widget-mount') })
```

The first **`start()`** inside **`loadWidget`** registers the definition from the injected
**`<noembed>`**. The second **`start()`** mounts the placeholder under
**`#widget-mount`**.

#### Pattern C — `Jslade.compile()` for generated defs

When you build the definition object in JavaScript without a `.jsd` string:

```js
Jslade.compile('dynamic/banner', {
    script: 'props({ text: "" })',
    markup: '<p>{{ text }}</p>',
    scopedStyles: '',
    scopeTargets: false,
})

Jslade.renderTo('#banner-slot', 'dynamic/banner', { text: 'Sale ends tonight' })
```

**`compile()`** compiles immediately and **replaces** any existing compiled definition
with the same name. Only **`import()`** is idempotent (first registration wins).

### Summary

```
Initial page load
    → Jslade.import(…)     optional — server map
    → <noembed>   optional — in-page defs picked up by scanDOM()
    → Jslade.start()       required — register + mount placeholders

Later (AJAX, user action)
    → Jslade.import({ newName: raw })   new names only
    → or inject <noembed> + Jslade.start({ root })
    → or Jslade.compile(name, def)
    → mount: new <jslade> + start({ root })  or  renderTo(…)
```

---

## Reference component: showcase board

The package ships a full-featured demo under **`playgrounds/sandbox/components/demo/`**:

| File | Role |
|---|---|
| `showcase.jsd` | Parent board — props, filters, nested `@foreach`, Wire, `@component` |
| `showcase-chip.jsd` | Child chip — parent/child scope, Wire reply |

Run it locally: `npm run build && npm run dev` →
[http://localhost:5173/playgrounds/sandbox/](http://localhost:5173/playgrounds/sandbox/)

### Parent highlights (`showcase.jsd`)

```html
@foreach(category.items as task)
    <li data-task-id="{{ task.id }}"
        @click(this.selectTask(Number(event.currentTarget.getAttribute('data-task-id'))))>
        …
    </li>
@endforeach

@component('demo/showcase-chip', {
    key: task.id,
    taskId: task.id,
    label: task.label,
    highlight: task.id === selectedId,
})
```

```js
mount((send, receive) => {
    receive('showcase/ping', (data) => {
        this.state.childMessage = 'WireBus da ' + data.from + ' id=' + data.id
    })
})
```

### Child highlights (`showcase-chip.jsd`)

```js
function notifyParent() {
    if (!this.parent) return
    this.parent.state.childMessage = 'Chip ' + this.taskId + ' cliccato; this.parent ok'
    Jslade.send('showcase/ping', { from: 'chip', id: this.taskId })
}
```

### Mounting the example

```html
<jslade name="demo/showcase" props='{ "title": "Sandbox board" }'></jslade>

<script src="/assets/js/jslade.min.js"></script>
<script>
Jslade.import({
    'demo/showcase': '…full playgrounds/sandbox/components/demo/showcase.jsd text…',
    'demo/showcase-chip': '…full playgrounds/sandbox/components/demo/showcase-chip.jsd text…',
})
Jslade.start()
</script>
```

Both components must be registered before `start()` because the parent template references
`demo/showcase-chip` through `@component`.

### Legacy format

The engine no longer supports **`<template name="…">`** as a component wrapper. Use
**`<noembed name="…">`** only. Legacy markup logs a console warning and is ignored.

---

## The script block

### `props({ … })` — default state

Values declared in `props()` become the component's initial reactive state. Data passed from
`renderTo()`, `<jslade props='…'>`, or `@component(…, { … })` is **merged on top** of these
defaults.

```js
props({
    title: 'Tasks',
    items: [],
    draft: '',
})
```

Defaults are **deep-cloned per instance**. Two mounted copies of the same component do not
share the same array reference from `props()`.

### `use({ … })` — external helpers

Import functions or objects from the outer page into template expressions:

```js
use({ formatPrice: window.formatPrice, api: window.myApi })
```

```html
<span>{{ formatPrice(item.price) }}</span>
```

`use()` bindings are available in markup and `@js` blocks. They are not automatically
properties on `this` unless you also assign them in `mount()`.

### Methods — always `function name() { … }`

```js
function increment() {
    this.quantity = this.quantity + 1
}
```

Call methods from markup as `{{ lineTotal() }}` or `@click(this.increment())`.

Use **`function` declarations**. The script scanner does not register `const increment = () => {}`
or `increment: function () {}` inside arbitrary objects as template methods.

Inside methods and lifecycle hooks, **`this.prop`** is shorthand for **`this.state.prop`**.
Assigning to either form schedules a re-render on live instances.

### Lifecycle hooks

Hooks run only on **live** instances created through `<jslade>` or `renderTo()`.

| Hook | When it runs | How often |
|---|---|---|
| `mount(fn)` | After the component DOM is committed | Once per instance |
| `updated(fn)` | After each re-render | Every update; not on first paint |
| `unmount(fn)` | Before the instance is destroyed | Once per instance |

All hooks receive **`(send, receive)`** for Wire channels (see below).

```js
mount(function (send, receive) {
    var self = this
    fetch('/api/tasks').then(function (r) { return r.json() }).then(function (data) {
        self.items = data
    })
    receive('tasks/refresh', function () {
        fetch('/api/tasks').then(function (r) { return r.json() }).then(function (data) {
            self.items = data
        })
    })
})

updated(function () {
    var list = this.find('.board')
    if (list) list.scrollTop = 0
})

unmount(function () {
    clearInterval(this.pollTimer)
})
```

**`mount()` runs once.** Safe place for fetch calls and subscriptions. Re-renders do not
re-enter `mount()`. **`updated()`** must not write to `state` in a way that triggers another
update on every pass — the engine stops after 50 chained renders and **logs an error** (no
exception is thrown).

Parent re-renders do **not** re-run a child's `mount()` as long as the child's **`key`**
(on `@component` or a `key` attribute in a loop) is still present in the parent's output.

---

## Reactive state

`instance.state` is a reactive proxy. Reads and writes through the template, methods, and
hooks all go through the same object.

```js
// From outside after renderTo() or via element.component:
instance.state.filter = 'done'
instance.state.items.push({ id: 99, label: 'New', done: false })

// Inside a method:
this.draft = ''
this.items = this.items.concat(newItem)
```

When state changes on a live instance:

1. The full template function for that instance runs again.
2. The existing DOM is patched (not replaced wholesale after the first mount).
3. Child instances with a stable `key` are preserved where possible.
4. `updated()` runs on the instance.
5. Multiple writes in the same synchronous turn are batched into one re-render.

---

## Template syntax

### Output expressions

| Syntax | Effect |
|---|---|
| `{{ expr }}` | HTML-escaped output |
| `{!! expr !!}` | Raw HTML — use only for trusted content |
| `{{-- comment --}}` | Removed at compile time |
| `@@` | Literal `@` in output |

### Conditionals

```html
@if(items.length === 0)
    <p class="empty">Nothing here.</p>
@elseif(items.length === 1)
    <p>One item.</p>
@else
    <p>{{ items.length }} items.</p>
@endif
```

Expressions in `@if` / `@elseif` use the same JavaScript subset as methods (see below).

### Loops

```html
@foreach(items as item)
    <div data-id="{{ item.id }}">{{ item.label }}</div>
@endforeach
```

Inside a `@foreach` loop the **`$loop`** object exposes:

| Property | Meaning |
|---|---|
| `$loop.index` | Zero-based index |
| `$loop.first` | `true` on the first iteration |
| `$loop.last` | `true` on the last iteration |
| `$loop.count` | Total number of items |

```html
@for(var i = 0; i < 3; i++)
    <span>Item #{{ i }}</span>
@endfor
```

```html
@forIn(metadata, key)
    <dt>{{ key }}</dt>
    <dd>{{ metadata[key] }}</dd>
@endforIn
```

### `@js` … `@endjs`

Runs on **every render** while HTML is being assembled. Use it to compute values for the
markup below — not to touch the DOM, because target nodes from this render pass do not exist
yet in the document.

```html
@js
    var summary = this.items.filter(function (i) { return !i.done }).length + ' open'
@endjs
<p>{{ summary }} tasks remaining</p>
```

For DOM measurements or focus management, use **`mount()`** or **`updated()`** instead.

### `@dump(expr)` — debug output

Logs the expression value to the console on each render:

```html
@dump(visibleTasks().length)
```

Useful during development; remove from production templates.

---

## Event directives

Built-in event directives: **`@click`**, **`@input`**, **`@change`**, **`@submit`**,
**`@keydown`**, **`@focus`**, **`@blur`**.

```html
<button type="button" @click(this.addItem())">Add</button>

<input type="text"
       value="{{ draft }}"
       @input(this.draft = event.target.value)">

<form @submit(this.save(event))">
    …
</form>
```

They compile to **`data-jsd-on-*`** attributes. The engine attaches native listeners when
the instance binds — no inline `onclick`, which keeps Content Security Policy configurations
 workable without `'unsafe-inline'`.

Always call **`this.methodName()`** in handlers, not bare `methodName()`.

### Loop variables and click time

Variables like `item` inside `@foreach` exist at **render time**. At **click time** the loop
scope is gone. Pass identifiers on the element and read them from `event.currentTarget`:

```html
@foreach(items as item)
    <button type="button"
            data-id="{{ item.id }}"
            @click(this.removeItem(event))">
        Remove
    </button>
@endforeach
```

```js
function removeItem(e) {
    var id = Number(e.currentTarget.getAttribute('data-id'))
    this.items = this.items.filter(function (item) { return item.id !== id })
}
```

Do **not** write `@click(this.removeItem(item.id))` — `item` is not in scope when the click
fires.

---

## Child components

```html
@foreach(items as item)
    @component('cart/row', {
        key: item.id,
        item: item,
        quantity: item.qty,
    })
@endforeach
```

Each `@component` creates a **child instance** with its own state, lifecycle, and scoped CSS.

| Topic | Behaviour |
|---|---|
| **`key`** | Required when the list can reorder, filter, or delete. Without it the patcher matches by position and state can stick to the wrong row after edits. |
| **Parent → child** | On re-render the parent writes back only the props it passed. State the child set in its own `mount()` is left alone. |
| **Child → parent** | `this.parent.state…`, Wire `send()`, or shared helpers via `use()`. |
| **Tree** | Parent holds `this.children`; each child holds `this.parent`. |

---

## Scoped CSS

Pair **`<style scoped>`** in the file with **`style-scoped`** on markup roots:

```html
<template>
<div style-scoped class="board">
    …
</div>
</template>

<style scoped>
.board { padding: 1rem; }
</style>
```

The engine adds a generated attribute (for example `style-scoped="tpl-demo-showcase"`) and
prefixes selectors so rules do not leak globally.

| Combination | Result |
|---|---|
| `<style scoped>` + `style-scoped` on markup | Works |
| `<style scoped>` without `style-scoped` | Rules compile but nothing matches — styling silently fails |
| `<style>` without `scoped` | **Ignored** — CSS is not injected into the document |

You may have multiple roots with `style-scoped` in one template if layout requires it.

---

## Wire — communication between components

Wire provides named channels for loose coupling. Use it when siblings or distant components
must react to events without direct parent/child references.

Inside lifecycle hooks:

```js
mount(function (send, receive) {
    send('tasks/changed', { count: this.items.length })

    receive('tasks/highlight', function (data) {
        this.highlightId = data.id
    })
})
```

Global API (available anywhere after the engine loads):

```js
Jslade.send('tasks/changed', { count: 5 })       // one-off event, no replay
Jslade.sendState('theme', 'dark')               // state channel, replayed to new subscribers
Jslade.receive('theme', function (value) { … })
```

Subscriptions registered through **`receive()`** inside **`mount()`** are released
automatically on **`unmount()`**.

Enable traffic logging during development:

```js
Jslade.start({ dev: true, showChannels: true })
```

---

## JavaScript subset

Method bodies, lifecycle hooks, `@js` blocks, and event handler expressions are parsed into
an AST and interpreted by the engine — **`eval()` is never used**. Event directives compile
to `data-jsd-on-*` attributes, not inline `onclick`, which keeps templates compatible with
strict Content Security Policy settings.

### Supported

| Category | Syntax |
|---|---|
| Declarations | `var`, `let`, `const` (see scoping note below) |
| Control flow | `if` / `else`, `for`, `while`, `for…in`, `for…of`, `break`, `continue`, `return`, `throw` |
| Functions | `function name() { … }`, `function` expressions, arrow functions `() => …` |
| Error handling | `try` / `catch` / `finally` |
| Operators | Arithmetic, comparison, logical, `??`, `?.`, `in`, `instanceof`, `delete`, `typeof`, `void`, `++` / `--` |
| Values | Ternaries, template literals, regex literals, `new`, array/object literals |
| Modern syntax | Spread/rest in calls and literals, destructuring in assignments and bindings, object shorthand methods `{ foo() { … } }` |

Event handlers such as `@click(this.save(event))` accept a **single expression**. If that
expression cannot be parsed alone, the engine retries the handler body as a **statement
list**, so a block of statements is also accepted when needed.

### Not supported

These tokens are not parsed as valid syntax — the compile step fails or the script scanner
logs a warning with the **component name and source location** when available:

| Syntax | Reason |
|---|---|
| `async` / `await` | No async parser or scheduler |
| Generators (`function*`) | Not parsed |
| `class` | Not parsed |
| `switch` | Not parsed |
| Labelled statements | Not parsed |
| Getters/setters in object literals (`get foo()`) | Object parser accepts `:`, shorthand, and method syntax only |
| Logical assignment (`??=`, `\|\|=`, `&&=`) | Assignment parser accepts `=`, `+=`, `-=`, `*=`, `/=`, `%=` only |
| `do…while` | Not parsed |

### Scoping note

`let` and `const` are parsed, but method and hook bodies use a **flat variable bag** — block
scoping does not match full JavaScript. Treat local declarations like `var` for practical
purposes, or keep shared logic in plain modules.

### Where to put heavy logic

Network calls, `async`/`await`, and large algorithms belong in plain JavaScript modules on
the page. Expose helpers through **`use({ … })`**, call them from **`mount()`**, or store
results on **`state`** for the template to read.

---

## `render()` vs live instances

| | `Jslade.render(name, data)` | `<jslade>` / `Jslade.renderTo()` |
|---|---|---|
| Output | HTML string | Live DOM |
| Reactive updates | No | Yes |
| Lifecycle hooks | No | Yes |
| Use when | Email preview, static HTML fragment | Any interactive UI |

```js
const html = Jslade.render('demo/showcase', { title: 'Preview' })
preview.innerHTML = html

const board = Jslade.renderTo('#app', 'demo/showcase', { title: 'Live board' })
board.state.title = 'Updated title'
board.unmount()
```

**Detached instances:** pass `null` as the container to create an instance before choosing
where to mount it:

```js
const widget = Jslade.renderTo(null, 'demo/showcase', { title: 'Floating' })
widget.renderTo('#sidebar')
```

---

## Instance API

After **`renderTo()`** or **`start()`**, the root instance is available on the mount node as
**`element.component`**. Useful methods:

| Method | Purpose |
|---|---|
| `instance.state` | Reactive props/state proxy |
| `instance.find(sel)` | `querySelector` on the instance container |
| `instance.findAll(sel)` | `querySelectorAll` on the container |
| `instance.closest(sel)` | Walk up from the container to match a selector |
| `instance.unmount()` | Destroy the instance and release Wire subscriptions |
| `instance.remove()` | Remove the container from the DOM (does not run lifecycle hooks) |
| `instance.renderTo(target)` | Append detached container to a DOM node |
| `instance.parent` / `instance.children` | Parent/child tree from `@component` |

**`Jslade.event(nativeEvent, element, callback)`** walks up from `element` to find the nearest
component and invokes `callback` with the instance as `this`. Used internally for event
delegation; available for custom integrations.

---

## Pitfalls and how to avoid them

| What goes wrong | What to do instead |
|---|---|
| Click handler never fires | Use `@click(this.method())` with a `function` declaration |
| Wrong row updates after delete | Pass `key` on `@component` or use `key="{{ item.id }}"` on repeated elements |
| Stale closure over loop variable | Use `data-*` attributes and read from `event.currentTarget` |
| Scoped styles have no effect | Add `style-scoped` on markup roots alongside `<style scoped>` |
| `mount()` seems to run twice | Each `renderTo()` creates a new instance; re-render alone does not re-run `mount()` |
| Infinite update loop | Do not assign `state` unconditionally inside `updated()` |
| Method not found in template | Declare with `function name() {}`, not `const name = () => {}` |

During development, run **`Jslade.start({ dev: true })`** and inspect
**`Jslade.instances()`** when behaviour does not match expectations.
