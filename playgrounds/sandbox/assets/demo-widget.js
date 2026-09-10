;(function (root) {
    root.DemoWidget = {
        paint: function (el, label) {
            if (!el) return
            el.textContent = label || 'DemoWidget ready'
            el.setAttribute('data-demo-widget', '1')
        },
    }
})(typeof window !== 'undefined' ? window : this)
