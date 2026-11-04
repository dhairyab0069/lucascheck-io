/* theme.js: Light / Dark / Auto, one `theme` key shared by every page on dhairyab0069.github.io.
   The inline script in index.html applies the saved mode before first paint; this wires the three-way
   switch, other tabs (storage event) and the system (auto). A change is a short circle reveal from the
   control (View Transitions) or a colour fade, with a soft cue from the page's sound engine, and is
   instant under prefers-reduced-motion. Everything on this page is CSS-token driven, so nothing needs
   repainting; scripts that cache colours can listen for the `themechange` event on window. */
(function () {
  "use strict";
  var root = document.documentElement, mq = matchMedia("(prefers-color-scheme: dark)");
  var mode = root.getAttribute("data-theme-mode") || "auto";
  function resolve(m) { return m === "auto" ? (mq.matches ? "dark" : "light") : m; }
  function normal(m) { return m === "light" || m === "dark" ? m : "auto"; }
  function reduced() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }

  document.addEventListener("DOMContentLoaded", function () {
    var sw = document.querySelector(".theme-switch");
    if (!sw) return;
    function apply(m) {
      mode = m;
      var t = resolve(m);
      root.setAttribute("data-theme-mode", m); root.setAttribute("data-theme", t); root.style.colorScheme = t;
      [].forEach.call(sw.querySelectorAll("[data-theme-mode]"), function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-theme-mode") === m)); });
      window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: m, theme: t } }));
    }
    function run(commit, origin, target, quiet) {
      if (reduced()) { commit(); return; }
      if (!quiet && window.Sfx) window.Sfx.play("theme", resolve(target) === "dark");
      if (document.startViewTransition && origin) {
        var r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(commit).ready.then(function () {
          root.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + rad + "px at " + x + "px " + y + "px)"] },
            { duration: 550, easing: "ease-out", pseudoElement: "::view-transition-new(root)" });
        }).catch(function () {});
      } else {
        root.classList.add("theme-switching"); commit();
        setTimeout(function () { root.classList.remove("theme-switching"); }, 350);
      }
    }
    function set(m, origin) {
      if (m === mode) return;
      try { localStorage.setItem("theme", m); } catch (e) { /* ignore */ }
      if (resolve(m) === root.getAttribute("data-theme")) apply(m); else run(function () { apply(m); }, origin, m);
    }
    sw.addEventListener("click", function (e) { var b = e.target.closest("[data-theme-mode]"); if (b) set(b.getAttribute("data-theme-mode"), b); });
    sw.addEventListener("keydown", function (e) {
      var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      var all = [].slice.call(sw.querySelectorAll("[data-theme-mode]")), n = all[(all.indexOf(document.activeElement) + k + all.length) % all.length];
      n.focus(); set(n.getAttribute("data-theme-mode"), n); e.preventDefault();
    });
    window.addEventListener("storage", function (e) {
      if (e.key !== "theme" && e.key !== null) return;
      var m = normal(e.newValue);
      if (m !== mode) run(function () { apply(m); }, null, m, true);
    });
    var onMq = function () {
      if (mode === "auto" && resolve("auto") !== root.getAttribute("data-theme")) run(function () { apply("auto"); }, sw.querySelector('[data-theme-mode="auto"]'), "auto");
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
    apply(mode);
  });
})();
