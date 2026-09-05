# Building the engine

This guide is for anyone who changes Jslade itself — the JavaScript under `src/jslade/` —
or who needs to produce a fresh `dist/` bundle before publishing the npm package.

Integrators who only drop `dist/jslade.min.js` into a server-rendered page never run these
commands. Contributors who touch the engine run them every time source changes.

The build produces exactly two files that ship to browsers as a single script tag:

```
dist/jslade.js       full UMD bundle (readable, useful while debugging)
dist/jslade.min.js   minified production file
```

Everything under `dist/` is generated. Never edit those files by hand — your changes would
disappear on the next build and would not match what npm publishes.

---

## Prerequisites

You need **Node.js 18 or newer** and the package dev dependencies installed once:

```sh
cd package
npm install
```

That installs **esbuild** (bundling), **terser** (minification), and **prettier** (formatting).
No global CLI tools are required; scripts invoke local binaries through `npm run`.

---

## First-time setup and a full build

From the **`package/`** directory (the folder that contains `package.json`):

```sh
npm install
npm run build
```

A successful run prints bundle sizes and ends without errors:

```text
[build-bundle] UMD → …/package/dist/jslade.js
jslade.js      142.3 KB
jslade.min.js   68.7 KB  (-51.7%)
```

Exact numbers change as the engine grows; the important part is that both files appear under
`dist/` and the process exits with code 0.

If you clone the repository and `dist/` is missing or stale, always run **`npm run build`**
before opening the sandbox or loading `jslade.min.js` in a demo page.

---

## Daily workflow when you change source

When you edit anything under `src/jslade/`, rebuild before you verify in a browser:

```sh
npm run build
```

Then reload the page that loads `dist/jslade.min.js` (or `dist/jslade.js` while stepping
through readable output).

If you changed DOM patching, morphing, or reactive updates, open the browser test page
described in **Verifying DOM behaviour** below. For markup or directive compiler changes,
exercise the sandbox or your own `.jsd` components against the new bundle.

Before opening a pull request, run **`npm run format`** when you touched many files, then
**`npm run build`** again so the committed `dist/` matches source.

---

## npm scripts

| Script | What it does |
|---|---|
| **`npm run build`** | Full pipeline: bundle → minify → public API symbol check |
| **`npm run build:bundle`** | Bundle only → `dist/jslade.js` (skips minify and symbol check) |
| **`npm run format`** | Prettier on `src/jslade/**/*.js`, `scripts/**/*.mjs`, `debugger/**/*.js` |
| **`npm run dev`** | Static file server on port **5173** serving the **repository root** |

### `npm run build`

This is the command you use almost always. It runs `scripts/build-min.mjs`, which:

1. Spawns **`scripts/build-bundle.mjs`** to write `dist/jslade.js`.
2. Runs **terser** on that file to write `dist/jslade.min.js`.
3. Scans the minified output for a fixed list of public API property names. If any name
   disappeared — because minification mangled something it should not, or because the API
   was renamed without updating the guard — the build **fails loudly** instead of shipping
   a broken bundle.

### `npm run build:bundle`

Use this when you are iterating on bundle output and want to skip minification. It is also
the first place to look when **`npm run build`** fails: if `build:bundle` fails, the problem
is in source or esbuild configuration; if only the minify step fails, the problem is terser
or the symbol guard.

### `npm run format`

Jslade source uses **4-space** indentation, **no semicolons**, and **single quotes**.
Prettier enforces that consistently. Run it after wide edits so diffs stay readable.

### `npm run dev`

Starts a zero-config static server:

```sh
npm run dev
```

Open the sandbox at:

```text
http://localhost:5173/playgrounds/sandbox/
```

`npm run dev` serves the **package root** (this directory). The sandbox loads component
files from `playgrounds/sandbox/components/` with relative `fetch()` calls — no bundler or
PHP required. After engine changes, rebuild (`npm run build`) and hard-refresh the browser tab.

---

## What the bundle step does

`scripts/build-bundle.mjs` uses **esbuild** to compile the engine entry point into one
browser file.

**Entry:** `src/jslade/index.js`

**Output:** `dist/jslade.js`

