# Components tab

Lists every active component instance in a **tree view**. Each node is collapsible — click ▶
to expand.

Each instance row shows:

- Template name and instance ID
- Container tag name (e.g. `<div>`, `<li>`)
- Container DOM ID (if present)
- Expand/collapse toggle for children
- ℹ info button and ✕ destroy button

---

## Info panel (click ℹ)

Three columns:

| Column | Content | Editable |
|--------|---------|----------|
| **Definition** | Compiled metadata (`name`, `scopeId`, `hooks`) | Read-only |
| **this** | Custom instance properties; framework methods shown as `[function]` | Read-only |
| **State** | Reactive Proxy — includes `template`, `parent`, `children`, `_id`, … | **Yes** — edit JSON → **Apply** |

Editing **State** and clicking **Apply** triggers an immediate re-render (invalid JSON shows
an alert).

---

## Actions

| Action | Effect |
|--------|--------|
| Click instance label | Yellow highlight on page, scroll into view, fades after 2s |
| **Apply** on State | Live re-render with new state |
| **✕** destroy | `unmount()`, remove from DOM and tree |

The tree updates in real time as instances are created or destroyed.

---

## 💡 Debug moments

**After [Counter tutorial](../02-first-hour/04-counter.md):** one node `demo/counter` — set
`count` to `99` in State → Apply.

**After [Component tree](../04-composition/12-component-tree.md):** expand parent → child
nodes; click child label to locate chips on the page.

**When props look wrong:** compare **State** with what you passed in `props='…'` on
`<jslade>` ([Props from backend](../05-integration/16-props-from-backend.md)).
