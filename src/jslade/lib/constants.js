/** Wrapper tag for in-page component definitions (scanDOM). */
export const COMPONENT_DEF_TAG = 'noembed'

export const MAX_COMPILE_ITERATIONS = 50_000

/** Guards against updated() writing to state and re-triggering itself forever. */
export const MAX_CONSECUTIVE_RENDERS = 50

/** Declaration order matters: mount runs once, updated after every re-render, unmount before teardown. */
export const LIFECYCLE_HOOKS = ['mount', 'updated', 'unmount']

/** Event directives mark their element with `<prefix><event>="<handler id>"`; no inline JS, so a strict CSP passes. */
export const EVENT_ATTRIBUTE_PREFIX = 'data-jsd-on-'

/** Instance members win over state in method context, so a prop with one of these names is unreachable via `this`. */
export const INSTANCE_RESERVED_NAMES = [
    'id',
    'name',
    'template',
    'container',
    'parent',
    'children',
    'childrens',
    'state',
    'initialized',
    'source',
    'find',
    'findAll',
    'closest',
    'remove',
    'unmount',
    'renderTo',
]
