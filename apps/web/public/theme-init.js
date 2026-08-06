;(function initializeTheme() {
  var storedTheme = localStorage.getItem('cerebero-theme')
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  var resolvedTheme =
    storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark)
      ? 'dark'
      : 'light'

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  document.documentElement.dataset.theme = storedTheme || 'system'

  var themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#0D1210' : '#F3F0E8',
    )
  }
})()
