(function () {
  const { state, address, cbs, render } = window.App;

  let currentAddr = null;
  let currentStats = null;
  let activeTab = 'thuis';

  const handlers = {
    onTab(tab) {
      activeTab = tab;
      render.shell(activeTab, currentAddr, currentStats, handlers);
    },
    onSettings() {
      render.openSettings(startOnboarding);
    },
  };

  async function loadStats(addr) {
    try { return await cbs.getStats(addr.neighborhood.code); }
    catch (e) { console.error(e); return false; }
  }

  async function showShell(addr) {
    currentAddr = addr;
    currentStats = null;
    render.shell(activeTab, currentAddr, currentStats, handlers);
    currentStats = await loadStats(addr);
    render.shell(activeTab, currentAddr, currentStats, handlers);
  }

  function startOnboarding() {
    render.onboarding(async (pc, hn) => {
      const addr = await address.lookup(pc, hn);
      if (!addr) throw new Error('no_match');
      state.setAddress(addr);
      activeTab = 'thuis';
      await showShell(addr);
    });
  }

  const saved = state.getAddress();
  if (saved) showShell(saved); else startOnboarding();
})();
