# Debug bar — see what your components are doing

When you are building the shop (or anything else), this toolbar shows **live instances**,
WireBus traffic, render timings, and compiled templates. Dev only — do not ship to production.

Files live in `debugger/` (package root):

| File | Role |
|---|---|
| `debugger/jslade-debug.css` | Styles (`--jsd-*` variables) |
| `debugger/jslade-debug.ui.js` | DOM layout |
| `debugger/jslade-debug.js` | Core — uses `Jslade._hooks` |

```html
<link rel="stylesheet" href="debugger/jslade-debug.css">
<script type="module">
    import { Jslade } from 'jslade'
    import { attachDebug } from './debugger/jslade-debug.js'

    Jslade.import(templates)
    Jslade.start()
    attachDebug(Jslade)
</script>
```

No monkey-patching — the bar listens to native engine hooks.

---

## Quick start

1. Add `debugger/jslade-debug.css` in your `<head>`.
2. Import Jslade and `attachDebug` as above.
3. Call **`attachDebug(Jslade)` after `start()`**.
4. Press **`Ctrl + \`** to toggle the panel.

If `window.Jslade` already exists when the module loads, it may auto-attach.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  🛠 Jslade Debug    📦 4 instances  📡 12 msgs  💾 18 MB  ▼    │  ← handle bar
├──────────────────────────────────────────────────────────────────┤
│  [Components] [WireBus] [Performance] [Templates] [Directives]   │  ← tabs
│                                                                  │
│  (selected tab content)                                          │  ← scrollable area
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Handle Bar (Always Visible)

| Indicator | Description |
|---|---|
| 📦 `N instances` | Total active component instances created via `renderTo()` |
| 📡 `N msgs` | Total WireBus messages sent/received (max 200 stored) |
| 💾 `N MB` | Current JS heap usage (Chrome only, uses `performance.memory`) |

### Resize

Drag the **top edge** of the bar to resize the panel height (15vh – 80vh). The cursor changes to ↕ when hovering the edge. Height is saved to `localStorage` and restored on reload.

---

## Tabs Reference

### 1. Components

Lists every active component instance in a **tree view**. Each node is collapsible — click ▶ to expand.

Each instance row shows:
- Template name and instance ID
- Container tag name (e.g., `<div>`, `<li>`, `<tr>`)
- Container DOM ID (if present)
- Expand/collapse ▶ toggle for children
- ℹ info button and ✕ destroy button

**Info panel** (click ℹ) — three columns:

| Column | Content | Editable |
|---|---|---|
| **Definition** | Compiled component metadata (`name`, `scopeId`, `hooks`) | ❌ Read-only |
| **this** | Custom properties on the instance. DOM props are filtered out; `find`, `findAll`, `unmount` shown as `[function]`. | ❌ Read-only |
| **State** | Reactive state (Proxy object). Includes instance metadata: `template`, `parent`, `children`, `_id`, `_hostMode`. | ✅ Edit JSON → click **Apply** |

**Actions:**
- Click component label → highlights component in the page (yellow border, scrolls to it, fades after 2s)
- Edit State JSON → `Apply` → component re-renders immediately (invalid JSON shows alert)
- Click `✕` → destroys the component (calls `unmount()`, removes from DOM and list)
- Tree nodes update in real-time as components are created/destroyed

### 2. WireBus

Messages grouped by **channel**. Each channel header shows message count and expand/collapse toggle.

Expanded view shows the 20 most recent messages per channel:

```
┌──────────────────────────────────────────────────────────┐
│ ▼ changeColor                             3 msgs         │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 14:32:01  {"text":"Hello","color":"#ff0000"}         │  │
│ │ 14:32:05  {"color":"#00ff00"}                        │  │
│ │ 14:32:08  {"color":"#0000ff"}                        │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- Timestamps shown in local time
- Payload displayed as JSON (stringified) or raw string, truncated to 100 characters
- Expanded channels **stay expanded** across refreshes
- State saved to `localStorage`

### 3. Performance

Shows aggregate metrics:

- **Total renders** — count and cumulative render time in milliseconds
- **Active instances** — current count of live component instances
- **Channel messages** — total WireBus messages logged (max 200)
- **Memory** — used JS heap size in MB (Chrome only, from `performance.memory`)

### 4. Templates

Lists all compiled templates (from `Jslade.compiledComponents` or `Jslade.list()`). Each is **collapsed by default** — click ▶ to expand and see the **full source definition**:

```json
{
    "script": "props({ ... })\nmount((send) => { ... })",
    "scopedStyles": ".my-class { ... }",
    "markup": "<div style-scoped>...</div>",
    "scopeTargets": true
}
```

Read-only. Shows `(empty)` for missing sections.

> **Note:** Templates registered via `compile()` or `import()` show full source when available; otherwise the panel shows compiled metadata only.

### 5. Directives

Lists all registered directives with color-coded badges:

| Badge Color | Type | Examples |
|---|---|---|
| Blue `built-in` | Built-in directives | `@if`, `@elseif`, `@else`, `@foreach`, `@for`, `@component`, `@endif`, `@endforeach`, `@endfor` |
| Green `if` | Conditional directives | `@admin`, `@role` (registered via `Jslade.if()`) |
| Purple `block` | Block directives | `@panel` (registered via `Jslade.directive('panel', { block: true }, ...)`) |
| Orange `inline` | Inline directives | `@badge` (registered via `Jslade.directive('badge', ...)`) |

