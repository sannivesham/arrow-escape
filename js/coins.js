/* =====================================================================
   PAUSE MANAGER & COMPATIBILITY
   (Coins concept removed)
   Handles pausing when opening Settings/Profile mid-puzzle without resetting.
   ===================================================================== */
(function () {
  function wirePause(app) {
    var held = null, justBack = null, sw0 = app.switchScreen.bind(app);
    function drop() { if (held) { try { held.eng.destroy(); } catch (e) {} held = null; } }
    app.switchScreen = function (name, lvl, upd) {
      if (upd !== false) return sw0(name, lvl, upd);
      var overlay = name === 'settings' || name === 'profile', eng = app.bendingEngine;
      if (overlay && app.currentScreen === 'puzzle' && eng && !eng.won && !eng.dead && !eng.isLocked) {
        held = { eng: eng, level: app.currentLevelNum, at: Date.now() };
        app.bendingEngine = null; app._holding = true;
        try { return sw0(name, lvl, upd); } finally { app._holding = false; }
      }
      if (overlay && held) { app._holding = true; try { return sw0(name, lvl, upd); } finally { app._holding = false; } }
      if (name === 'puzzle' && justBack && Date.now() - justBack.at < 600 && (lvl == null || Number(lvl) === justBack.level)) return;
      if (held && name === 'puzzle' && (lvl == null || Number(lvl) === held.level)) {
        var h = held, launch = app.launchBendingLevel; held = null; justBack = { level: h.level, at: Date.now() };
        app.launchBendingLevel = function () {};
        try { sw0(name, lvl, upd); } finally { app.launchBendingLevel = launch; }
        app.bendingEngine = h.eng; app.currentLevelNum = h.level;
        if (h.level < 20001 && h.eng.startTime) h.eng.startTime += Date.now() - h.at;
        return;
      }
      if (held) drop();
      return sw0(name, lvl, upd);
    };
  }

  function boot() {
    var app = window.app;
    if (app) wirePause(app);
  }

  // Safe compatibility stubs
  window.ArroutCoins = {
    FEE: 0,
    canStake: function () { return true; },
    stake: function (name, cb) { if (cb) cb(); },
    settle: function (outcome, name, cb) { if (cb) cb(); },
    fly: function () { return Promise.resolve(); },
    paint: function () {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
