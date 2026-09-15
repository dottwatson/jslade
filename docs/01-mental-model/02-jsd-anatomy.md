# The .jsd file

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

