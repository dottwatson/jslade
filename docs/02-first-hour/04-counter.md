# Tutorial: counter

The smallest useful live component: one number, two buttons, reactive updates.

This tutorial assumes you completed [Boot sequence](../01-mental-model/03-boot-sequence.md) or
already load the engine and call `Jslade.start()`.

---

## Component: `demo/counter.jsd`

```html
<noembed name="demo/counter">
<script>
props({ count: 0 })

function increment() {
    this.count++
}

function decrement() {
    this.count--
}
</script>

<style scoped>
.counter {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    font-family: system-ui, sans-serif;
}
.counter button {
    width: 2rem;
    height: 2rem;
    cursor: pointer;
}
.count {
    min-width: 2rem;
    text-align: center;
    font-weight: 600;
}
</style>

<template>
<div style-scoped class="counter">
    <button type="button" @click(this.decrement())">−</button>
    <span class="count">{{ count }}</span>
    <button type="button" @click(this.increment())">+</button>
</div>
</template>
</noembed>
```

---

## Page snippet

```html
<jslade name="demo/counter" props='{ "count": 0 }'></jslade>

<script src="/assets/js/jslade.min.js"></script>
<script>
    Jslade.import({ 'demo/counter': '…full .jsd text…' })
    Jslade.start()
</script>
```

Click **+** or **−**. `this.count++` writes to reactive state; the template re-runs; the span
updates in place.

---

## What you just used

| Piece | Role |
|-------|------|
| `props({ count: 0 })` | Default state merged with `props='…'` on the placeholder |
| `function increment()` | Template-callable method — must use `function`, not arrow at top level |
| `@click(this.increment())` | CSP-safe event binding |
| `{{ count }}` | Escaped output |
| `style-scoped` + `<style scoped>` | Component-local CSS |

---

## 💡 Debug moment

1. Add the [debug bar](../07-debug-bar/21-setup-and-workflow.md) and call `attachDebug(Jslade)` after `start()`.
2. Press `Ctrl + \` → tab **Components**.
3. You should see one instance (`demo/counter`). Click ℹ → edit **State** JSON to `{ "count": 42 }` → **Apply** — the DOM updates without reload.

Next: [Task list](./05-task-list.md) — conditionals, loops, and form input.
