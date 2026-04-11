window.App = window.App || {};
(function () {
  const KEY = window.App.config.STORAGE_KEY;
  window.App.state = {
    getAddress() {
      try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
    },
    setAddress(addr) { localStorage.setItem(KEY, JSON.stringify(addr)); },
    clear() { localStorage.removeItem(KEY); },
  };
})();
