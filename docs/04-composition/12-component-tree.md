# Component tree

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
mount(() => {
    this.localWire('ping').receive((data) => {
        this.state.childMessage = 'Wire da ' + data.from + ' id=' + data.id
    })
})
```

### Child highlights (`showcase-chip.jsd`)

```js
function notifyParent() {
    if (!this.parent) return
    this.parent.state.childMessage = 'Chip ' + this.taskId + ' cliccato; this.parent ok'
    this.parent.localWire('ping').send({ from: 'chip', id: this.taskId })
}

mount(() => {
    if (!this.parent) return
    this.parent.localWire('select').receive((data) => {
        this.state.highlight = data.id === this.taskId
    })
})
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
| **Child → parent** | `this.parent.state…`, `this.parent.localWire(…)`, or shared helpers via `use()`. |
| **Tree** | Parent holds `this.children`; each child holds `this.parent`. |

---

