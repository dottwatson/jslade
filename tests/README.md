# Test suite

Automated tests for the **jslade** npm package. Run everything with:

```sh
npm run test:ci    # build + unit + browser
npm test           # unit + browser (requires existing dist/)
npm run test:unit  # Node only
npm run test:browser
npm run test:coverage  # unified unit + browser → badges/coverage.json
```

## Layout

| Path | Runner | What it covers |
|------|--------|----------------|
| `tests/unit/*.test.js` | Node `node:test` | Parser, markup compile, script scan, import rules, Wire, public API, min bundle symbols |
| `tests/patch.html` | Playwright | DOM morphing — focus, keys, children, attributes, render loop guard |
| `tests/browser/integration.html` | Playwright | `import`/`start`, `render()`, reactive `renderTo`, Wire, `list()` |
| `tests/browser/scoped-css.html` | Playwright | Scoped CSS at runtime — injection, `style-scoped`, silent failure mode |
| `tests/browser/bundle-min.html` | Playwright | Production `dist/jslade.min.js` smoke test |

## CI

GitHub Actions workflow **Test** (`.github/workflows/test.yml`) runs on push and pull requests to `main`.

First-time local setup:

```sh
npm install
npx playwright install chromium
npm run test:ci
```

## Adding tests

**Unit (Node):** add `tests/unit/my-feature.test.js` using `node:test` and imports from `src/jslade/`.

**Browser:** add `tests/browser/my-feature.html` following the `assert()` + `window.__results` pattern, then register the path in `scripts/run-browser-tests.mjs` → `BROWSER_SUITES`.

## What is not automated

- Visual regression / scoped CSS pixel checks
- Full sandbox `showcase.jsd` manual UX
- npm publish dry-run (build guard covers min bundle symbols)

These remain manual checks before release.
