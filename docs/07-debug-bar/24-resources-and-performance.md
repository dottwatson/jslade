# Resources and Performance tabs

## Resources tab

Logs every `loadResources()` / `this.loadResources()` event via the engine `resource` hook.

| Badge | Meaning |
|-------|---------|
| `network` | New `<script>` / `<link>` injected |
| `dom` | Reused existing tag in the document |
| `cache` | Page-wide deduped Promise reused |
| `module` | Dynamic `import()` |
| `skip` | Entry skipped — `test()` returned true |

Shows the **50 most recent** loads (type, URL, status, time).

Assets are **not** removed on unmount — the log tracks load activity, not current ownership.

Guide: [Lazy JS/CSS (loadResources)](../05-integration/17-load-resources.md).

---

## Performance tab

Aggregate metrics:

- **Total renders** — count and cumulative time (ms)
- **Active instances** — live instance count
- **Channel messages** — Wire `send` total (max 200 stored)
- **Wire subscriptions** — `receive()` registrations
- **Resources loaded** — `loadResources` events
- **Memory** — JS heap MB (Chrome only)

Use this tab to internalize Jslade's model: **each state change re-runs the full template**
for that instance. High render counts on a single instance may mean splitting into child
components or avoiding unconditional writes in `updated()`.

See [CSP, security, performance](../05-integration/18-csp-security-performance.md).
