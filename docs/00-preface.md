# About this book

This guide is for developers who embed **Jslade** in server-rendered pages — PHP, Rails,
Django, static HTML behind a web server, or any stack that already outputs HTML and wants
**live, reactive islands** without rebuilding the site as a single-page application.

Jslade is new. Most teams have no shared mental model yet for how it compiles templates,
patches the DOM, wires parent/child components, or loads assets lazily. This book starts from
**how the engine thinks**, walks through **hands-on tutorials**, then goes deeper into every
public feature — including the **debug bar**, which is the recommended way to see what your
components are doing while you learn.

---

## How the book is organized

Each part builds on the previous one:

| Part | Topic |
|------|--------|
| **I — Mental model** | Definitions, boot sequence, the `.jsd` file — read before writing code |
| **II — Your first hour** | Three tutorials of increasing size |
| **III — Component anatomy** | Script, template, events, CSS, JS subset |
| **IV — Composition** | Child trees, wire, instance API |
| **V — Integration** | Server import maps, props, lazy assets, CSP |
| **VI — Extending** | Custom directives |
| **VII — Debug bar** | Development laboratory — use it while learning Parts II–VI |
| **VIII — Troubleshooting** | FAQ and local dev workflow |

Appendices collect quick-reference tables. **Contributors** who work on the engine itself
should read [contributing/build.md](./contributing/build.md) — that material is outside the
user-facing book.

---

## Reading paths

**Quick start (2–3 hours)**  
[How Jslade thinks](./01-mental-model/01-how-jslade-thinks.md) →
[Counter](./02-first-hour/04-counter.md) →
[Task list](./02-first-hour/05-task-list.md) →
[Debug bar setup](./07-debug-bar/21-setup-and-workflow.md) →
[Registering components](./05-integration/15-registering-components.md)

**Full book**  
Part I through VIII in order.

**Debug-first** (you know React/Vue and want visibility first)  
[Mental model](./01-mental-model/01-how-jslade-thinks.md) →
[Why the debug bar](./07-debug-bar/20-why-the-debug-bar.md) →
[Setup](./07-debug-bar/21-setup-and-workflow.md) →
[Components tab](./07-debug-bar/22-components-tab.md) →
[Counter tutorial](./02-first-hour/04-counter.md) →
[Wire](./04-composition/13-wire-localwire.md) →
[WireBus tab](./07-debug-bar/23-wirebus-tab.md)

---

## Conventions in examples

- Components are saved as **`*.jsd`** files — a project convention; the engine only needs the
  `<noembed>…</noembed>` source text.
- Placeholders use a closing **`</jslade>`** tag, never self-closing form.
- Event handlers call **`this.methodName()`** — loop variables from `@foreach` are not in
  scope at click time; use `data-*` attributes instead.
- **`Jslade.start()`** is always required — nothing mounts until you call it.

---

## Where this book is published

- **In the repository:** `package/docs/` (this folder)
- **On GitHub Wiki:** synced automatically on push to `main` — do not edit wiki pages in
  the GitHub UI

When you see `💡 Debug moment` boxes in tutorials, open the debug bar and follow along —
that is the fastest way to connect the prose to what actually happens in the browser.
