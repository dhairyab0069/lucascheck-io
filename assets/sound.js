/* Store sounds, on by default and gated by the Sound symbol (controls.js, Ctl.state.sound). Everything is synthesized with the Web Audio API (a few sine and
   triangle partials plus filtered noise), so there are no audio files and no requests. Other scripts call Sfx.play("name").
   Nothing plays while the tab is hidden. The choice is remembered in localStorage when that is available. */
(function () {
  "use strict";
  var MAX = 60;
  var ctx = null, master = null, noise = null, voices = 0, last = {};

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.28;
      master.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function ready() { return window.Ctl && window.Ctl.state.sound && ctx && ctx.state === "running" && !document.hidden; }
  function gap(k, ms) { var n = performance.now(); if (n - (last[k] || 0) < ms) return true; last[k] = n; return false; }

  /* a note: o = {f, to, type, gain, dur, at, attack} */
  function tone(o) {
    if (voices >= MAX) return;
    var t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.1, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    voices++; osc.onended = function () { voices--; };
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  /* filtered noise: o = {type, f, to, q, gain, dur, at, attack} */
  function hiss(o) {
    if (voices >= MAX) return;
    var t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.1, src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    fl.type = o.type || "bandpass"; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(master);
    voices++; src.onended = function () { voices--; };
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  /* a little bell: two inharmonic partials that ring and die */
  function bell(at, f, gain) {
    tone({ at: at, f: f, dur: 0.5, gain: gain, attack: 0.002 });
    tone({ at: at, f: f * 2.76, dur: 0.22, gain: gain * 0.4, attack: 0.002 });
  }

  var sounds = {
    /* the barcode scanner's beep when something goes in the cart */
    add: function () { if (gap("add", 60)) return; tone({ f: 1560, dur: 0.07, type: "square", gain: 0.03 }); tone({ at: 0.07, f: 2080, dur: 0.09, type: "square", gain: 0.03 }); },
    remove: function () { tone({ f: 520, to: 300, dur: 0.12, type: "triangle", gain: 0.05 }); },
    tab: function () { if (gap("tab", 50)) return; hiss({ f: 3200, q: 2, dur: 0.035, gain: 0.03 }); },
    login: function () { tone({ f: 660, dur: 0.1, type: "triangle", gain: 0.05 }); tone({ at: 0.09, f: 990, dur: 0.16, type: "triangle", gain: 0.05 }); },
    error: function () { tone({ f: 170, dur: 0.22, type: "sawtooth", gain: 0.04 }); tone({ at: 0.12, f: 140, dur: 0.24, type: "sawtooth", gain: 0.04 }); },
    /* the till: drawer thunk, a rip of paper, then the bell */
    register: function () {
      tone({ f: 120, to: 55, dur: 0.16, gain: 0.12, attack: 0.002 });
      hiss({ at: 0.08, type: "highpass", f: 1800, dur: 0.32, gain: 0.04 });
      bell(0.34, 1318, 0.07); bell(0.44, 1760, 0.06);
    },
    /* a box dropped on the loading dock and taped shut */
    ship: function () {
      tone({ f: 95, to: 50, dur: 0.2, gain: 0.14, attack: 0.002 });
      hiss({ at: 0.1, type: "bandpass", f: 900, to: 2600, q: 1.5, dur: 0.38, gain: 0.05 });
    },
    step: function () { if (gap("step", 80)) return; tone({ f: 740, dur: 0.12, type: "sine", gain: 0.05 }); },
    theme: function (dark) { [0, 7, 12].forEach(function (n, i) { var k = dark ? 12 - n : n; tone({ at: i * 0.06, f: 523.25 * Math.pow(2, k / 12), dur: 0.18, type: "triangle", gain: 0.04 }); }); },
    reset: function () { tone({ f: 440, to: 220, dur: 0.15, type: "triangle", gain: 0.04 }); }
  };

  window.Sfx = {
    play: function (name, arg) { if (!ready() || !sounds[name]) return; try { sounds[name](arg); } catch (e) { /* audio is optional */ } },
    isOn: function () { return !!(window.Ctl && window.Ctl.state.sound); }
  };
  /* browsers only let audio start after a gesture: the first pointer, key or touch wakes it */
  function wake() { if (window.Ctl && window.Ctl.state.sound && ensure() && ctx.state === "suspended") ctx.resume(); }
  window.addEventListener("ctlunlock", wake);
  window.addEventListener("ctlchange", function (e) {
    var k = e.detail.key;
    if ((k === "sound" || k === "quiet") && window.Ctl.state.sound) { wake(); setTimeout(function () { window.Sfx.play(k === "sound" ? "login" : "step"); }, 120); }
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });
})();
