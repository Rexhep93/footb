(function () {
  const { state, address, cbs, render } = window.App;

  let currentAddr = null;
  let currentStats = null;
  let currentNl = null;
  let activeTab = 'thuis';

  const handlers = {
    onTab(tab) {
      activeTab = tab;
      render.shell(activeTab, currentAddr, currentStats, currentNl, handlers);
    },
    onSettings() {
      render.openSettings(startOnboarding);
    },
  };

  async function loadStats(addr) {
    try { return await cbs.getStats(addr.neighborhood.code); }
    catch (e) { console.error(e); return false; }
  }

  async function loadNl() {
    try { return await cbs.getNlAverages(); }
    catch (e) { console.error(e); return null; }
  }

  async function showShell(addr) {
    currentAddr = addr;
    currentStats = null;
    currentNl = null;
    render.shell(activeTab, currentAddr, currentStats, currentNl, handlers);

    // Stats en NL parallel laden, rerender wanneer beide klaar zijn
    const [stats, nl] = await Promise.all([loadStats(addr), loadNl()]);
    currentStats = stats;
    currentNl = nl;
    render.shell(activeTab, currentAddr, currentStats, currentNl, handlers);
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
