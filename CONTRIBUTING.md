# Contributing to Jslade

Thank you for your interest in contributing. This document covers the **`jslade`** npm package
in this directory — the client engine only. PHP demo code, if present in the parent
workspace, is optional reference material.

## Project layout

| Path | Role |
|------|------|
| `src/jslade/` | Engine source |
| `dist/` | Built UMD bundles (generated — do not edit) |
| `docs/` | Public API and integration guides |
| `playgrounds/sandbox/` | Static demo and example `*.jsd` components |
| `debugger/` | Development debug bar (not for production) |
| `scripts/` | Build scripts |
| `tests/` | Browser tests (`patch.html`) |

## Before you submit

1. **Match existing style** — 4-space indent, no semicolons, single quotes. Run `npm run format`.
2. **Keep diffs minimal** — one concern per change; no drive-by refactors.
3. **Preserve the public API** unless the change is explicitly breaking (document in CHANGELOG).
4. **Run build and tests:**

   ```sh
   npm run test:ci
   ```

5. **Engine changes** must pass symbol validation in `scripts/build-min.mjs`.

## Engine changes

```sh
npm run build    # bundle + minify → dist/
```

Open `tests/patch.html` in a browser after engine changes that touch DOM patching, or run
**`npm run test:ci`** for the headless suite.

## Component / docs changes

- Example components: `playgrounds/sandbox/components/**/*.jsd`
- Docs: `docs/` (synced to [GitHub Wiki](https://github.com/dottwatson/jslade/wiki) on push)
- Package README stays concise; detailed guides belong in `docs/`

## Pull requests

1. Describe the problem and the approach.
2. Note any API or behaviour changes.
3. Confirm `npm run build` passes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