**Format:** IIFE wrapped as UMD — one file works in three loading environments:

```html
<!-- Classic script tag: global Jslade -->
<script src="/assets/js/jslade.min.js"></script>
<script>
    Jslade.start()
</script>
```

```js
// CommonJS (Node tooling, some bundlers)
const { Jslade } = require('jslade')
```

```js
// Bundler resolving the "require" condition in package.json exports
const { Jslade } = require('jslade/dist/jslade.js')
```

The bundle footer adds CommonJS and AMD export tails. The engine also assigns
**`globalThis.Jslade`** when loaded via `<script src>`.

After esbuild writes the file, **Prettier** formats `dist/jslade.js` once so the non-minified
bundle stays readable when you diff or debug it.

---

## ESM without a build step

npm **`import`** resolves to source, not `dist/`:

```js
import { Jslade, escapeHtml, createDirectiveRegistry } from 'jslade'
```

That path loads **`src/jslade/index.js`** and its dependencies as native ES modules. Vite,
Webpack, and similar tools tree-shake and bundle from source directly — no `npm run build`
required in the consuming app.

| Consumption | File used | Build needed? |
|---|---|---|
| `<script src="…/jslade.min.js">` | `dist/jslade.min.js` | Yes — run build in the package |
| `require('jslade')` | `dist/jslade.js` | Yes |
| `import { Jslade } from 'jslade'` | `src/jslade/index.js` | No (consumer bundler compiles) |
| `import 'jslade/min'` | `dist/jslade.min.js` | Yes |

Published npm tarballs include both **`dist/`** and **`src/jslade/`** so either path works
for downstream projects.

---

## Source layout

Engine code lives entirely under **`src/jslade/`**. The folders mirror runtime responsibilities:

| Folder | Responsibility |
|---|---|
| **`ast/`** | Expression tokenizer, parser, and evaluator for `{{ }}`, handler bodies, and `@js` blocks |
| **`markup/`** | Template compiler, built-in directives, custom directive registry |
| **`compile/`** | `<script>` block parser and glue that turns a component definition into a render function |
| **`lifecycle/`** | Component instances, reactive state, `renderTo`, autostart, DOM morph/patch |
| **`lib/`** | Shared utilities — HTML escaping, Wire bus, reactive proxies, dev logging, hooks |

**`engine.js`** assembles the public **`Jslade`** object. **`index.js`** re-exports the
supported public surface (`Jslade`, `escapeHtml`, directive helpers, …).

Supporting files outside `src/jslade/`:

| Path | Role |
|---|---|
| **`scripts/build-bundle.mjs`** | esbuild → `dist/jslade.js` |
| **`scripts/build-min.mjs`** | terser + symbol validation → `dist/jslade.min.js` |
| **`tests/patch.html`** | Browser checks for DOM patching (run via `npm test`) |
| **`scripts/run-tests.mjs`** | Headless runner for `patch.html` (Playwright) |
| **`playgrounds/sandbox/`** | Static demo page loading the built min bundle |
| **`debugger/`** | Optional dev debug bar (ES modules, not part of the UMD build) |

The debug bar loads separately in development pages. It is not bundled into `jslade.min.js`
and must not be shipped to production.

---

## Public API symbol guard

After minification, `build-min.mjs` verifies that these property names still appear as plain
strings in `jslade.min.js`:

```
start, bootstrap, mountAll, renderTo, scanDOM,
compiledComponents, directive, sendState
```

Terser is configured to mangle local names but preserve object properties that must remain
callable from user code. If you **rename or remove** a public method on the `Jslade` object,
update the **`required`** array in `scripts/build-min.mjs` when the new name should stay
guaranteed, or restore the export if the removal was accidental.

If the build aborts with **`Build aborted: jslade.min.js is missing "…"`**, open the
minified file and search for the symbol. Usually the fix is either adjust the guard list or
fix an export that esbuild dropped.

---

## Automated tests

The package ships a **three-layer** test suite. Run everything with:

```sh
npm install
npx playwright install chromium    # once per machine
npm run test:ci                    # build + all tests
```

