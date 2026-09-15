# Event directives

## Event directives

Built-in event directives attach native DOM listeners at bind time. Each `@name(handler)` compiles
to a **`data-jsd-on-name`** attribute — no inline `onclick`, which keeps Content Security Policy
configurations workable without `'unsafe-inline'`.

| Family | Directives |
|---|---|
| Mouse | `@click`, `@dblclick`, `@mousedown`, `@mouseup`, `@mousemove`, `@mouseenter`, `@mouseleave`, `@mouseover`, `@mouseout`, `@contextmenu`, `@auxclick` |
| Touch | `@touchstart`, `@touchmove`, `@touchend`, `@touchcancel` |
| Pointer | `@pointerdown`, `@pointerup`, `@pointermove`, `@pointerenter`, `@pointerleave`, `@pointerover`, `@pointerout`, `@pointercancel`, `@gotpointercapture`, `@lostpointercapture` |
| Drag | `@dragstart`, `@drag`, `@dragend` |
| Drop | `@dragenter`, `@dragover`, `@dragleave`, `@drop` |
| Keyboard | `@keydown`, `@keyup` |
| Form / focus | `@input`, `@change`, `@submit`, `@reset`, `@invalid`, `@select`, `@search`, `@compositionstart`, `@compositionupdate`, `@compositionend`, `@cancel`, `@focus`, `@blur`, `@focusin`, `@focusout` |

```html
<button type="button" @click(this.addItem())">Add</button>

<input type="text"
       value="{{ draft }}"
       @input(this.draft = event.target.value)">

<form @submit(this.save(event))">
    …
</form>
```

Always call **`this.methodName()`** in handlers, not bare `methodName()`.

### Loop variables and click time

Variables like `item` inside `@foreach` exist at **render time**. At **click time** the loop
scope is gone. Pass identifiers on the element and read them from `event.currentTarget`:

```html
@foreach(items as item)
    <button type="button"
            data-id="{{ item.id }}"
            @click(this.removeItem(event))">
        Remove
    </button>
@endforeach
```

```js
function removeItem(e) {
    var id = Number(e.currentTarget.getAttribute('data-id'))
    this.items = this.items.filter(function (item) { return item.id !== id })
}
```

Do **not** write `@click(this.removeItem(item.id))` — `item` is not in scope when the click
fires.

---