Built-in directives are populated automatically. Custom directives appear as they are registered.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + \` | Toggle panel open/close |

---

## Persistence (localStorage)

The debug bar saves its state per-page to `localStorage`. The key is:

```
jslade_debug_<sanitized_pathname>
```

Example: `jslade_debug_example_dashboard_html`

**Saved values:**

| Key | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | `false` | Panel open or closed |
| `activeTab` | `string` | `components` | Currently selected tab |
| `expandedChannels` | `object` | `{}` | Which WireBus channels are expanded |
| `panelHeight` | `number` | `45` | Panel height in vh (15–80) |

All values survive page reloads and navigation. Different pages have independent state.

---

## Programmatic API

Access via `Jslade.debug`:

```js
// Show/hide
Jslade.debug.show()       // open the panel
Jslade.debug.hide()       // close the panel

// Enable/disable the entire bar
Jslade.debug.enable()     // make visible
Jslade.debug.disable()    // hide completely

// Get raw data
Jslade.debug.instances()  // → array of instance objects { _id, template, container, state, ... }
Jslade.debug.messages()   // → array of WireBus messages { channel, payload, time }
Jslade.debug.timings()    // → array of render timing entries { name, ms }
```

### Instance Object

Each component instance returned by `renderTo()` has:

```js
instance.state       // Proxy — deep reactive state
instance.container   // HTMLElement — the mounted DOM node
instance.template    // string — template name
instance._id         // number — unique ID
instance.parent      // object|null — parent instance
instance.children    // array — child instances (from @component)
instance.find(sel)   // function — querySelector on container
instance.findAll(sel)// function — querySelectorAll on container
instance.closest(sel)// function — closest ancestor matching selector
instance.unmount()   // function — destroy recursively
instance.remove()    // function — remove container from DOM (no lifecycle)

// On the DOM element:
el.component         // → the instance
```

---

## Architecture

### How It Hooks into Jslade

`jslade-debug.js` consumes **native engine hooks** (`Jslade._hooks`). When `attachDebug(Jslade)` is called, it pushes listener functions into the hook arrays:

| Hook | Purpose |
|---|---|
| `J._hooks.message` | Logs WireBus messages (channel, payload, timestamp, isState) |
| `J._hooks.subscribe` | (Reserved for future use) |
| `J._hooks.render` | Measures render timings per instance (name, ms, instance) |
| `J._hooks.instance` | Tracks create/unmount lifecycle (`action: 'create'` or `'unmount'`) |
| `J._hooks.directive` | Tracks registered directives (name, type) |

No monkey-patching, no wrapper functions, no setter traps. The engine emits events; the debug bar listens.

### How It Renders

Uses `setTimeout(16)` batching for stat updates — compatible with background tabs where `requestAnimationFrame` is throttled. The handle bar stats update on every batched refresh, **even when the panel is closed**. The panel content only renders when open.

### Data Limits

- Maximum messages stored: **200** (oldest evicted)
- Maximum render timings stored: **200** (oldest evicted)
- All limits apply per debug session (not persisted to localStorage)

---

## CSS Custom Properties

The debug bar uses CSS custom properties for theming, all scoped under `#jslade-debug-bar`:

```css
--jsd-bg: #1a1a2e;        /* Main background */
--jsd-bg-header: #16213e;  /* Header bar background */
--jsd-bg-panel: #0f0f23;   /* Tab panel background */
--jsd-border: #2a2a4a;     /* Borders and separators */
--jsd-text: #e0e0e0;       /* Primary text */
--jsd-muted: #6c757d;      /* Muted/secondary text */
--jsd-accent: #0d6efd;     /* Accent/active color */
--jsd-warn: #ffc107;       /* Warning/highlight */
--jsd-send: #198754;       /* Sender badge (green) */
--jsd-danger: #dc3545;     /* Danger/destroy buttons */
--jsd-block: #6f42c1;      /* Block directive badge (purple) */
--jsd-inline: #fd7e14;     /* Inline directive badge (orange) */
```

Override these in your own stylesheet to match your brand.

---

## Limitations

| Limitation | Reason |
|---|---|
| No component tree hierarchy beyond parent/children | Jslade has no Virtual DOM — components are flat instances with explicit parent-child links |
| No prop inspection in debug UI | Jslade merges props into render context at render time; the raw props object is not retained separately |
| Memory monitoring (Chrome only) | `performance.memory` is a non-standard API, only available in Chromium-based browsers |
| No Vue/React-style time-travel debugging | Requires Virtual DOM + state snapshots |
| No router/store inspection | Jslade doesn't have a built-in router or store |
| Max 200 messages/renders stored | Older entries are evicted to bound memory usage |

---

## File Sizes

| File | Approx. Lines | Minified | Dependencies |
|---|---|---|---|
| `jslade-debug.js` | ~500 | ~7 KB | `jslade-debug.ui.js` |
| `jslade-debug.ui.js` | ~200 | — | None |
| `jslade-debug.css` | ~200 | — | None |
| `jslade-storage.js` | ~120 | ~1 KB | None |

---

## Styling Isolation

All debug bar styles are scoped under `#jslade-debug-bar`. The bar forces `box-sizing: border-box` on its entire subtree. It uses `position: fixed; bottom: 0; z-index: 99999` to overlay the page without affecting layout (padding-bottom is added to `<body>` dynamically when the bar is visible).

The body element receives the class `jslade-debug-active` when the bar is visible, so you can adjust your own layout if needed:

```css
body.jslade-debug-active {
    /* Your overrides here */
}
```
