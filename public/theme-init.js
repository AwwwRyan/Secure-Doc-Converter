// Applies the saved theme before first paint to avoid a flash.
// External (not inline) so the CSP can stay script-src 'self'.
try {
  var t = localStorage.getItem('sdc.theme');
  if (t === 'dark' || t === 'light') {
    document.documentElement.dataset.theme = t;
  }
} catch (e) {
  /* storage disabled — fall through to system theme */
}
