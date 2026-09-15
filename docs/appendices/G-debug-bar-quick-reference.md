# Debug bar quick reference

Condensed reference. Full guide: [20-why-the-debug-bar.md](../07-debug-bar/20-why-the-debug-bar.md).

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + \` | Toggle panel open/close |

---


## Tabs

- **Components** — instance tree, state edit, highlight, destroy
- **WireBus** — `send` traffic on `wire` / `localWire`
- **Resources** — `loadResources` events
- **Performance** — render timings, memory (Chrome)
- **Templates** — compiled source
- **Directives** — built-in + custom registry

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
Jslade.debug.instances()     // → array of instance objects { _id, template, container, state, ... }
Jslade.debug.messages()      // → Wire send logs { channel, payload, time, local }
Jslade.debug.subscriptions() // → receive() registrations { channel, local, instanceId, template, time }
Jslade.debug.resources()     // → loadResources events { type, src, status, time }
Jslade.debug.timings()       // → render timing entries { name, ms }
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

