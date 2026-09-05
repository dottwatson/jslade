# Custom directives

Jslade templates use directives for control flow (`@if`, `@foreach`), events (`@click`),
child components (`@component`), and more. When the built-in set is not enough, you register
your own directives in JavaScript before the engine compiles templates.

Custom directives let you encode repeated markup patterns, domain-specific conditionals, or
HTML wrappers once and reuse them across every component. They compile into the same render
pipeline as built-ins — no runtime string parsing on each update.

**Register every custom directive before `Jslade.start()`** (or before the first
`renderTo()` / mount that compiles templates using those directives). Directives registered
after compile has already run do not retroactively affect compiled components.

---

## Three kinds of custom directives

| Kind | API | Template syntax | Typical use |
|---|---|---|---|
| **Inline** | `Jslade.directive(name, fn)` | `@name(expr)` inside markup | Badges, icons, formatted snippets |
| **Conditional** | `Jslade.if(name, predicateFn)` | `@name` … `@endname` | Role checks, feature flags |
| **Block** | `Jslade.directive(name, { block: true }, fn)` | `@name(expr)` … `@endname` | Panels, cards, layout wrappers |

Each directive handler receives a **context object** (`ctx`) describing the directive token,
the expression inside parentheses (if any), and helpers for emitting HTML or controlling block
structure.

The expression in `@directive(...)` is available as **`ctx.expr`** — a string containing
whatever appeared between the parentheses. Use **`ctx.parseExpr(ctx.expr)`** when you need the
parsed AST for the emitter path, or pass **`ctx.expr`** into **`ctx.inline`** template
literals for dynamic output (see below).

---

## Inline directives

Inline directives transform a single directive occurrence into HTML emitted during render.

### Registration

```js
Jslade.directive('badge', function (ctx) {
    return ctx.inline`<span class="badge">${ctx.expr}</span>`
})
```

### Template usage

```html
<p>Status: @badge(statusLabel)</p>
<p>Count: @badge(items.length)</p>
```

At compile time, `${ctx.expr}` in the handler is **not** the runtime value — it is the
**expression source** from the template (`statusLabel`, `items.length`). The engine parses
that string and evaluates it on each render against the component instance state. Output is
HTML-escaped the same way as `{{ … }}`.

For unescaped output (trusted content only):

```js
Jslade.directive('rawHtml', function (ctx) {
    return ctx.inline.raw`<div class="snippet">${ctx.expr}</div>`
})
```

