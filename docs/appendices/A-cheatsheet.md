# Cheatsheet

One-page reference. Narrative guides live in Parts I–VIII.

---

## Boot

```js
Jslade.import({ 'name': '<noembed …>…</noembed>' })
Jslade.start()                    // required
Jslade.start({ dev: true, root: el })
```

---

## `.jsd` shape

```html
<noembed name="namespace/name">
<script>props({ … }); function foo() { … }; mount(() => { … })</script>
<style scoped>…</style>
<template><div style-scoped>…</div></template>
</noembed>
```

---

## Template

| Syntax | Effect |
|--------|--------|
| `{{ expr }}` | Escaped output |
| `{!! expr !!}` | Raw HTML (trusted only) |
| `@if` / `@elseif` / `@else` | Conditionals |
| `@foreach(arr as x)` | Loop + `$loop.*` |
| `@component('name', { key, … })` | Child instance |
| `@click(this.fn())` | Event (49 DOM events available) |

---

## Script

| API | Purpose |
|-----|---------|
| `props({ … })` | Default reactive state |
| `use({ … })` | Bind outer helpers into template |
| `mount` / `updated` / `unmount` | Lifecycle (live instances only) |
| `this.prop` | Shorthand for `this.state.prop` |

Methods: **`function name() { }`** only — not `const name = () => {}`.

---

## Wire

```js
this.wire('channel').send(value)
this.wire('channel').receive(fn)   // replays last send if any
this.wire('channel').get(fallback?)
this.localWire('channel')          // per-instance; children: this.parent.localWire
Jslade.wire('channel')             // from page script
```

---

## Lazy assets

```js
this.loadResources([
    { type: 'style', src: '/a.css' },
    { type: 'script', src: '/a.js', global: 'Lib' },
]).then(function (result) { … })
```

Not `Jslade.import()` — that registers component **source**.

---

## Debug bar (dev only)

```js
import { attachDebug } from './debugger/jslade-debug.js'
attachDebug(Jslade)   // after start()
// Ctrl+\ toggle — Jslade.debug.instances(), .messages(), …
```

Full guide: Part VII — [Debug bar](../07-debug-bar/20-why-the-debug-bar.md).

---

## Common fixes

| Symptom | Check |
|---------|--------|
| Empty placeholder | `start()` called? name matches? closing `</jslade>`? |
| Click dead | `@click(this.method())` + `function method()` |
| Wrong row after delete | `key` on `@component` |
| No scoped styles | `style-scoped` on markup root |
| Lib undefined | `loadResources(…).then()`, not sync in `mount()` |
