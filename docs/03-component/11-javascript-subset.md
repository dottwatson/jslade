# JavaScript subset

## JavaScript subset

Method bodies, lifecycle hooks, `@js` blocks, and event handler expressions are parsed into
an AST and interpreted by the engine — **`eval()` is never used**. Event directives compile
to `data-jsd-on-*` attributes, not inline `onclick`, which keeps templates compatible with
strict Content Security Policy settings.

### Supported

| Category | Syntax |
|---|---|
| Declarations | `var`, `let`, `const` (see scoping note below) |
| Control flow | `if` / `else`, `for`, `while`, `for…in`, `for…of`, `break`, `continue`, `return`, `throw` |
| Functions | `function name() { … }`, `function` expressions, arrow functions `() => …` |
| Error handling | `try` / `catch` / `finally` |
| Operators | Arithmetic, comparison, logical, `??`, `?.`, `in`, `instanceof`, `delete`, `typeof`, `void`, `++` / `--` |
| Values | Ternaries, template literals, regex literals, `new`, array/object literals |
| Modern syntax | Spread/rest in calls and literals, destructuring in assignments and bindings, object shorthand methods `{ foo() { … } }` |

Event handlers such as `@click(this.save(event))` accept a **single expression**. If that
expression cannot be parsed alone, the engine retries the handler body as a **statement
list**, so a block of statements is also accepted when needed.

### Not supported

These tokens are not parsed as valid syntax — the compile step fails or the script scanner
logs a warning with the **component name and source location** when available:

| Syntax | Reason |
|---|---|
| `async` / `await` | No async parser or scheduler |
| Generators (`function*`) | Not parsed |
| `class` | Not parsed |
| `switch` | Not parsed |
| Labelled statements | Not parsed |
| Getters/setters in object literals (`get foo()`) | Object parser accepts `:`, shorthand, and method syntax only |
| Logical assignment (`??=`, `\|\|=`, `&&=`) | Assignment parser accepts `=`, `+=`, `-=`, `*=`, `/=`, `%=` only |
| `do…while` | Not parsed |

### Scoping note

`let` and `const` are parsed, but method and hook bodies use a **flat variable bag** — block
scoping does not match full JavaScript. Treat local declarations like `var` for practical
purposes, or keep shared logic in plain modules.

### Where to put heavy logic

Network calls, `async`/`await`, and large algorithms belong in plain JavaScript modules on
the page. Expose helpers that are **already loaded** through **`use({ … })`**, lazy-load
component-owned JS/CSS with **`this.loadResources()`** from **`mount()`**, or store
results on **`state`** for the template to read.

---

