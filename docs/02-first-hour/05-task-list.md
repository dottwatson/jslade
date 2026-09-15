# Tutorial: task list

A self-contained task board: props, methods, lifecycle, scoped CSS, conditionals, loops,
events, and `$loop` metadata.

---

## Component: `demo/tasks.jsd`

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

---

## Built-in directives in this example

| Directive | Role |
|-----------|------|
| `@if` / `@else` | Conditional blocks |
| `@foreach` | Loop over `items` |
| `$loop.last` | Loop metadata |
| `@click` / `@change` / `@input` | DOM events — CSP-safe |
| `{{ }}` | Output escaped text |

---

## Loop variables and click time

Variables like `item` exist at **render time**, not at **click time**. Pass ids on the element:

```html
<button data-id="{{ item.id }}" @click(this.remove(event))">×</button>
```

```js
function remove(e) {
    var id = Number(e.currentTarget.getAttribute('data-id'))
    // ...
}
```

Do **not** write `@click(this.remove(item.id))` — `item` is out of scope when the click fires.

Full reference: [Event directives](../03-component/09-event-directives.md).

---

## 💡 Debug moment

1. Open the debug bar → **Components** → expand the task list instance.
2. Edit **State** → set `"items": []` → **Apply** — the `@if` empty branch should render.
3. Tab **Performance** — click Add a few times and watch **Total renders** increment.

Next: [Cart line item](./06-cart-tutorial.md) — props from the server and a production-shaped page.
