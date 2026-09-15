# Setup and workflow

## Quick start

1. Add `debugger/jslade-debug.css` in your `<head>`.
2. Import Jslade and `attachDebug` from `./debugger/jslade-debug.js`.
3. Call **`attachDebug(Jslade)` after `start()`**.
4. Press **`Ctrl + \`** to toggle the panel.

If `window.Jslade` already exists when the module loads, the debug script may auto-attach.

---

## Daily workflow

```
edit .jsd → reload page → Ctrl+\ → pick tab → inspect / tweak → repeat
```

1. Run the page with `Jslade.start({ dev: true })` during development.
2. Open the bar — handle stats update even when the panel is closed.
3. Use **Components** to highlight a widget on the page or patch **State** JSON.
4. Use **WireBus** when parent/child messaging misbehaves.
5. Use **Performance** if interactions feel sluggish (full template re-render per update).

Sandbox with debugger: `npm run build && npm run dev` → `playgrounds/sandbox/`.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  🛠 Jslade Debug    📦 4 instances  📡 12 msgs  💾 18 MB  ▼    │  ← handle bar
├──────────────────────────────────────────────────────────────────┤
│  [Components] [WireBus] [Resources] [Performance] [Templates] [Directives] │
│  (selected tab content)                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Handle bar

| Indicator | Description |
|-----------|-------------|
| 📦 `N instances` | Active component instances |
| 📡 `N msgs` | Wire `send` messages logged (max 200 stored) |
| 💾 `N MB` | JS heap (Chrome only — `performance.memory`) |

### Resize

Drag the **top edge** (15vh – 80vh). Height persists in `localStorage`.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + \` | Toggle panel open/close |

---

## Persistence (`localStorage`)

Key pattern: `jslade_debug_<sanitized_pathname>` (example: `jslade_debug_example_dashboard_html`).

| Key | Default | Description |
|-----|---------|-------------|
| `isOpen` | `false` | Panel open/closed |
| `activeTab` | `components` | Selected tab |
| `expandedChannels` | `{}` | WireBus channel expansion |
| `panelHeight` | `45` | Height in vh (15–80) |

Each page path has independent state.

---

## Tab guide

| Tab | Chapter |
|-----|---------|
| Components | [Components tab](./22-components-tab.md) |
| WireBus | [WireBus tab](./23-wirebus-tab.md) |
| Resources, Performance | [Resources and Performance](./24-resources-and-performance.md) |
| Templates, Directives | [Templates and Directives](./25-templates-and-directives.md) |
| API | [Programmatic API](./26-programmatic-api.md) |
