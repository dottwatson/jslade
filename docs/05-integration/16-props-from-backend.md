# Props from the backend

Live components receive initial data through the **`props`** attribute on `<jslade>` or through
the third argument to `Jslade.renderTo()`. Values merge **on top of** defaults from
`props({ … })` in the component script.

---

## Placeholder attribute

```html
<jslade name="cart/item"
        props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 2 }'>
</jslade>
```

| Attribute | Required | Purpose |
|-----------|----------|---------|
| `name` | Yes | Registered component name |
| `props` | No | Initial data (defaults apply when omitted) |

**Always use a closing tag** — `</jslade>`, not `<jslade … />`.

---

## JSON in HTML attributes

Strict JSON is the safest choice inside HTML:

```html
props='{ "item": { "name": "Keyboard", "price": 49 }, "quantity": 1 }'
```

Jslade also accepts JavaScript object literal syntax when `JSON.parse` fails:

```html
props='{ item: { name: "Keyboard", price: 49 }, quantity: 1 }'
```

If the attribute is malformed, the engine logs a warning and mounts with `{}` merged only over
script defaults.

---

## Server-side embedding

Your backend reads `.jsd` files, builds the import map, and emits props from database or session
data. Escape JSON for HTML context:

```php
// PHP example
$props = json_encode(
    ['item' => $item, 'quantity' => $qty],
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
);
```

```html
<jslade name="cart/item" props='<?= $props ?>'></jslade>
```

The import map pattern is covered in [Registering components](./15-registering-components.md).

---

## Updating after mount

Initial props are not a one-way door. From JavaScript:

```js
const el = document.querySelector('jslade[name="cart/item"]')
el.component.state.quantity = 5   // reactive update
```

Or keep the `renderTo()` return value:

```js
const row = Jslade.renderTo('#slot', 'cart/item', { item, quantity: 1 })
row.state.quantity = 3
```

---

## AJAX payloads

When an API returns both template source and row data, import first, mount second, then assign
state if needed:

```js
Jslade.import(payload.templates)
Jslade.start({ root: slot })
slot.querySelector('jslade').component.state.rows = payload.rows
```

See [Registering components — AJAX patterns](./15-registering-components.md).

---

## Pitfalls

| Issue | Fix |
|-------|-----|
| Props seem ignored | Check attribute name is `props`; validate JSON quoting in HTML |
| Keys do not match script | Names in JSON must match `props({ … })` keys |
| Huge props blob | Pass ids and fetch detail in `mount()` instead of serializing entire graphs |
| Stale data after navigation | New placeholder needs new mount or explicit `state` writes |

During development, inspect live values in the debug bar **Components → State** panel
([Components tab](../07-debug-bar/22-components-tab.md)).
