/**
 * Diagnostics. Warnings are opt-in via Jslade.bootstrap({ dev: true }) or Jslade.dev = true;
 * errors always surface, otherwise a template that fails to compile renders nothing and says nothing.
 */
export const _devLog = {
    enabled: false,
    warn(...args) {
        if (this.enabled) console.warn(...args)
    },
    error(...args) {
        console.error(...args)
    },
}
