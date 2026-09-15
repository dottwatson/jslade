# Templates and Directives tabs

## Templates tab

Lists compiled templates (`Jslade.compiledComponents` / `Jslade.list()`). Each entry is
**collapsed by default** — expand to see full compiled definition:

```json
{
    "script": "props({ ... })\nmount(() => { ... })",
    "scopedStyles": ".my-class { ... }",
    "markup": "<div style-scoped>...</div>",
    "scopeTargets": true
}
```

Read-only. Missing sections show `(empty)`.

Templates from `compile()` or `import()` show full source when available; otherwise metadata
only.

Use this tab to verify **lazy compile** ran and markup matches what you expect after editing
a `.jsd` file.

---

## Directives tab

All registered directives with color-coded badges:

| Badge | Type | Examples |
|-------|------|----------|
| Blue `built-in` | Engine directives | `@if`, `@foreach`, `@component`, … |
| Green `if` | Conditional custom | `@admin` via `Jslade.if()` |
| Purple `block` | Block custom | `@panel` with `{ block: true }` |
| Orange `inline` | Inline custom | `@badge` |

Built-ins populate automatically. Custom directives appear as registered — **before**
`Jslade.start()`.

Guide: [Custom directives](../06-extending/19-custom-directives.md).

If a custom directive is missing here, it was registered too late or the name is misspelled
in the template.
