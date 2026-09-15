# Instance API

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
| `instance.wire(name)` | Public channel handle (`send` / `receive` / `get` / `clear`) |
| `instance.localWire(name)` | Per-instance channel handle; children use `this.parent.localWire(name)` |
| `instance.loadResources(entries)` | Lazy-load JS/CSS; same cache as `Jslade.loadResources` |
| `instance.remove()` | Remove the container from the DOM (does not run lifecycle hooks) |
| `instance.renderTo(target)` | Append detached container to a DOM node |
| `instance.parent` / `instance.children` | Parent/child tree from `@component` |

**`Jslade.wire(name)`** is the public-square handle from outside a component — same
`send` / `receive` / `get` / `clear` as `instance.wire(name)`. There is no `Jslade.localWire`.
**`Jslade.loadResources(entries)`** is the same loader as `instance.loadResources`.

**`Jslade.event(nativeEvent, element, callback)`** walks up from `element` to find the nearest
component and invokes `callback` with the instance as `this`. Used internally for event
delegation; available for custom integrations.

---

