# Jslade Developer Guide

Client-side components for server-rendered pages — Blade-like templates, reactive `state`,
scoped CSS, one script tag.

This folder is the **source of truth** for user documentation. On push to `main`, contents sync
to the [GitHub Wiki](https://github.com/dottwatson/jslade/wiki) via `scripts/sync-wiki.mjs`.

---

## Reading paths

**Quick start (2–3 hours)**  
[How Jslade thinks](./01-mental-model/01-how-jslade-thinks.md) →
[Counter](./02-first-hour/04-counter.md) →
[Task list](./02-first-hour/05-task-list.md) →
[Debug bar setup](./07-debug-bar/21-setup-and-workflow.md) →
[Registering components](./05-integration/15-registering-components.md)

**Full book** — start at [About this book](./00-preface.md).

**Debug-first** — [About this book](./00-preface.md#reading-paths) → Part VII before Part IV.

---

## Contents

### Preface

- [About this book](./00-preface.md)

### Part I — Mental model

- [How Jslade thinks](./01-mental-model/01-how-jslade-thinks.md)
- [The .jsd file](./01-mental-model/02-jsd-anatomy.md)
- [Boot sequence](./01-mental-model/03-boot-sequence.md)

### Part II — Your first hour

- [Tutorial: counter](./02-first-hour/04-counter.md)
- [Tutorial: task list](./02-first-hour/05-task-list.md)
- [Tutorial: cart line item](./02-first-hour/06-cart-tutorial.md)

### Part III — Component anatomy

- [Script block](./03-component/07-script-block.md)
- [Template language](./03-component/08-template-language.md)
- [Event directives](./03-component/09-event-directives.md)
- [Scoped CSS](./03-component/10-scoped-css.md)
- [JavaScript subset](./03-component/11-javascript-subset.md)

### Part IV — Composition

- [Component tree](./04-composition/12-component-tree.md)
- [Wire and localWire](./04-composition/13-wire-localwire.md)
- [Instance API](./04-composition/14-instance-api.md)

### Part V — Integration

- [Registering components](./05-integration/15-registering-components.md)
- [Props from the backend](./05-integration/16-props-from-backend.md)
- [Lazy JS/CSS (`loadResources`)](./05-integration/17-load-resources.md)
- [CSP, security, performance](./05-integration/18-csp-security-performance.md)
- [Engine events](./05-integration/19-engine-events.md)

### Part VI — Extending

- [Custom directives](./06-extending/19-custom-directives.md)

### Part VII — Debug bar

- [Why the debug bar](./07-debug-bar/20-why-the-debug-bar.md)
- [Setup and workflow](./07-debug-bar/21-setup-and-workflow.md)
- [Components tab](./07-debug-bar/22-components-tab.md)
- [WireBus tab](./07-debug-bar/23-wirebus-tab.md)
- [Resources and Performance tabs](./07-debug-bar/24-resources-and-performance.md)
- [Templates and Directives tabs](./07-debug-bar/25-templates-and-directives.md)
- [Programmatic API](./07-debug-bar/26-programmatic-api.md)
- [Architecture and customization](./07-debug-bar/27-architecture-and-customization.md)

### Part VIII — Troubleshooting

- [Common errors and FAQ](./08-troubleshooting/28-common-errors-faq.md)
- [Local development](./08-troubleshooting/29-local-development.md)

### Appendices

- [Cheatsheet](./appendices/A-cheatsheet.md)
- [Debug bar quick reference](./appendices/G-debug-bar-quick-reference.md)

### Contributors

- [Building the engine](./contributing/build.md)

---

## Preview wiki locally

```sh
npm run wiki:preview    # from repo root or package/
```

Generates `wiki-preview/` with standard Markdown links (`./Page.md`). Open
`wiki-preview/Home.md` in the editor preview — sidebar and cross-links resolve locally.

GitHub Wiki uses `[[Wiki-Links]]` instead; that format is produced automatically on push
to `main` by `.github/workflows/sync-wiki.yml` (no `--local` flag).
