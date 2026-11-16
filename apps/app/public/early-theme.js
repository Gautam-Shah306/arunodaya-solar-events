(function () {
  try {
    var mode = localStorage.getItem('arunodaya.theme.mode');
    var canvas = localStorage.getItem('arunodaya.theme.canvas');
    if (mode === 'light' || mode === 'dark') {
      document.documentElement.style.colorScheme = mode;
    }
    if (canvas && /^#[0-9a-fA-F]{6}$/.test(canvas)) {
      document.documentElement.style.backgroundColor = canvas;
    }
  } catch (e) {
    /* Ignore storage access denial or quota restrictions */
  }
})();
