# Script block

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

`use()` does **not** download anything. The helper must already exist on the page (layout
`<script>`, earlier component, or `window`). To lazy-load a library when the component
mounts, use [`loadResources`](#external-libraries-loadresources) instead.

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

| `unmount(fn)` | Before the instance is destroyed | Once per instance |

Hooks do not take Wire helpers as arguments. Use **`this.wire`** / **`this.localWire`** (see below).

```js
mount(function () {
    var self = this
    fetch('/api/tasks').then(function (r) { return r.json() }).then(function (data) {
        self.items = data
    })
    this.wire('tasks/refresh').receive(function () {
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

