(function () {
  const { state, address, cbs, render } = window.App;

  async function showDashboard(addr) {
    render.dashboard(addr, null, startOnboarding);
    let groups = null;
    try { groups = await cbs.getDashboard(addr.neighborhood.code); }
    catch (e) { console.error(e); }
    render.dashboard(addr, groups, startOnboarding);
  }

  function startOnboarding() {
    render.onboarding(async (pc, hn) => {
      const addr = await address.lookup(pc, hn);
      if (!addr) throw new Error('no_match');
      state.setAddress(addr);
      await showDashboard(addr);
    });
  }

  const saved = state.getAddress();
  if (saved) showDashboard(saved); else startOnboarding();
})();
