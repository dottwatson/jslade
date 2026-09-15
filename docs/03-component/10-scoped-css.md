# Scoped CSS

## Scoped CSS

Pair **`<style scoped>`** in the file with **`style-scoped`** on markup roots:

```html
<template>
<div style-scoped class="board">
    …
</div>
</template>

<style scoped>
.board { padding: 1rem; }
</style>
```

The engine adds a generated attribute (for example `style-scoped="tpl-demo-showcase"`) and
prefixes selectors so rules do not leak globally.

| Combination | Result |
|---|---|
| `<style scoped>` + `style-scoped` on markup | Works |
| `<style scoped>` without `style-scoped` | Rules compile but nothing matches — styling silently fails |
| `<style>` without `scoped` | **Ignored** — CSS is not injected into the document |

You may have multiple roots with `style-scoped` in one template if layout requires it.

---