### Complete page example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Badge demo</title>
    <style>
        .badge { background: #2563eb; color: #fff; padding: 0.1rem 0.45rem; border-radius: 4px; font-size: 0.8rem; }
    </style>
</head>
<body>
    <jslade name="demo/status" props='{ "statusLabel": "Active", "items": [1, 2, 3] }'></jslade>

    <noembed name="demo/status">
        <script>
            props({ statusLabel: 'Unknown', items: [] })
        </script>
        <template>
            <p>Status: @badge(statusLabel)</p>
            <p>Count: @badge(items.length)</p>
        </template>
    </noembed>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.directive('badge', function (ctx) {
            return ctx.inline`<span class="badge">${ctx.expr}</span>`
        })

        Jslade.start()
    </script>
</body>
</html>
```

---

## Conditional directives — `Jslade.if()`

`Jslade.if()` registers a **block** directive plus an automatic `@else{name}` variant. The
predicate runs at render time; when it returns truthy, the block body is included.

### Registration

```js
Jslade.if('admin', function (role) {
    if (role) return role === 'admin' || role === 'editor'
    return window.user && window.user.role === 'admin'
})
```

When **`@admin`** has no expression, the predicate is called with no arguments. When
**`@elseadmin(expr)`** is used, the engine passes the parsed expression as the first
argument to the **same** predicate — so the function must read that argument when you want
branch-specific behaviour.

For template-local conditions that do not need a custom directive, use built-in
**`@if(expr)`** / **`@elseif(expr)`** instead.

### Template usage

```html
@admin
    <button type="button" @click(this.deleteUser())">Delete user</button>
@endadmin
```

With an expression on **`@elseadmin`**, the predicate receives that value:

```html
@admin
    <button type="button" @click(this.deleteUser())">Delete user</button>
@elseadmin('editor')
    <p>Editor tools</p>
@elseadmin
    <p>Public view</p>
@endadmin
```

The predicate above treats `'editor'` as a role string passed from the template.

### Complete page example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Admin demo</title>
</head>
<body>
    <jslade name="demo/admin-panel"></jslade>

    <noembed name="demo/admin-panel">
        <script>
            props({ message: 'Public view' })

            function deleteUser() {
                this.message = 'Delete clicked (admin only)'
            }
        </script>
        <template>
            <p>{{ message }}</p>
            @admin
                <button type="button" @click(this.deleteUser())">Delete user</button>
            @endadmin
        </template>
    </noembed>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        window.user = { role: 'admin' }

        Jslade.if('admin', function () {
            return window.user && window.user.role === 'admin'
        })

        Jslade.start()
    </script>
</body>
</html>
```

---

## Block directives

Block directives wrap a region of markup between `@name(…)` and `@endname`. The handler sets
up opening and closing emission; the compiler processes the inner markup normally.

### `ctx.wrap(openHtml, closeHtml)`

Emits static HTML strings before and after the block body.

```js
Jslade.directive('panel', { block: true }, function (ctx) {
    ctx.wrap('<div class="panel">', '</div>')
})
```

```html
@panel
    <h2>Settings</h2>
    <p>Content inside the panel.</p>
@endpanel
```

**`ctx.wrap` takes exactly two HTML strings** — an opening fragment and a closing fragment.
It does not accept a tag name, attribute object, or `children` argument.

### Block with a dynamic title — `ctx.expr` + `ctx.inline`

When `@panel(...)` receives an argument, it appears in **`ctx.expr`**. Use **`ctx.inline`**
to emit dynamic content at the start of the block, then **`ctx.wrap`** for the closing tag.

```js
Jslade.directive('panel', { block: true }, function (ctx) {
    if (ctx.expr) {
        ctx.inline`<div class="panel"><h2 class="panel-title">${ctx.expr}</h2>`
        ctx.wrap('', '</div>')
    } else {
        ctx.wrap('<div class="panel">', '</div>')
    }
})
```

Template:

```html
@panel(title)
    <p>{{ description }}</p>
@endpanel

@panel('Static heading')
    <p>This title is a string literal in the template.</p>
@endpanel
```

- `@panel(title)` evaluates the **`title`** prop or state field on each render.
- `@panel('Static heading')` passes a string literal expression.

### `ctx.when(condition)`

Wraps the block body in a conditional without writing `@if` in every template:

```js
Jslade.directive('visible', { block: true }, function (ctx) {
    ctx.when(ctx.expr)
})
```

```html
@visible(showDetails)
    <section class="details">…</section>
@endvisible
```

### `ctx.loop(arrayExpr, itemVar)`

Wraps the block in a foreach-style loop:

```js
Jslade.directive('repeat', { block: true }, function (ctx) {
    var parts = ctx.expr.match(/^(.+?)\s+as\s+(\w+)$/)
    if (!parts) {
        ctx.raise('Use @repeat(items as item)')
    }
    ctx.loop(parts[1].trim(), parts[2])
})
```

```html
@repeat(items as item)
    <li>{{ item.label }}</li>
@endrepeat
```

Prefer built-in **`@foreach`** unless you need specialised loop semantics.

### `ctx.raw()`

Passes inner markup through with minimal processing for advanced scenarios. Use sparingly —
most layout needs are covered by **`ctx.wrap`**.

---

## Complete block directive example

Full page with styled panels and dynamic titles:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Panel demo</title>
    <style>
        .panel {
            border: 1px solid #e3e7ec;
            border-radius: 8px;
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
        }
        .panel-title { margin: 0 0 0.5rem; font-size: 1rem; }
    </style>
</head>
<body>
    <jslade name="demo/panels"
            props='{ "title": "Account", "description": "Manage your profile settings." }'>
    </jslade>

    <noembed name="demo/panels">
        <script>
            props({
                title: 'Default',
                description: '',
            })
        </script>
        <template>
            @panel(title)
                <p>{{ description }}</p>
            @endpanel

            @panel('Help')
                <p>Contact support@example.com</p>
            @endpanel
        </template>
    </noembed>

    <script src="/assets/js/jslade.min.js"></script>
    <script>
        Jslade.directive('panel', { block: true }, function (ctx) {
            if (ctx.expr) {
                ctx.inline`<div class="panel"><h2 class="panel-title">${ctx.expr}</h2>`
                ctx.wrap('', '</div>')
            } else {
                ctx.wrap('<div class="panel">', '</div>')
            }
        })

        Jslade.start()
    </script>
</body>
</html>
```

Registration order: **`Jslade.directive(...)`** then **`Jslade.start()`**.

---

## Context helpers reference

| Helper | Purpose |
|---|---|
| `ctx.expr` | Expression string from `@directive(expr)` — empty string if omitted |
| `ctx.parseExpr(source)` | Parse expression; throws with template context on failure |
| `ctx.inline`…`` | Emit HTML with escaped `${expression}` slots |
| `ctx.inline.raw`…`` | Emit HTML with unescaped `${expression}` slots |
| `ctx.wrap(open, close)` | Static HTML wrapper around block body |
| `ctx.when(condition)` | Conditional block using expression string |
| `ctx.loop(arrayExpr, itemVar)` | Loop wrapper |
| `ctx.emit(code)` | Emit raw JavaScript line into legacy emit path |
| `ctx.raise(message)` | Fail compile with a clear error |
| `ctx.tokenStart` | Source offset for error messages |

Block handlers assign **`ctx._block`** indirectly by calling **`wrap`**, **`when`**, **`loop`**,
or **`raw`**. Do not call **`wrap`** twice in one handler — the second call overwrites the
first.

---

## Built-in directives (for comparison)

You do not register these — they ship with the engine:

| Directive | Type |
|---|---|
| `@if`, `@elseif`, `@else`, `@endif` | Conditional blocks |
| `@foreach`, `@endforeach` | Array loop |
| `@for`, `@endfor` | C-style loop |
| `@forIn`, `@endforIn` | Object key loop |
| `@component` | Child component |
| `@js`, `@endjs` | Run JS during render |
| `@click`, `@input`, `@change`, `@submit`, `@keydown`, `@focus`, `@blur` | DOM events |

Custom directives follow the same compile-time registration model but use names you choose.
Avoid colliding with built-in names.

---

## Common mistakes

**Registering after `start()`.** Templates compile on first mount. Directives added later do
not affect already compiled components. Register all custom directives in a boot script that
runs before **`Jslade.start()`**.

**Wrong `ctx.wrap` signature.** `ctx.wrap('<div class="panel">', '</div>')` — not
`ctx.wrap('div', { class: 'panel' }, children)`.

**Expecting `ctx.expr` to be the runtime value inside the handler function.** At handler
execution time (compile time), **`ctx.expr`** is the **source text** of the expression.
Runtime evaluation happens in generated code via **`ctx.inline`** or **`ctx.parseExpr`**.

**Using `@click(item.id)` inside `@foreach`.** Loop variables are not in scope at event time.
Custom directives do not change that rule for event handlers inside the block body.

**Invalid expressions in `@panel(title`.** Missing closing parenthesis or unsupported syntax
 fails at compile with **`ctx.raise`** or a parse error naming the component.

**Block not closed.** Every `@panel` requires **`@endpanel`**. Unclosed blocks fail compile
with an explicit list of open directives.

---

## Debugging custom directives

During development:

```js
Jslade.start({ dev: true })
```

Compile errors include the component name and approximate location in the `.jsd` source.
If a directive appears to do nothing, confirm it was registered before compile and that the
template uses the exact directive name (case-sensitive).

The development debug bar lists registered directives by type when attached via
`attachDebug(Jslade)` from the `debugger/` package (development only).

---

## Registration snippet for production pages

Keep directive registration in one boot file loaded before **`start()`**:

```html
<script src="/assets/js/jslade.min.js"></script>
<script src="/assets/js/jslade-directives.js"></script>
<script>
    Jslade.import(/* server map */)
    Jslade.start()
</script>
```

**`jslade-directives.js`:**

```js
Jslade.directive('badge', function (ctx) {
    return ctx.inline`<span class="badge">${ctx.expr}</span>`
})

Jslade.directive('panel', { block: true }, function (ctx) {
    if (ctx.expr) {
        ctx.inline`<div class="panel"><h2>${ctx.expr}</h2>`
        ctx.wrap('', '</div>')
    } else {
        ctx.wrap('<div class="panel">', '</div>')
    }
})

Jslade.if('admin', function () {
    return window.user && window.user.role === 'admin'
})
```

This keeps component `.jsd` files free of one-off markup wrappers while sharing directive
behaviour across the entire application.
