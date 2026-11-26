---
name: jslade
description: Build, integrate, or troubleshoot Jslade client-side components, templates, and reactive UI.
---

# Jslade

Jslade is a dependency-free client-side component engine for interactive islands in existing pages. Check the installed version and host project's conventions first. This skill describes Jslade 0.3.x; for version-specific details use the installed package's `docs/` or the [developer guide](https://github.com/dottwatson/jslade/tree/main/docs).

## Choose the relevant workflow

- **Create or change a component:** Read [components.md](references/components.md) for component structure, reactive state, lifecycle, templates, events, scoped CSS, and children. Follow the application's existing registration and styling conventions.
- **Add Jslade to a page or backend:** Read [components.md](references/components.md) for boot and mounting, then [integration.md](references/integration.md) for integration choices. Keep server-rendered data safely serialized and preserve the host's CSP.
- **Connect components or load libraries:** Read [integration.md](references/integration.md) for Wire, localWire, helpers, resource loading, and the JavaScript subset.
- **Troubleshoot an existing UI:** Identify the installed version, registration and mount path, then use the relevant references. For an empty component, check matching names, explicit `start()`, closing placeholder tags, and browser errors; `Jslade.start({ dev: true })` enables development diagnostics.

## Essential constraints

- `.jsd` is a convention: Jslade consumes complete `<noembed>` source strings, not files automatically. `Jslade.import()` registers component sources; `loadResources()` loads JS/CSS.
- A component script is interpreted as a JavaScript subset: no `async`/`await`, classes, or `switch`. Declare template methods with `function name() { ... }`.
- In event handlers call `this.method()`; loop variables do not survive until the event fires. Pass identifiers through element attributes instead.
- Verify relevant behavior in the actual page or project tests, including mounting, interaction, updates, and teardown where applicable.
