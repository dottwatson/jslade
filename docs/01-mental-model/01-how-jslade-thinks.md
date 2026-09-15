# How Jslade thinks

Before you write a `.jsd` file or drop a `<jslade>` tag into HTML, it helps to see Jslade as
three separate concerns that must line up:

```
definition  →  registration  →  instance
(<noembed>)     (import)        (<jslade> / renderTo)
```

Nothing on the page becomes interactive until all three exist for the same **component name**.

---

## Server islands, not a client app

Jslade targets **server-rendered sites**. Your backend still owns routing, auth, and most of
the HTML. Jslade turns selected regions — carts, filters, modals, dashboards — into **live
reactive UI** without converting the whole product into an SPA.

| Jslade is good for | Jslade is not |
|--------------------|---------------|
| Widgets on PHP/Rails/Django pages | Full client routing + global store |
| Blade-like templates (`@if`, `@foreach`, `{{ }}`) | JSX or SFC ecosystems |
| One script tag, no build step for components | Huge fine-grained reactive trees |
| CSP-friendly event binding | Heavy `async`/`await` inside component scripts |

When `state` changes on a **live instance**, Jslade re-runs that instance's template function
and **patches the existing DOM** — no virtual DOM, no automatic diff across the whole page.

---

## The pipeline

```
markup + script  →  compile (lazy)  →  render function  →  DOM patch
```

1. **Definition** — a `<noembed name="cart/item">` block with optional `<script>`,
   `<style scoped>`, and `<template>`.
2. **Registration** — `Jslade.import({ 'cart/item': rawSource })`, in-page `<noembed>` picked
   up by `scanDOM()`, or `Jslade.compile()` at runtime. Registration stores source; it does
   **not** compile yet.
3. **Mount** — `Jslade.start()` finds `<jslade name="cart/item">` placeholders (or you call
   `Jslade.renderTo()`). First use triggers **compile**, then **render** into the placeholder.
4. **Update** — user interaction or external code writes to `instance.state` → template
   re-runs → DOM morph → `updated()` hook (not `mount()` again).

```
load jslade.min.js
  → Jslade.import({ name: rawSource })   // optional when using server map
  → Jslade.start()                       // required — scan + mount
  → interaction → reactive re-renders
```

---

## Two render modes

| | `Jslade.render(name, data)` | `<jslade>` / `Jslade.renderTo()` |
|---|---|---|
| Output | HTML string | Live DOM in the page |
| Reactive `state` | No | Yes |
| Lifecycle (`mount`, …) | No | Yes |
| Use when | Email preview, static snippet | Anything the user clicks or types in |

If users can interact with it, use **live instances**. Use `render()` only when you need a
string and will never update it through Jslade.

Details: [Instance API](../04-composition/14-instance-api.md).

---

## Component tree mental model

Each live instance is a node in a tree:

- **Parent** renders children with `@component('child/name', { key, …props })`.
- **Child** has its own `state`, lifecycle, and scoped CSS.
- **Wire** (`this.wire('theme')`) is page-wide; **localWire** is per-instance (children reach
  the parent's bus via `this.parent.localWire`).

Parent re-renders do **not** re-run a child's `mount()` when the child's **`key`** is stable.

---

## Assets vs component source

Two different APIs — do not confuse them:

| API | Purpose |
|-----|---------|
| `Jslade.import()` | Register **component source** (`<noembed>…</noembed>`) |
| `this.loadResources()` | Lazy-load **JS/CSS** when an island mounts |

`use({ Chart: window.Chart })` only exposes a library **already on the page** — it does not
download anything.

---

## How to explore while reading

Install the **debug bar** in development ([setup](../07-debug-bar/21-setup-and-workflow.md)).
It shows the instance tree, Wire traffic, render timings, and compiled templates — the same
pipeline described above, visible in the browser.

Next: [The .jsd file](./02-jsd-anatomy.md) — the file shape every component shares.
