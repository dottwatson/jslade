# Tutorial: cart line item

## What you need before you start

You need three pieces working together:

1. **The engine script** — `dist/jslade.min.js` from the npm package, or the same file copied
   to your static assets directory.
2. **At least one component source** — a `<noembed>` block with a `<template>` and optional
   `<script>` / `<style scoped>`. Often saved as `components/…/*.jsd` for convenience.
3. **A mount point in your HTML** — a `<jslade name="…">` element where the live component
   should appear, plus a short boot script that calls `Jslade.import()` (when templates come
   from the server) and **`Jslade.start()`** (always required).

Nothing becomes interactive until you call **`Jslade.start()`** (alias: **`Jslade.bootstrap()`**).
There is no autostart. If
you forget that call, placeholders stay empty and the page looks broken even when everything
else is correct.

---


## Complete example: a cart line item

The following example is intentionally complete. You can copy each file as-is, adjust paths,
and open the page through a web server.

### Component file: `components/cart/item.jsd`

```html
<noembed name="cart/item">
<script>
props({
    item: null,
    quantity: 1,
})

function increment() {
    this.quantity = this.quantity + 1
}

function decrement() {
    this.quantity = Math.max(1, this.quantity - 1)
}

function lineTotal() {
    if (!this.item) return '0.00'
    return (this.item.price * this.quantity).toFixed(2)
}
</script>

<style scoped>
.row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e3e7ec;
}
.name { flex: 1; }
.qty {
    font-weight: 600;
    min-width: 1.5rem;
    text-align: center;
}
.btn {
    padding: 0.25rem 0.6rem;
    border: 1px solid #ced4da;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
}
.total { color: #087f5b; font-weight: 600; }
</style>

<template>
<div style-scoped class="row">
    <span class="name">{{ item.name }}</span>
    <button type="button" class="btn" @click(this.decrement())">−</button>
    <span class="qty">{{ quantity }}</span>
    <button type="button" class="btn" @click(this.increment())">+</button>
    <span class="total">${{ lineTotal() }}</span>
</div>
</template>
</noembed>
```

The `name` on the outer `<noembed>` tag is the component id. Every placeholder
that mounts this component must use exactly the same name: `cart/item`.

### Page: `cart.html`

In production your backend builds the import map from `.jsd` files on disk. For this
standalone example the map is inlined in the script block. The important part is the shape:
each key is a component name, each value is the **full raw file text** including the outer
`<noembed>` tag.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cart demo</title>
</head>
<body>
    <h1>Shopping cart</h1>

    <jslade name="cart/item"
            props='{ "item": { "name": "Mechanical keyboard", "price": 49 }, "quantity": 1 }'>
    </jslade>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.import({
            'cart/item': '<noembed name="cart/item">\n<script>\nprops({\n    item: null,\n    quantity: 1,\n})\n\nfunction increment() {\n    this.quantity = this.quantity + 1\n}\n\nfunction decrement() {\n    this.quantity = Math.max(1, this.quantity - 1)\n}\n\nfunction lineTotal() {\n    if (!this.item) return \'0.00\'\n    return (this.item.price * this.quantity).toFixed(2)\n}\n<\/script>\n\n<style scoped>\n.row {\n    display: flex;\n    gap: 0.75rem;\n    align-items: center;\n    padding: 0.5rem 0;\n    border-bottom: 1px solid #e3e7ec;\n}\n.name { flex: 1; }\n.qty {\n    font-weight: 600;\n    min-width: 1.5rem;\n    text-align: center;\n}\n.btn {\n    padding: 0.25rem 0.6rem;\n    border: 1px solid #ced4da;\n    background: #fff;\n    border-radius: 4px;\n    cursor: pointer;\n}\n.total { color: #087f5b; font-weight: 600; }\n<\/style>\n\n<template>\n<div style-scoped class="row">\n    <span class="name">{{ item.name }}</span>\n    <button type="button" class="btn" @click(this.decrement())">−</button>\n    <span class="qty">{{ quantity }}</span>\n    <button type="button" class="btn" @click(this.increment())">+</button>\n    <span class="total">${{ lineTotal() }}</span>\n</div>\n</template>\n</noembed>',
        })

        Jslade.start()
    </script>
</body>
</html>
```

When you open this page, the engine registers the component source, compiles it on first
mount, reads the `props` attribute on the `<jslade>` element, and renders the cart row.
Clicking **+** or **−** updates `quantity` in the live instance state and the DOM patches
in place.

In a real project you do not hand-escape the file into a string. Your server reads
`components/cart/item.jsd` and emits JSON. The registration guide covers that pattern in
full.

---

