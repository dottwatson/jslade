# Wire and localWire

## Wire — communication between components

`wire(name)` returns a handle: **`.send()`**, **`.receive()`**, **`.get()`**, **`.clear()`**.

A channel is a string. It is not declared. An unknown name and a name that was never sent are the same **empty** channel: `get()` returns `undefined`.

| | `this.wire('theme')` / `Jslade.wire('theme')` | `this.localWire('ping')` |
|---|---|---|
| Where | Public square — the whole page | This instance's courtyard |
| Who can join | Anyone who knows the name | This instance, and children via `this.parent.localWire('ping')` |
| Unmount | Last `send` stays on the square | The courtyard is destroyed |

`send` is the flow: listeners hear it, and that value becomes the last one. `get()` reads the last `send` (optional fallback if empty). `receive` hears the flow from now on, and if a last value already exists it is replayed — it is never called for an empty channel. `clear()` wipes the last value and does **not** notify `receive`.

```js
function setLight() {
    this.wire('theme').send('light')
}

function tap() {
    this.parent.localWire('ping').send({ id: this.taskId })
}

mount(function () {
    this.wire('theme').receive(function (value) {
        this.state.theme = value
    })
    this.localWire('ping').receive(function (data) {
        this.state.lastChip = data.id
    })
})
```

From outside the tree:

```js
Jslade.wire('theme').send('dark')
Jslade.wire('theme').get()                 // 'dark'
Jslade.wire('theme').get('light')          // 'dark' (fallback unused)
Jslade.wire('theme').clear()
Jslade.wire('theme').get('light')          // 'light' — empty
Jslade.wire('theme').receive(function (value) { … })
```

Two parent instances do not share `localWire` names. They do share `wire('theme')`.

Subscribe in **`mount()`**, not `updated()` — each `receive` adds a listener. Subscriptions opened through **`this.wire` / `this.localWire`** are released on **`unmount()`**. `Jslade.wire(…).receive()` from page script is not: keep the unsubscribe function it returns.

Enable traffic logging during development:

```js
Jslade.start({ dev: true, showChannels: true })
```

---

