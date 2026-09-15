# Common errors and FAQ

## Pitfalls

## Pitfalls and how to avoid them

| What goes wrong | What to do instead |
|---|---|
| Click handler never fires | Use `@click(this.method())` with a `function` declaration |
| Wrong row updates after delete | Pass `key` on `@component` or use `key="{{ item.id }}"` on repeated elements |
| Stale closure over loop variable | Use `data-*` attributes and read from `event.currentTarget` |
| Scoped styles have no effect | Add `style-scoped` on markup roots alongside `<style scoped>` |
| `mount()` seems to run twice | Each `renderTo()` creates a new instance; re-render alone does not re-run `mount()` |
| Infinite update loop | Do not assign `state` unconditionally inside `updated()` |
| `receive` fires many times | Subscribe in `mount()`, not `updated()` — each call adds a listener |
| Empty `get()` is `undefined` | The name was never `send` or was `clear()`; pass a fallback: `get('light')` |
| Method not found in template | Declare with `function name() {}`, not `const name = () => {}` |
| Chart / map lib is `undefined` | Call `new Chart()` inside `loadResources(…).then()`, not synchronously in `mount()` |

During development, run **`Jslade.start({ dev: true })`** and inspect
**`Jslade.instances()`** when behaviour does not match expectations.


## First-time mistakes

## Common first-time mistakes

**Empty placeholder after load.** Almost always means `start()` was never called, the
component name does not match the import map, or the placeholder is self-closing.

**Clicks do nothing.** Event handlers must call **`this.methodName()`**, not bare
`methodName()`. Methods must be declared with **`function name() { … }`**, not
`const name = () => {}`.

**Props seem ignored.** Check that the attribute name is `props`, that quotes inside the
JSON are valid for HTML, and that keys match the names used in `props({ … })` in the script
block.

**Component works once but not after AJAX navigation.** New placeholders need
**`Jslade.start({ root: container })`** or **`Jslade.mountAll(container)`** after the HTML
is inserted. Definitions already in memory do not need to be imported again unless names
changed.

**Styles missing on a scoped component.** Scoped CSS requires both `<style scoped>` in the
file and the **`style-scoped`** attribute on the markup root inside the template block.
Without `style-scoped`, rules compile but nothing in the DOM matches them.

**Components do not talk.** There is no `send` / `receive` argument on `mount()`. Use
**`this.wire('name')`** (page-wide) or **`this.localWire('name')`** (this instance; children
use **`this.parent.localWire`**). `send` is the flow and the last value; `get(fallback?)`
reads it; `receive` is never called on an empty channel; `clear()` empties without notifying.

**A chart or map library is `undefined`.** Do not put a layout-only `<script>` assumption in
the component. Call **`this.loadResources([…])`** from `mount()` and construct the widget
inside `.then()` — see [External libraries](./components.md#external-libraries-loadresources).

