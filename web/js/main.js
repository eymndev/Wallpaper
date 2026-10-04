// Tarayıcı tarafı: canvas çizimi, animasyon döngüsü, örnek veri ve Swift köprüsü.
(function (G) {
  const AW = G.AW;
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  const params = new URLSearchParams(location.search);
  const native = G.webkit && G.webkit.messageHandlers && G.webkit.messageHandlers.aw;
  const reduceMotion = G.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT_STACK = '"IBM Plex Mono", "SF Mono", Menlo, Monaco, monospace';

  const store = {
    get(k) { try { return localStorage.getItem("aw." + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("aw." + k, v); } catch (e) { /* depolama kapalı olabilir */ } },
  };

  const S = {
    cpu: 28, ram: 9.6, ramTotal: 16, battery: 82, charging: false, onBattery: true,
    down: 3.2, up: 0.4, cpuHist: Array(40).fill(25), netHist: Array(40).fill(2),
    track: "Barış Manço — Dönence", weather: "İstanbul  18°C  parçalı bulutlu", live: false,
  };

  const state = {
    theme: null, themeState: null, grid: new AW.Grid(10, 10),
    cw: 8, ch: 16, fontScale: 1, showPanel: params.get("panel") !== "0" && store.get("panel") !== "0",
    showClock: params.get("clock") !== "0", showThemeName: params.get("name") !== "0", paused: false,
    toast: "", toastUntil: 0, t: 0, lastFrame: 0, lastDraw: 0,
  };

  function pushHist() {
    S.cpuHist.push(S.cpu); S.cpuHist.shift();
    S.netHist.push(S.down); S.netHist.shift();
  }

  function simulate() {
    if (S.live) return;
    const walk = (v, s, lo, hi) => AW.clamp(v + (Math.random() - 0.5) * s, lo, hi);
    S.cpu = walk(S.cpu, 18, 3, 97);
    S.ram = walk(S.ram, 0.4, 6, 15.4);
    S.battery = walk(S.battery, 0.3, 15, 100);
    S.down = walk(S.down, 3, 0.05, 30);
    S.up = walk(S.up, 0.5, 0.01, 5);
    pushHist();
  }

  function findTheme(id) {
    return AW.findTheme(id) || AW.themes[0];
  }

  function setTheme(id, announce = true) {
    state.theme = findTheme(id);
    // Görsel temalar daha sık bir ızgara (küçük yazı) isteyebilir
    if ((state.theme.fontScale || 1) !== state.fontScale) resize();
    else initTheme();
    document.body.style.background = state.theme.bg || "#000";
    store.set("theme", state.theme.id);
    if (announce) {
      state.toast = `tema: ${state.theme.name}`;
      state.toastUntil = state.t + 2.5;
    }
    if (native) native.postMessage({ type: "theme", id: state.theme.id });
  }

  function initTheme() {
    state.themeState = state.theme.init ? state.theme.init(state.grid, S) || {} : {};
  }

  function step(delta) {
    const i = AW.themes.indexOf(state.theme);
    setTheme(AW.themes[(i + delta + AW.themes.length) % AW.themes.length].id);
  }

  function resize() {
    const dpr = G.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.fontScale = (state.theme && state.theme.fontScale) || 1;
    const fs = AW.clamp((innerWidth / 110) * state.fontScale, Math.max(6, 10 * state.fontScale), 16);
    ctx.font = `${fs}px ${FONT_STACK}`;
    ctx.textBaseline = "top";
    state.cw = ctx.measureText("M").width;
    state.ch = Math.round(fs * 1.18);
    state.grid.resize(Math.ceil(innerWidth / state.cw), Math.ceil(innerHeight / state.ch), state.cw / state.ch);
    drawn.full = true; // canvas boyutu değişince içeriği silinir
    if (state.theme) initTheme();
  }

  // Bir önceki karede ekranda olan hücreler. Yalnız değişen hücreler yeniden çizilir: görsel temalarda
  // hücrelerin çoğu kareden kareye aynı kalır, sık ızgarada her kareyi baştan çizmek gereksiz pahalı.
  const drawn = { ch: [], fg: [], bg: [], base: null, full: true };

  function render() {
    const g = state.grid, { cw, ch } = state, n = g.cols * g.rows;
    const base = state.theme.bg || "#000";
    if (drawn.full || drawn.ch.length !== n || drawn.base !== base) {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      drawn.ch = new Array(n).fill(" ");
      drawn.fg = new Array(n).fill(null);
      drawn.bg = new Array(n).fill(null);
      drawn.base = base;
      drawn.full = false;
    }
    let last = null;
    for (let y = 0; y < g.rows; y++) {
      const top = y * ch;
      for (let x = 0; x < g.cols; x++) {
        const k = y * g.cols + x;
        const c = g.ch[k], fg = c === " " ? null : g.fg[k] || null, bg = g.bg[k] || null;
        if (c === drawn.ch[k] && fg === drawn.fg[k] && bg === drawn.bg[k]) continue;
        drawn.ch[k] = c; drawn.fg[k] = fg; drawn.bg[k] = bg;
        // Hücreler tam piksellere oturur: komşular arasında boşluk ya da üst üste binme kalmaz
        const x0 = Math.floor(x * cw), x1 = Math.floor((x + 1) * cw);
        ctx.fillStyle = last = bg || base;
        ctx.fillRect(x0, top, x1 - x0, ch);
        if (!fg) continue;
        if (fg !== last) ctx.fillStyle = last = fg;
        ctx.fillText(c, x * cw, top + 1);
      }
    }
  }

  function frame(dt) {
    const g = state.grid;
    g.clear();
    state.theme.frame(g, state.t, dt, S, state.themeState);
    AW.drawUI(g, new Date(), state.t, S, state.theme.ui, {
      showPanel: state.showPanel, showClock: state.showClock, reduceMotion,
      themeName: state.theme.name, showThemeName: state.showThemeName,
      toast: state.toast, toastUntil: state.toastUntil,
    });
    render();
  }

  function fps() {
    if (reduceMotion) return 1;
    if (S.onBattery && S.live) return 12;
    return 20;
  }

  function loop(ms) {
    requestAnimationFrame(loop);
    if (state.paused) return;
    const now = ms / 1000;
    if (now - state.lastDraw < 1 / fps() - 0.002) return;
    const dt = Math.min(0.25, state.lastDraw ? now - state.lastDraw : 0.05);
    state.lastDraw = now;
    state.t += dt;
    frame(dt);
  }

  // ---- Swift tarafının çağırdığı köprü ----
  G.wallpaper = {
    update(d) {
      Object.assign(S, d, { live: true });
      pushHist();
    },
    setTheme: (id) => setTheme(id, false),
    nextTheme: () => step(1),
    setPanel(on) { state.showPanel = !!on; store.set("panel", on ? "1" : "0"); },
    setClock(on) { state.showClock = !!on; },
    setThemeName(on) { state.showThemeName = !!on; },
    setPaused(on) { state.paused = !!on; },
    listThemes: () => AW.themes.map((t) => ({ id: t.id, name: t.name })),
    currentTheme: () => state.theme.id,
  };

  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "p") G.wallpaper.setPanel(!state.showPanel);
    else if (e.key === "n") G.wallpaper.setThemeName(!state.showThemeName);
  });
  addEventListener("click", () => step(1)); // tarayıcıda tıklayınca sonraki tema (uygulamada pencere tıklama almaz)
  addEventListener("resize", resize);

  setInterval(simulate, 1000);
  resize();
  setTheme(params.get("theme") || store.get("theme") || AW.themes[0].id, !native);
  frame(0.05);
  requestAnimationFrame(loop);
  if (document.fonts) document.fonts.ready.then(resize);
  if (native) native.postMessage({ type: "ready", themes: G.wallpaper.listThemes(), theme: state.theme.id });
})(globalThis);
