# Programmatic API

Access via `Jslade.debug` after `attachDebug(Jslade)`:

```js
Jslade.debug.show()
Jslade.debug.hide()
Jslade.debug.enable()
Jslade.debug.disable()

Jslade.debug.instances()      // { _id, template, container, state, ... }
Jslade.debug.messages()       // Wire send logs
Jslade.debug.subscriptions()  // receive() registrations
Jslade.debug.resources()      // loadResources events
Jslade.debug.timings()        // render timing entries
```

Use from the browser console for scripts, ad-hoc checks, or test harnesses.

---

## Instance object shape

Each live instance (also via `element.component`):

```js
instance.state        // reactive Proxy
instance.container    // mounted HTMLElement
instance.template     // component name string
instance._id          // unique number
instance.parent       // parent instance or null
instance.children     // child instances from @component
instance.find(sel)
instance.findAll(sel)
instance.closest(sel)
instance.unmount()
instance.remove()     // DOM only — no lifecycle

el.component          // on the mount element
```

Aligns with [Instance API](../04-composition/14-instance-api.md).

Quick reference: [Appendix G](../appendices/G-debug-bar-quick-reference.md).
