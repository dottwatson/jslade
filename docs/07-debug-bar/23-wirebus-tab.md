# WireBus tab

Logs **`send`** on public `wire` and `localWire` channels. **`get()`** and **`clear()`** do
not appear — they emit no message.

Messages are grouped by **channel**. Each header shows message count, expand/collapse, and
**active `receive()` subscribers**.

---

## Subscriber badges

| Badge | Meaning |
|-------|---------|
| Blue `wire` | Page bus — `this.wire(name).receive(...)` |
| Purple `localWire` | Per-instance — `this.localWire(name).receive(...)` |

Click a subscriber badge to highlight that component on the page.

---

## Message list

Expanded channels show the **20 most recent `send` payloads**:

- Timestamps in local time
- Payload as JSON or string (truncated to 100 chars)
- Scope badge per row (`wire` or `localWire`)

Expanded channels **stay expanded** across refreshes (saved to `localStorage`).

---

## Debugging recipes

| Symptom | What to check |
|---------|----------------|
| Send logged, nothing updates | Zero subscribers on that channel — wrong name or `wire` vs `localWire` |
| Duplicate handlers | Multiple `receive()` in `mount()` or re-subscribing in `updated()` |
| Child cannot reach parent | Child must use `this.parent.localWire`, not its own `localWire` |

Concepts: [Wire and localWire](../04-composition/13-wire-localwire.md).

Enable console logging alongside the tab:

```js
Jslade.start({ dev: true, showChannels: true })
```