| Layer | Command | Coverage |
|-------|---------|----------|
| **Unit** | `npm run test:unit` | HTML utils, expression parser, markup compile/render, script scanner, `import()` normalization, Wire, public API exports, min-bundle symbol guard |
| **Browser — DOM** | `tests/patch.html` | Morph/patch: focus, keys, children, attributes, render-loop guard (38 cases) |
| **Browser — integration** | `tests/browser/integration.html` | Boot (`import`/`start`), `render()`, reactive updates, Wire |
| **Browser — distribution** | `tests/browser/bundle-min.html` | `dist/jslade.min.js` loads and mounts |

CI runs **`npm run test:ci`** on every push and pull request (workflow **Test**).

See **`tests/README.md`** for layout and how to add cases.

---

## Verifying DOM behaviour (manual)

`tests/patch.html` is a self-contained browser test page for the DOM morph layer. It mounts
small component trees, mutates state, and asserts that nodes are patched rather than replaced
wholly.

After changes under `lifecycle/` (especially `morph.js`, `component.js`, or render queue
code):

```sh
npm run build
```

Then open `package/tests/patch.html` through any static server, or double-click it if your
browser allows local file access to the bundled script. Every row should show a green check;
failures print in red with a short message.

This page does not replace manual testing with real `.jsd` components, but it catches
regressions in list reconciliation, keyed children, and focus preservation quickly.

---

## Publishing

`package.json` defines **`prepublishOnly`: `npm run build`**. Running **`npm publish`** from
`package/` rebuilds `dist/` automatically so the tarball always contains fresh bundles.

The **`files`** field whitelists what npm packs: both dist bundles, `src/jslade`, `docs/`,
and README. Generated artifacts you do not list there are never published.

---

## GitHub Wiki

Documentation lives in **`docs/`** — that folder is the **only** source of truth.

When you push changes under `docs/` to **`main`**, the workflow
**`.github/workflows/sync-wiki.yml`** copies those files into the
[GitHub Wiki](https://github.com/dottwatson/jslade/wiki) automatically. Do not edit wiki
pages in the GitHub UI; changes would be overwritten on the next sync.

**First time only:** GitHub creates the wiki git repository after the first page exists.
Open [Create wiki page](https://github.com/dottwatson/jslade/wiki/_new), save any placeholder
(for example title **Home**, body `init`), then run the workflow below — all later syncs are
automatic.

To run a sync manually: **Actions → Sync wiki from docs → Run workflow**.

To test locally (optional):

```sh
git clone https://github.com/dottwatson/jslade.wiki.git /tmp/jslade-wiki
node scripts/sync-wiki.mjs /tmp/jslade-wiki
```

---

## Troubleshooting

### `npm run build` exits immediately with a non-zero code

Run the steps separately:

```sh
npm run build:bundle
```

If that fails, read the esbuild error — typically a syntax error or a bad import path in
`src/jslade/`. Fix source and retry.

If `build:bundle` succeeds but full **`build`** fails, the failure is in terser or the symbol
guard. Inspect stderr for the missing symbol name or terser parse errors.

### `dist/jslade.min.js` is missing after clone

Generated output is committed in this repository, but a clean checkout policy or a partial
copy might omit `dist/`. Run **`npm run build`** once.

### Sandbox shows stale behaviour after editing source

The browser caches aggressive static assets. Rebuild, then hard-refresh. Confirm the HTML
points at `dist/jslade.min.js` (or `.js`) under `package/dist/`, not an older copy elsewhere
on disk.

### Minified bundle works but readable `jslade.js` looks wrong

Both files come from the same esbuild output; only minification differs. Debug against
`jslade.js` first. If the bug appears only in `.min.js`, suspect the symbol guard list or
terser options — not separate source.

### I added a new public method and callers cannot see it after minify

Ensure the method is attached to the **`Jslade`** object (or re-exported from `index.js` for
ESM consumers). Add the property name to the **`required`** array in `build-min.mjs` if the
build should fail when that name disappears from the minified file.

---

## Quick reference

```
Edit src/jslade/**/*.js
    → npm run format          (optional, wide edits)
    → npm run build           required
    → reload browser / open tests/patch.html
    → commit source + dist/ when preparing a release
```
