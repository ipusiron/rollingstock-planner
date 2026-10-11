/* Apply the preferred theme before painting. Storage is optional. */
(function () {
  let theme = 'light';
  try { const saved = localStorage.getItem('rsp_theme'); if (['light', 'dark'].includes(saved)) theme = saved; } catch (_) { /* Optional. */ }
  document.documentElement.dataset.theme = theme;
})();
