# Components, state and templates

A component is full source text wrapped in `<noembed name="…">` with a required `<template>` and optional `<script>` and `<style scoped>`. `.jsd` is a file convention, not a loader. Names in the source, registration map, placeholder, and child references must match.

```html
<noembed name="demo/counter">
<script>
props({ count: 0 })
function increment() {
    this.count++
}
</script>
<style scoped>
.counter { display: flex; gap: .5rem; }
</style>
<template>
<div style-scoped class="counter">
    <span>{{ count }}</span>
    <button type="button" @click(this.increment())">Add</button>
</div>
</template>
</noembed>
```

For a server-provided source map, load the browser bundle, call `Jslade.import({ 'demo/counter': fullSource })`, then `Jslade.start()`. `import` registers source and compiles lazily; the first registration wins. Alternatively, put the `<noembed>` in the page before `start()`, which scans for definitions. Mount with `<jslade name="demo/counter" props='{ "count": 2 }'></jslade>`: use a closing tag and valid JSON props. Register child sources too. For ESM, `import { Jslade } from 'jslade'`.

`Jslade.renderTo('#target', name, props)` creates a live instance; `instance.state` updates it and `instance.unmount()` cleans it up. `Jslade.render(name, props)` returns a static HTML string with no lifecycle or reactivity. For dynamically inserted placeholders, use `Jslade.start({ root: container })` or `Jslade.mountAll(container)`.


## State and templates

- `props({ ... })` supplies per-instance defaults merged with incoming props. Declare component methods as `function name() { ... }`; use `this.property` or `this.state.property` in methods and lifecycle hooks. State changes batch a full instance-template render and patch the DOM.
- `mount(function () { ... })` runs once after commit, `updated(function () { ... })` after subsequent renders, and `unmount(function () { ... })` on teardown. Avoid unconditional state writes in `updated()`.
- `{{ expression }}` escapes output; `{!! expression !!}` emits raw HTML and is for trusted content only. Use `@if` / `@elseif` / `@else` / `@endif`, `@foreach(items as item)` / `@endforeach`, and `$loop.index`, `.first`, `.last`, `.count`. `@js` runs during every render, not after DOM commit.
- Event directives use expressions such as `@click(this.save(event))` and `@input(this.draft = event.target.value)`. Loop variables are unavailable when events fire: put an identifier in `data-id="{{ item.id }}"` and read `event.currentTarget.getAttribute('data-id')` in the handler.
- Scoped styles need both `<style scoped>` and `style-scoped` on each relevant template root; a plain `<style>` is ignored.
- For children use `@component('cart/row', { key: item.id, item: item })`. Use stable keys when a list can reorder, filter, or delete, and register the child source before mounting.

