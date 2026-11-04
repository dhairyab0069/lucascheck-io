/* The four global symbol controls (Sound, Motion, Effects, Quiet everything) and this page's decorative effects.
   Defaults are ON; Motion starts off only when the system asks for reduced motion. State lives in localStorage under fresh
   versioned keys (<prefix>-sound, -motion, -fx) and the page works with storage blocked.
   Gates other code reads: Ctl.state.{sound,motion,fx}, html[data-motion], html[data-fx], and the `ctlchange` / `ctlunlock`
   events on window. Config comes from window.CTL = { prefix, fx: { glow, tilt, particles } }. */
(function (root) {
  'use strict';
  var cfg = root.CTL || {}, P = cfg.prefix || 'site2', html = document.documentElement;
  var reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function ld(n) { try { return localStorage.getItem(P + '-' + n); } catch (e) { return null; } }
  function sv(n, v) { try { localStorage.setItem(P + '-' + n, v ? 'on' : 'off'); } catch (e) { /* storage blocked: fine */ } }

  function resolveDefaults(s) { return { sound: s.sound !== 'off', motion: reduced ? false : s.motion !== 'off', fx: s.fx !== 'off' }; }
  function quietStep(cur, prev) {
    if (cur.sound || cur.motion || cur.fx) return { next: { sound: false, motion: false, fx: false }, prev: { sound: cur.sound, motion: cur.motion, fx: cur.fx } };
    var p = prev && (prev.sound || prev.motion || prev.fx) ? prev : { sound: true, motion: true, fx: true };
    return { next: { sound: p.sound, motion: reduced ? false : p.motion, fx: p.fx }, prev: null };
  }

  var state = resolveDefaults({ sound: ld('sound'), motion: ld('motion'), fx: ld('fx') }), prev = null, els = {};
  root.Ctl = { get state() { return state; }, reduced: reduced, pure: { resolveDefaults: resolveDefaults, quietStep: quietStep } };
  function gate() { html.setAttribute('data-motion', state.motion ? 'on' : 'off'); html.setAttribute('data-fx', state.fx ? 'on' : 'off'); }
  gate();

  function say(m) { var l = document.getElementById('ctl-live'); if (l) l.textContent = m; }
  function paintBtn(b, on, name, extra) {
    if (!b) return;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', name + (on ? ' on' : ' off'));
    b.title = name + (on ? ' on. Press to turn off.' : ' off. Press to turn on.') + (extra || '');
  }
  function paint() {
    paintBtn(els.sound, state.sound, 'Sound');
    paintBtn(els.motion, state.motion, 'Motion', reduced ? ' Your system asks for reduced motion, so motion stays off.' : '');
    paintBtn(els.fx, state.fx, 'Effects');
    if (els.quiet) els.quiet.setAttribute('aria-pressed', String(!state.sound && !state.motion && !state.fx));
  }
  function apply(next, persist, key) {
    state = { sound: next.sound, motion: next.motion, fx: next.fx };
    gate(); paint();
    if (persist) { sv('sound', state.sound); sv('motion', state.motion); sv('fx', state.fx); }
    try { root.dispatchEvent(new CustomEvent('ctlchange', { detail: { state: state, key: key || null } })); } catch (e) { /* old browser */ }
  }
  function flip(k, label) {
    if (k === 'motion' && reduced) { say('Your system asks for reduced motion, so motion stays off.'); return; }
    var n = { sound: state.sound, motion: state.motion, fx: state.fx }; n[k] = !n[k];
    apply(n, true, k); say(label + (n[k] ? ' on.' : ' off.'));
  }
  function init() {
    ['sound', 'motion', 'fx', 'quiet'].forEach(function (n) { els[n] = document.getElementById('ctl-' + n); });
    if (!document.getElementById('ctl-live')) { var l = document.createElement('div'); l.id = 'ctl-live'; l.className = 'ctl-live'; l.setAttribute('role', 'status'); l.setAttribute('aria-live', 'polite'); document.body.appendChild(l); }
    if (els.sound) els.sound.addEventListener('click', function () { flip('sound', 'Sound'); });
    if (els.motion) els.motion.addEventListener('click', function () { flip('motion', 'Motion'); });
    if (els.fx) els.fx.addEventListener('click', function () { flip('fx', 'Effects'); });
    if (els.quiet) els.quiet.addEventListener('click', function () {
      var r = quietStep(state, prev); prev = r.prev; apply(r.next, true, 'quiet');
      say(r.next.sound || r.next.motion || r.next.fx ? 'Sound, motion and effects are back.' : 'Everything is quiet: sound, motion and effects are off.');
    });
    paint();
    /* browsers only start audio after a gesture: the first pointer, key or touch wakes it */
    var woke = false;
    function unlock() { if (woke) return; woke = true; try { root.dispatchEvent(new CustomEvent('ctlunlock')); } catch (e) { /* ignore */ } }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (n) { root.addEventListener(n, unlock, { capture: true, passive: true }); });
    effects();
  }

  /* ---------- effects: pointer glow, tilt, ambient particles. Effects gates all; Motion also gates what moves on its own ---------- */
  function effects() {
    var fx = cfg.fx || {}, glow = null, cv = null, c2 = null, parts = [], raf = 0, last = 0, W = 0, H = 0, col = '#f2a900', tiltEl = null, pc = fx.particles;
    function token(v, d) { var s = getComputedStyle(html).getPropertyValue(v).trim(); return s || d; }
    if (fx.glow) { glow = document.createElement('div'); glow.className = 'ctl-glow'; glow.setAttribute('aria-hidden', 'true'); document.body.appendChild(glow); }
    if (fx.tilt) tiltEl = document.querySelector(fx.tilt);
    if (pc) { cv = document.createElement('canvas'); cv.className = 'ctl-particles'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); c2 = cv.getContext('2d'); }
    function spawn(anywhere) {
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : (pc.dir === 'fall' ? -8 : H + 8), r: 1 + Math.random() * (pc.size || 2.2), v: 6 + Math.random() * (pc.speed || 14), ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.45 };
    }
    function size() {
      if (!cv) return;
      var d = Math.min(root.devicePixelRatio || 1, 2); W = root.innerWidth; H = root.innerHeight;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d); c2.setTransform(d, 0, 0, d, 0, 0);
      var n = Math.min(36, Math.round((pc.n || 24) * Math.min(1, W / 1200)) + 6);
      while (parts.length < n) parts.push(spawn(true));
      parts.length = n;
    }
    function frame(t) {
      raf = 0;
      if (!(state.motion && state.fx) || document.hidden) { c2.clearRect(0, 0, W, H); return; }
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016), s = pc.dir === 'fall' ? 1 : -1; last = t;
      c2.clearRect(0, 0, W, H); c2.fillStyle = col;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += s * p.v * dt; p.x += Math.sin(t / 1800 + p.ph) * 9 * dt;
        if (p.y < -10 || p.y > H + 10) { parts[i] = p = spawn(false); }
        c2.globalAlpha = p.a; c2.beginPath(); c2.arc(p.x, p.y, p.r, 0, 6.283); c2.fill();
      }
      c2.globalAlpha = 1;
      raf = root.requestAnimationFrame(frame);
    }
    function sync() {
      if (glow && !state.fx) glow.style.opacity = '0';
      if (tiltEl && !(state.fx && state.motion)) tiltEl.style.transform = '';
      if (!cv) return;
      if (state.motion && state.fx && !document.hidden) { if (!raf) { last = performance.now(); raf = root.requestAnimationFrame(frame); } }
      else { if (raf) { root.cancelAnimationFrame(raf); raf = 0; } c2.clearRect(0, 0, W, H); }
    }
    root.addEventListener('pointermove', function (e) {
      if (!state.fx || e.pointerType === 'touch') return;
      if (glow) { glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)'; glow.style.opacity = '1'; }
      if (tiltEl && state.motion) {
        var r = tiltEl.getBoundingClientRect(), nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 400)), ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
        tiltEl.style.transform = 'perspective(700px) rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 9).toFixed(2) + 'deg)';
      }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (glow) glow.style.opacity = '0'; });
    root.addEventListener('ctlchange', sync);
    root.addEventListener('themechange', function () { if (pc) col = token(pc.color, col); });
    root.addEventListener('resize', size);
    document.addEventListener('visibilitychange', sync);
    if (pc) { col = token(pc.color, col); size(); }
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
