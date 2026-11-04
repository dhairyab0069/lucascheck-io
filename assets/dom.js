/* Two small helpers shared by the other scripts: h() builds elements (text only, never HTML strings, so nothing typed or stored
   can inject markup) and sqlFragment() colours SQL keywords. */
window.LucasDom = (function () {
  "use strict";
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === false || v == null) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  var KW = /\b(SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|AS|INSERT|INTO|VALUES|UPDATE|SET|RETURNING|ORDER|BY|BEGIN|COMMIT|ROLLBACK|COALESCE|ANY|CREATE|TABLE|PRIMARY|KEY|UNIQUE|REFERENCES|NOT|NULL)\b/g;
  function sqlFragment(text) {
    var frag = document.createDocumentFragment(), last = 0, m;
    KW.lastIndex = 0;
    while ((m = KW.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(h("span", { class: "kw", text: m[0] }));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
  return { h: h, sqlFragment: sqlFragment, reducedMotion: function () { return document.documentElement.getAttribute("data-motion") === "off" || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } };
})();
