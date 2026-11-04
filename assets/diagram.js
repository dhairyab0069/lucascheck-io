/* The database diagram: draws window.LUCAS_SCHEMA as SVG, lights up tables and foreign keys step by step for a walkthrough,
   sends a dot along each active relation, and shows the SQL. Reduced motion: no flowing lines or dot, no auto-play. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg", W = 210, HEAD = 28, ROW = 18;
  var D = window.LucasDom, S = window.LUCAS_SCHEMA;
  var svg = document.getElementById("dg");
  if (!svg || !S) return;

  var era = "now", sceneId = null, stepIdx = -1, selected = null, timer = null, counts = function () { return {}; };
  var lastCounts = {}, dotLayer = null, raf = 0, activePaths = [];
  var reduce = D.reducedMotion();

  var $ = function (id) { return document.getElementById(id); };
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function set() { return S[era]; }
  function tableById(id) { var r = null; set().tables.forEach(function (t) { if (t.id === id) r = t; }); return r; }
  function height(t) { return HEAD + t.cols.length * ROW; }
  function anchor(ref) {
    var t = tableById(ref[0]), idx = 0;
    t.cols.forEach(function (c, i) { if (c[0] === ref[1]) idx = i; });
    var rowY = t.y + HEAD + idx * ROW + ROW / 2, side = ref[2], off = ref[3] || 40;
    if (side === "l") return { x: t.x, y: rowY, side: side };
    if (side === "r") return { x: t.x + W, y: rowY, side: side };
    if (side === "t") return { x: t.x + off, y: t.y, side: side };
    return { x: t.x + off, y: t.y + height(t), side: side };
  }
  function route(r) {
    var a = anchor(r.a), b = anchor(r.b), pts;
    if ("lr".indexOf(a.side) !== -1) pts = [a, { x: r.mx, y: a.y }, { x: r.mx, y: b.y }, b];
    else pts = [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
    return { a: a, b: b, d: "M" + pts.map(function (p) { return p.x + " " + p.y; }).join(" L") };
  }
  function labelPos(p) {
    if (p.side === "l") return { x: p.x - 8, y: p.y - 5, anchor: "end" };
    if (p.side === "r") return { x: p.x + 8, y: p.y - 5, anchor: "start" };
    if (p.side === "t") return { x: p.x + 7, y: p.y - 6, anchor: "start" };
    return { x: p.x + 7, y: p.y + 14, anchor: "start" };
  }

  /* ---- drawing ---- */
  function draw() {
    var s = set(), c = counts();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + s.width + " " + s.height);
    svg.setAttribute("width", s.width); svg.setAttribute("height", s.height);
    var relG = el("g", { "class": "rels" }, svg), tabG = el("g", { "class": "tables" }, svg);
    s.rels.forEach(function (r) {
      var rt = route(r), g = el("g", { "class": "rel", "data-id": r.id }, relG);
      el("path", { d: rt.d, "class": "rel-line" }, g);
      el("circle", { cx: rt.a.x, cy: rt.a.y, r: 3.5, "class": "rel-dot" }, g);
      [[rt.a, r.ends[0]], [rt.b, r.ends[1]]].forEach(function (e) {
        var p = labelPos(e[0]);
        el("text", { x: p.x, y: p.y, "text-anchor": p.anchor, "class": "rel-end" }, g).textContent = e[1];
      });
    });
    s.tables.forEach(function (t) {
      var h = height(t);
      var g = el("g", {
        "class": "tbl" + (t.gone ? " gone" : t.changed ? " changed" : ""), "data-id": t.id, tabindex: "0", role: "button",
        "aria-pressed": "false", transform: "translate(" + t.x + " " + t.y + ")",
        "aria-label": t.id + " table, " + t.cols.length + " columns" + (t.gone ? ", not in the rebuild" : t.changed ? ", changed in the rebuild" : "") + ". Select to see how it connects."
      }, tabG);
      el("rect", { width: W, height: h, rx: 6, "class": "tbl-box" }, g);
      el("path", { d: "M0 6a6 6 0 0 1 6-6h" + (W - 12) + "a6 6 0 0 1 6 6v" + (HEAD - 6) + "H0z", "class": "tbl-head" }, g);
      el("text", { x: 10, y: 19, "class": "tbl-name" }, g).textContent = t.id;
      if (era === "now") el("text", { x: W - 10, y: 19, "text-anchor": "end", "class": "tbl-rows", "data-rows": t.id }, g).textContent = (c[t.id] != null ? c[t.id] : "") + " rows";
      else if (t.gone || t.changed) el("text", { x: W - 10, y: 19, "text-anchor": "end", "class": "tbl-rows" }, g).textContent = t.gone ? "dropped" : "changed";
      t.cols.forEach(function (col, i) {
        var y = HEAD + i * ROW;
        if (i) el("line", { x1: 0, x2: W, y1: y, y2: y, "class": "tbl-sep" }, g);
        var flags = col[2] || "";
        el("text", { x: 22, y: y + 13, "class": "col-name" + (flags.indexOf("pk") !== -1 ? " is-pk" : "") }, g).textContent = col[0];
        el("text", { x: W - 8, y: y + 13, "text-anchor": "end", "class": "col-type" }, g).textContent = col[1];
        if (flags.indexOf("pk") !== -1) el("rect", { x: 8, y: y + 5, width: 8, height: 8, rx: 2, "class": "k pk" }, g);
        else if (flags.indexOf("fk") !== -1) el("rect", { x: 8, y: y + 5, width: 8, height: 8, rx: 4, "class": "k fk" }, g);
        else if (flags.indexOf("uq") !== -1) el("rect", { x: 8, y: y + 5, width: 8, height: 8, "class": "k uq", transform: "rotate(45 12 " + (y + 9) + ")" }, g);
        if (flags.indexOf("pk") !== -1 && flags.indexOf("fk") !== -1) el("circle", { cx: 12, cy: y + 9, r: 1.8, "class": "k-hole" }, g);
      });
    });
    dotLayer = el("g", { "class": "travellers" }, svg);
    lastCounts = c;
    paint();
  }

  /* ---- highlighting ---- */
  function currentStep() {
    if (!sceneId || stepIdx < 0) return null;
    var sc = S.scenes.filter(function (x) { return x.id === sceneId; })[0];
    return sc ? sc.steps[stepIdx] : null;
  }
  function neighbours(id) {
    var rels = [], tabs = {};
    tabs[id] = true;
    set().rels.forEach(function (r) {
      if (r.a[0] === id || r.b[0] === id) { rels.push(r.id); tabs[r.a[0]] = true; tabs[r.b[0]] = true; }
    });
    return { rels: rels, tables: Object.keys(tabs) };
  }
  function paint() {
    var step = currentStep(), tabs = [], rels = [];
    if (step) { tabs = step.tables; rels = step.rels; }
    else if (selected) { var n = neighbours(selected); tabs = n.tables; rels = n.rels; }
    var any = tabs.length > 0;
    svg.classList.toggle("has-focus", any);
    Array.prototype.forEach.call(svg.querySelectorAll(".tbl"), function (g) {
      var id = g.getAttribute("data-id");
      g.classList.toggle("on", tabs.indexOf(id) !== -1);
      g.classList.toggle("sel", id === selected);
      g.setAttribute("aria-pressed", id === selected ? "true" : "false");
    });
    activePaths = [];
    Array.prototype.forEach.call(svg.querySelectorAll(".rel"), function (g) {
      var on = rels.indexOf(g.getAttribute("data-id")) !== -1;
      g.classList.toggle("on", on);
      if (on) activePaths.push(g.querySelector(".rel-line"));
    });
    startDot();
    renderText(step);
  }
  function startDot() {
    cancelAnimationFrame(raf);
    if (!dotLayer) return;
    while (dotLayer.firstChild) dotLayer.removeChild(dotLayer.firstChild);
    if (reduce || !activePaths.length) return;
    var dots = activePaths.map(function () { return el("circle", { r: 5, "class": "traveller" }, dotLayer); });
    var t0 = performance.now();
    (function tick(now) {
      var phase = ((now - t0) % 1600) / 1600;
      activePaths.forEach(function (p, i) {
        var len = p.getTotalLength(), pt = p.getPointAtLength(len * (1 - phase));   // from the foreign key to the key it points at
        dots[i].setAttribute("cx", pt.x); dots[i].setAttribute("cy", pt.y);
      });
      raf = requestAnimationFrame(tick);
    })(t0);
  }

  function ddl(t) {
    var s = set(), pks = t.cols.filter(function (c) { return (c[2] || "").indexOf("pk") !== -1; }).map(function (c) { return c[0]; });
    var lines = t.cols.map(function (c) {
      var f = c[2] || "", line = "  " + c[0] + " " + c[1];
      if (pks.length === 1 && f.indexOf("pk") !== -1) line += " PRIMARY KEY";
      if (f.indexOf("uq") !== -1) line += " UNIQUE";
      s.rels.forEach(function (r) { if (r.a[0] === t.id && r.a[1] === c[0]) line += " REFERENCES " + r.b[0] + "(" + r.b[1] + ")"; });
      return line;
    });
    if (pks.length > 1) lines.push("  PRIMARY KEY (" + pks.join(", ") + ")");
    return "-- columns and keys as drawn here (constraints summarized)\nCREATE TABLE " + t.id + " (\n" + lines.join(",\n") + "\n);";
  }
  function renderText(step) {
    var txt = $("dg-text"), sql = $("dg-sql"), no = $("dg-stepno");
    var code = sql.querySelector("code");
    while (code.firstChild) code.removeChild(code.firstChild);
    if (step) {
      var sc = S.scenes.filter(function (x) { return x.id === sceneId; })[0];
      no.textContent = sc.label + " · step " + (stepIdx + 1) + " of " + sc.steps.length;
      txt.textContent = step.text;
      code.appendChild(D.sqlFragment(step.sql));
    } else if (selected) {
      var t = tableById(selected), rs = set().rels.filter(function (r) { return r.a[0] === selected || r.b[0] === selected; });
      no.textContent = "Table " + t.id;
      txt.textContent = (t.gone ? "Not in the rebuild: " + t.gone + ". " : t.changed ? "Changed in the rebuild: " + t.changed + ". " : "") +
        (rs.length ? rs.map(function (r) { return r.note; }).join(" ") : "It has no foreign keys.");
      code.appendChild(D.sqlFragment(ddl(t)));
    } else {
      no.textContent = era === "then" ? "The course project's schema" : "";
      if (era === "then") {
        var gone = set().tables.filter(function (x) { return x.gone; }).map(function (x) { return x.id; });
        var chg = set().tables.filter(function (x) { return x.changed; }).map(function (x) { return x.id; });
        txt.textContent = "From docs/legacy-orderdb-sqlserver.ddl, 11 tables. Dropped in the rebuild: " + gone.join(", ") + ". Changed: " + chg.join(", ") + ". Select a table for details.";
      } else txt.textContent = "Select a table, or pick a walkthrough and press Play.";
      code.appendChild(document.createTextNode("-- the statement for each step appears here"));
    }
    var sceneOn = era === "now";
    ["dg-back", "dg-play", "dg-next", "dg-clear"].forEach(function (id) { $(id).disabled = !sceneOn; });
    $("dg-play").textContent = timer ? "Pause" : "Play";
    $("dg-back").disabled = !sceneOn || stepIdx <= 0;
  }

  /* ---- controls ---- */
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function go(i) {
    var sc = S.scenes.filter(function (x) { return x.id === sceneId; })[0];
    if (!sc) return;
    stepIdx = Math.max(0, Math.min(sc.steps.length - 1, i));
    selected = null;
    paint();
    if (window.Sfx) window.Sfx.play("step");
  }
  function pickScene(id) {
    stop(); sceneId = id; selected = null;
    Array.prototype.forEach.call($("scenes").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-scene") === id ? "true" : "false"); });
    go(0);
  }
  function clear() {
    stop(); sceneId = null; stepIdx = -1; selected = null;
    Array.prototype.forEach.call($("scenes").children, function (b) { b.setAttribute("aria-pressed", "false"); });
    paint();
  }
  function select(id) {
    stop(); sceneId = null; stepIdx = -1;
    Array.prototype.forEach.call($("scenes").children, function (b) { b.setAttribute("aria-pressed", "false"); });
    selected = selected === id ? null : id;
    paint();
    if (window.Sfx) window.Sfx.play("tab");
  }
  function next() {
    if (!sceneId) pickScene("order");
    else {
      var sc = S.scenes.filter(function (x) { return x.id === sceneId; })[0];
      go(stepIdx >= sc.steps.length - 1 ? 0 : stepIdx + 1);
    }
  }
  function play() {
    if (timer) { stop(); renderText(currentStep()); return; }
    if (!sceneId) pickScene("order"); else go(0);
    var sc = S.scenes.filter(function (x) { return x.id === sceneId; })[0];
    timer = setInterval(function () {
      if (stepIdx >= sc.steps.length - 1) { stop(); renderText(currentStep()); return; }
      go(stepIdx + 1);
    }, 3200);
    renderText(currentStep());
  }
  function setEra(e) {
    stop(); era = e; sceneId = null; stepIdx = -1; selected = null;
    Array.prototype.forEach.call(document.querySelectorAll("[data-era]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-era") === e ? "true" : "false"); });
    Array.prototype.forEach.call($("scenes").children, function (b) { b.setAttribute("aria-pressed", "false"); b.disabled = e !== "now"; });
    draw();
    if (window.Sfx) window.Sfx.play("tab");
  }

  S.scenes.forEach(function (sc) {
    $("scenes").appendChild(D.h("button", { type: "button", "data-scene": sc.id, "aria-pressed": "false", text: sc.label, onclick: function () { pickScene(sc.id); } }));
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-era]"), function (b) { b.addEventListener("click", function () { setEra(b.getAttribute("data-era")); }); });
  $("dg-back").addEventListener("click", function () { stop(); go(stepIdx - 1); });
  $("dg-next").addEventListener("click", function () { stop(); next(); });
  $("dg-play").addEventListener("click", play);
  $("dg-clear").addEventListener("click", clear);
  if (reduce) { $("dg-play").hidden = true; }
  svg.addEventListener("click", function (e) {
    var g = e.target.closest ? e.target.closest(".tbl") : null;
    if (g) select(g.getAttribute("data-id")); else if (selected) { selected = null; paint(); }
  });
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var g = e.target.closest ? e.target.closest(".tbl") : null;
    if (g) { e.preventDefault(); select(g.getAttribute("data-id")); }
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden) cancelAnimationFrame(raf); else startDot(); });

  window.LucasDiagram = {
    setCounts: function (fn) { counts = fn; },
    /* called after the store changes: update the row counts in place and flash the ones that moved */
    refresh: function () {
      if (era !== "now") return;
      var c = counts();
      Array.prototype.forEach.call(svg.querySelectorAll("[data-rows]"), function (t) {
        var id = t.getAttribute("data-rows");
        t.textContent = c[id] + " rows";
        if (lastCounts[id] !== undefined && c[id] !== lastCounts[id]) { t.classList.remove("bump"); void t.getBoundingClientRect(); t.classList.add("bump"); }
      });
      lastCounts = c;
    },
    highlight: function (sceneName) { /* used by the store: jump the diagram to a walkthrough */ if (S.scenes.some(function (s) { return s.id === sceneName; })) { if (era !== "now") setEra("now"); pickScene(sceneName); } }
  };
  draw();
})();
