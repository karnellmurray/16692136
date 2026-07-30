/* ─── Mobile: shrink discipline pills to fit on one line ────────────
   CSS text-overflow:ellipsis can't guarantee arbitrary-length text
   (e.g. "Steadycam Operator") always fits a fixed-width pill without
   truncating awkwardly. This measures each pill and reduces its
   font-size just enough to fit, only below the 1024px breakpoint used
   in mobile.css. Doesn't touch main.js — watches #membersGrid with a
   MutationObserver since main.js renders cards asynchronously after
   its API fetch resolves. ─────────────────────────────────────────── */

;(function () {
  const BREAKPOINT   = 1024
  const MIN_FONT_PX  = 7
  const STEP_PX      = 0.5

  function isMobile() {
    return window.innerWidth <= BREAKPOINT
  }

  function fitPill(el) {
    el.style.fontSize = ''
    if (!isMobile()) return

    let size = parseFloat(getComputedStyle(el).fontSize)
    while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
      size -= STEP_PX
      el.style.fontSize = size + 'px'
    }
  }

  function fitAllPills() {
    document.querySelectorAll('.card-discipline').forEach(fitPill)
  }

  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(fitAllPills, 150)
  })

  const grid = document.getElementById('membersGrid')
  if (grid) {
    let mutationTimer
    new MutationObserver(() => {
      clearTimeout(mutationTimer)
      mutationTimer = setTimeout(fitAllPills, 50)
    }).observe(grid, { childList: true, subtree: true })
  }

  fitAllPills()
})()
