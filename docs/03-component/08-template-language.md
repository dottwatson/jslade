# Template language

## Template syntax

### Output expressions

| Syntax | Effect |
|---|---|
| `{{ expr }}` | HTML-escaped output |
| `{!! expr !!}` | Raw HTML — use only for trusted content |
| `{{-- comment --}}` | Removed at compile time |
| `@@` | Literal `@` in output |

### Conditionals

```html
@if(items.length === 0)
    <p class="empty">Nothing here.</p>
@elseif(items.length === 1)
    <p>One item.</p>
@else
    <p>{{ items.length }} items.</p>
@endif
```

Expressions in `@if` / `@elseif` use the same JavaScript subset as methods (see below).

### Loops

```html
@foreach(items as item)
    <div data-id="{{ item.id }}">{{ item.label }}</div>
@endforeach
```

Inside a `@foreach` loop the **`$loop`** object exposes:

| Property | Meaning |
|---|---|
| `$loop.index` | Zero-based index |
| `$loop.first` | `true` on the first iteration |
| `$loop.last` | `true` on the last iteration |
| `$loop.count` | Total number of items |

```html
@for(var i = 0; i < 3; i++)
    <span>Item #{{ i }}</span>
@endfor
```

```html
@forIn(metadata, key)
    <dt>{{ key }}</dt>
    <dd>{{ metadata[key] }}</dd>
@endforIn
```

### `@js` … `@endjs`

Runs on **every render** while HTML is being assembled. Use it to compute values for the
markup below — not to touch the DOM, because target nodes from this render pass do not exist
yet in the document.

```html
@js
    var summary = this.items.filter(function (i) { return !i.done }).length + ' open'
@endjs
<p>{{ summary }} tasks remaining</p>
```

For DOM measurements or focus management, use **`mount()`** or **`updated()`** instead.

### `@dump(expr)` — debug output

Logs the expression value to the console on each render:

```html
@dump(visibleTasks().length)
```

Useful during development; remove from production templates.

---

