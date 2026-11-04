/* The page's store: a miniature of Lucas-Check built on model.js. Rendering only; the rules live in the model. */
(function () {
  "use strict";
  var D = window.LucasDom, h = D.h, M = window.LucasModel, SEED = window.LUCAS_SEED;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "lucascheck-state-v1";
  var money = M.formatMoney, fdate = M.formatDate;
  var sfx = function (n) { if (window.Sfx) window.Sfx.play(n); };

  /* ---- state (the store's data and the cart survive a reload when local storage works; the login does not) ---- */
  var store, cart = {}, session = null;
  var view = { tab: "shop", search: "", category: "", cart: "cart", receipt: null, error: "", loginError: "", flash: "", adminMsg: null };
  var logGroups = [];

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
    store = M.create(SEED, saved && saved.state);
    cart = saved && saved.cart && typeof saved.cart === "object" ? saved.cart : {};
    Object.keys(cart).forEach(function (k) { if (!Number.isInteger(cart[k]) || cart[k] < 1) delete cart[k]; });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ state: store.snapshot(), cart: cart })); } catch (e) { /* storage blocked: the page still works */ } }
  function announce(msg) { $("live").textContent = ""; setTimeout(function () { $("live").textContent = msg; }, 30); }
  function clock() { var d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, "0"); }).join(":"); }

  function logSql(title, statements) {
    logGroups.unshift({ title: title, at: clock(), sql: statements });
    logGroups = logGroups.slice(0, 6);
    var ol = $("sqllog");
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    logGroups.forEach(function (g) {
      ol.appendChild(h("li", null,
        h("div", { class: "sql-title" }, h("b", { text: g.title }), h("time", { text: g.at })),
        h("pre", null, h("code", null, D.sqlFragment(g.sql.map(function (q) { return q.indexOf("--") === 0 ? q : q + ";"; }).join("\n"))))));
    });
  }

  /* ---- shop ---- */
  function renderChips() {
    var box = $("chips");
    while (box.firstChild) box.removeChild(box.firstChild);
    [""].concat(store.listCategories()).forEach(function (name) {
      box.appendChild(h("button", {
        type: "button", class: "chip", "aria-pressed": view.category === name ? "true" : "false", text: name || "All",
        onclick: function () { view.category = name; renderChips(); renderProducts(); sfx("tab"); }
      }));
    });
  }
  function stockLabel(p) { return p.stock > 0 ? p.stock + " in stock" : "Out of stock"; }
  function renderProducts() {
    var list = store.listProducts({ search: view.search, category: view.category }), ul = $("products");
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    $("count").textContent = list.length === 0 ? "No products match." : list.length + (list.length === 1 ? " product" : " products") +
      (view.category ? " in " + view.category : "") + (view.search ? " matching “" + view.search + "”" : "");
    list.forEach(function (p) {
      ul.appendChild(h("li", { class: "product" },
        h("div", { class: "pic" }, h("img", { src: "assets/img/" + p.image, alt: p.name, width: 180, height: 180, loading: "lazy" })),
        h("div", { class: "pinfo" },
          h("p", { class: "pcat", text: p.category }),
          h("h3", { class: "pname", text: p.name }),
          h("p", { class: "pstock" + (p.stock > 0 ? "" : " out"), text: stockLabel(p) })),
        h("div", { class: "pbuy" },
          h("span", { class: "price", text: money(p.price) }),
          h("button", {
            type: "button", class: "btn small", "aria-label": "Add " + p.name + " to cart", text: "Add",
            onclick: function (e) { addToCart(p, e.currentTarget); }
          }))));
    });
  }
  function addToCart(p, btn) {
    store.addToCart(cart, p.id);
    save(); renderCart(); sfx("add");
    announce("Added " + p.name + " to your cart. " + store.cartCount(cart) + (store.cartCount(cart) === 1 ? " item." : " items."));
    if (btn) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    $("cart-count").textContent = store.cartCount(cart);
  }

  /* ---- account and cart ---- */
  function renderAccount() {
    var box = $("account");
    while (box.firstChild) box.removeChild(box.firstChild);
    if (!session) {
      box.appendChild(h("p", { class: "who" }, h("b", { text: "Guest" }), " · browsing"));
      box.appendChild(h("button", { type: "button", class: "btn small", text: "Log in", onclick: function () { openLogin(); } }));
    } else {
      box.appendChild(h("p", { class: "who" }, h("b", { text: session.name }), session.admin ? h("span", { class: "badge", text: "admin" }) : null));
      box.appendChild(h("button", { type: "button", class: "btn small", text: "Log out", onclick: logout }));
    }
  }
  function openLogin() { view.cart = "login"; view.loginError = ""; renderCart(true); }
  function logout() {
    session = null; view.cart = "cart"; view.error = "";
    renderAccount(); renderCart(); renderTabs(); sfx("remove"); announce("Logged out.");
  }

  function qtyInput(l) {
    var input = h("input", { type: "number", min: 0, max: M.MAX_QUANTITY, value: l.quantity, "aria-label": "Quantity of " + l.name, inputmode: "numeric" });
    input.addEventListener("change", function () {
      store.setQuantity(cart, l.id, input.value); save(); renderCart();
      announce("Updated " + l.name + ".");
      var again = document.querySelector('#cart-body input[aria-label="Quantity of ' + l.name + '"]'); if (again) again.focus();
    });
    return input;
  }

  function renderCart(focusHeading) {
    var body = $("cart-body");
    while (body.firstChild) body.removeChild(body.firstChild);
    var lines = store.cartLines(cart);
    $("cart-count").textContent = store.cartCount(cart);

    if (view.cart === "login") {
      body.appendChild(loginForm());
    } else if (view.cart === "receipt" && view.receipt) {
      body.appendChild(receipt(view.receipt));
    } else if (lines.length === 0) {
      body.appendChild(h("p", { class: "empty", text: "Your cart is empty. Add something from the shop." }));
    } else {
      var ul = h("ul", { class: "lines" });
      lines.forEach(function (l) {
        ul.appendChild(h("li", { class: "line" },
          h("img", { src: "assets/img/" + l.image, alt: "", width: 44, height: 44 }),
          h("div", { class: "ltxt" }, h("b", { text: l.name }), h("span", { class: "dim", text: money(l.price) + " each" })),
          h("div", { class: "lqty" }, qtyInput(l), h("button", {
            type: "button", class: "link", text: "Remove", "aria-label": "Remove " + l.name,
            onclick: function () { store.removeFromCart(cart, l.id); save(); renderCart(); sfx("remove"); announce("Removed " + l.name + "."); }
          })),
          h("span", { class: "sub", text: money(l.subtotal) })));
      });
      body.appendChild(ul);
      body.appendChild(h("p", { class: "total" }, h("span", { text: "Total" }), h("b", { text: money(store.cartTotal(cart)) })));
      if (view.error) body.appendChild(h("p", { class: "alert", role: "alert", text: view.error }));
      body.appendChild(h("button", { type: "button", id: "place", class: "btn primary wide", text: session ? "Place order" : "Log in to check out", onclick: checkout }));
      body.appendChild(h("p", { class: "note", text: "A demo store: no payment is taken." }));
      var steps = h("ol", { class: "flow", "aria-label": "Checkout steps" },
        h("li", { class: "done" }, "Cart"), h("li", { class: session ? "done" : "" }, "Log in"), h("li", null, "Receipt"));
      body.appendChild(steps);
    }
    if (focusHeading) { var f = body.querySelector("input, .receipt-title, button"); if (f) f.focus(); }
  }

  function loginForm() {
    var user = h("input", { id: "lg-user", name: "username", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true });
    var pass = h("input", { id: "lg-pass", name: "password", type: "password", autocomplete: "current-password", required: true });
    var form = h("form", { class: "login", novalidate: true },
      h("h4", { class: "receipt-title", tabindex: "-1", text: "Log in to check out" }),
      h("label", null, "Username", user), h("label", null, "Password", pass),
      view.loginError ? h("p", { class: "alert", role: "alert", text: view.loginError }) : null,
      h("div", { class: "row" },
        h("button", { type: "submit", class: "btn primary", text: "Log in" }),
        h("button", { type: "button", class: "btn", text: "Cancel", onclick: function () { view.cart = "cart"; renderCart(); } })),
      h("p", { class: "note", text: "Sample accounts (public, on purpose). Tap one to fill it in:" }),
      h("div", { class: "chips" }, SEED.customers.map(function (c) {
        return h("button", {
          type: "button", class: "chip", text: c.user + (c.admin ? " (admin)" : ""),
          onclick: function () { user.value = c.user; pass.value = c.password; pass.focus(); }
        });
      })));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!user.value.trim() || !pass.value) { view.loginError = "Enter your username and password."; renderCart(true); return; }
      var r = store.login(user.value, pass.value);
      logSql("Log in", r.sql.concat(["-- the real app then checks the password with bcrypt.compare()"]));
      if (!r.customer) { view.loginError = "That username and password don't match an account."; sfx("error"); renderCart(true); return; }
      session = r.customer; view.cart = "cart"; view.loginError = "";
      renderAccount(); renderCart(); renderTabs(); sfx("login"); announce("Logged in as " + session.name + ".");
      var p = $("place"); if (p) p.focus();
    });
    return form;
  }

  function checkout() {
    if (!session) { openLogin(); return; }
    try {
      var r = store.placeOrder(session.id, cart);
      logSql("Place order #" + r.id, r.sql);
      cart = {}; view.error = ""; view.receipt = r.id; view.cart = "receipt";
      save(); renderCart(true); renderTabs(); refreshDiagram(); sfx("register");
      announce("Order " + r.id + " placed.");
    } catch (err) {
      if (!(err instanceof M.StoreError)) throw err;
      view.error = err.message; renderCart(); sfx("error");
    }
  }

  function barcode(seed) {
    var x = 0, s = seed * 9301 + 49297, svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 160 34"); svg.setAttribute("class", "barcode"); svg.setAttribute("aria-hidden", "true");
    while (x < 156) {
      s = (s * 9301 + 49297) % 233280;
      var w = 1 + Math.floor((s / 233280) * 3), gapw = 1 + (s % 2);
      var r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", x); r.setAttribute("y", 0); r.setAttribute("width", w); r.setAttribute("height", 34);
      svg.appendChild(r); x += w + gapw;
    }
    return svg;
  }
  function itemsTable(items) {
    return h("table", { class: "items" },
      h("thead", null, h("tr", null, h("th", { scope: "col", text: "Item" }), h("th", { scope: "col", class: "num", text: "Qty" }), h("th", { scope: "col", class: "num", text: "Price" }), h("th", { scope: "col", class: "num", text: "Line" }))),
      h("tbody", null, items.map(function (i) {
        return h("tr", null, h("td", { text: i.productName }), h("td", { class: "num", text: i.quantity }), h("td", { class: "num", text: money(i.price) }), h("td", { class: "num", text: money(i.price * i.quantity) }));
      })));
  }
  function receipt(id) {
    var o = store.listOrders({ orderId: id })[0];
    return h("div", { class: "receipt" },
      h("h4", { class: "receipt-title", tabindex: "-1", text: "Order placed" }),
      h("p", { class: "ref", text: "Reference #" + o.id }),
      h("p", { class: "dim", text: fdate(o.date) + " · " + o.customerName }),
      itemsTable(o.items),
      h("p", { class: "total" }, h("span", { text: "Total" }), h("b", { text: money(o.total) })),
      barcode(o.id),
      h("p", { class: "note", text: "No payment was taken. The order now waits for an administrator to ship it." }),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn", text: "Keep shopping", onclick: function () { view.cart = "cart"; renderCart(); setTab("shop"); } }),
        h("button", { type: "button", class: "btn primary", text: "My orders", onclick: function () { view.cart = "cart"; renderCart(); setTab("orders"); } })));
  }

  /* ---- orders and admin ---- */
  function orderCard(o, admin) {
    var shipped = o.shippedAt;
    return h("article", { class: "order" },
      h("header", null,
        h("h4", { text: "Order #" + o.id }),
        h("span", { class: "status " + (shipped ? "shipped" : "waiting"), text: shipped ? "Shipped " + fdate(shipped) : "Not shipped yet" })),
      h("p", { class: "dim", text: fdate(o.date) + (admin ? " · " + o.customerName : "") }),
      itemsTable(o.items),
      h("footer", null, h("b", { text: "Total " + money(o.total) }),
        admin && !shipped ? h("button", { type: "button", class: "btn small", "aria-label": "Ship order " + o.id, text: "Ship", onclick: function () { ship(o.id); } }) : null));
  }
  function emptyState(text, withLogin) {
    return h("div", { class: "gate" }, h("p", { text: text }), withLogin ? h("button", { type: "button", class: "btn primary", text: "Log in", onclick: function () { openLogin(); } }) : null);
  }
  function renderOrders() {
    var p = $("panel-orders");
    while (p.firstChild) p.removeChild(p.firstChild);
    if (!session) { p.appendChild(emptyState("Log in to see your orders. Orders are only shown to the customer who placed them.", true)); return; }
    var list = store.listOrders({ customerId: session.id });
    p.appendChild(h("h3", { class: "ptitle", text: "Your orders" }));
    if (!list.length) { p.appendChild(h("p", { class: "empty", text: "You haven't placed an order yet." })); return; }
    p.appendChild(h("div", { class: "orders" }, list.map(function (o) { return orderCard(o, false); })));
  }
  function renderAdmin() {
    var p = $("panel-admin");
    while (p.firstChild) p.removeChild(p.firstChild);
    if (!session) { p.appendChild(emptyState("The admin page is for administrators. Log in as arnold (password test) to try it.", true)); return; }
    if (!session.admin) { p.appendChild(emptyState("Only administrators can see this page. You are logged in as " + session.name + "; log in as arnold to use it.", false)); return; }
    var days = store.salesByDay(), all = store.listOrders();
    var revenue = all.reduce(function (s, o) { return s + o.total; }, 0);
    p.appendChild(h("h3", { class: "ptitle", text: "Admin" }));
    p.appendChild(h("div", { class: "stats" },
      h("div", null, h("span", { class: "dim", text: "Revenue" }), h("b", { text: money(revenue) })),
      h("div", null, h("span", { class: "dim", text: "Orders" }), h("b", { text: all.length })),
      h("div", null, h("span", { class: "dim", text: "Shipped" }), h("b", { text: all.filter(function (o) { return o.shippedAt; }).length }))));
    p.appendChild(h("h4", { text: "Sales by day" }));
    p.appendChild(h("table", { class: "items days" },
      h("thead", null, h("tr", null, h("th", { scope: "col", text: "Day" }), h("th", { scope: "col", class: "num", text: "Orders" }), h("th", { scope: "col", class: "num", text: "Total" }))),
      h("tbody", null, days.map(function (d) { return h("tr", null, h("td", { text: d.day }), h("td", { class: "num", text: d.orders }), h("td", { class: "num", text: money(d.total) })); }))));
    p.appendChild(h("h4", { text: "All orders" }));
    p.appendChild(h("p", { class: "note", text: "Try the stock guard: as any customer put 11 Boxing Bags in the cart (the warehouse has 10), place the order, then try to ship it here." }));
    if (view.adminMsg) p.appendChild(h("p", { class: view.adminMsg.error ? "alert" : "okmsg", role: view.adminMsg.error ? "alert" : "status", text: view.adminMsg.text }));
    p.appendChild(h("div", { class: "orders" }, all.map(function (o) { return orderCard(o, true); })));
  }
  function ship(id) {
    try {
      var r = store.shipOrder(id);
      logSql("Ship order #" + id, r.sql);
      view.adminMsg = { text: "Order #" + id + " shipped." }; sfx("ship");
    } catch (err) {
      if (!(err instanceof M.StoreError)) throw err;
      logSql("Ship order #" + id + " (refused)", err.sql || []);
      view.adminMsg = { error: true, text: err.message }; sfx("error");
    }
    save(); renderAdmin(); refreshDiagram();
    announce(view.adminMsg.text);
  }

  /* ---- tabs ---- */
  var TABS = ["shop", "orders", "admin"];
  function renderTabs() {
    TABS.forEach(function (t) {
      var b = $("tab-" + t), on = view.tab === t;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      $("panel-" + t).hidden = !on;
    });
    if (view.tab === "orders") renderOrders();
    if (view.tab === "admin") renderAdmin();
    if (view.tab === "shop") renderProducts();
  }
  function setTab(t, focus) { view.tab = t; view.adminMsg = t === "admin" ? view.adminMsg : null; renderTabs(); sfx("tab"); if (focus) $("tab-" + t).focus(); }
  TABS.forEach(function (t, i) {
    var b = $("tab-" + t);
    b.addEventListener("click", function () { setTab(t); });
    b.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
      if (j >= 0) { e.preventDefault(); setTab(TABS[j], true); }
    });
  });

  function refreshDiagram() { if (window.LucasDiagram) window.LucasDiagram.refresh(); }

  /* ---- reset ---- */
  $("reset-store").addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    store = M.create(SEED); cart = {}; session = null; logGroups = [];
    view = { tab: "shop", search: "", category: "", cart: "cart", receipt: null, error: "", loginError: "", flash: "", adminMsg: null };
    $("search").value = "";
    var ol = $("sqllog"); while (ol.firstChild) ol.removeChild(ol.firstChild);
    ol.appendChild(h("li", { class: "empty", text: "Add something to the cart, log in, place an order." }));
    renderChips(); renderAccount(); renderCart(); renderTabs();
    if (window.LucasDiagram) { window.LucasDiagram.setCounts(function () { return store.rowCounts(); }); window.LucasDiagram.refresh(); }
    sfx("reset"); announce("The store was reset.");
  });

  $("search").addEventListener("input", function (e) { view.search = e.target.value; renderProducts(); });

  /* ---- go ---- */
  load();
  $("cart").querySelector("h3").appendChild(h("span", { class: "badge count", id: "cart-count", text: "0", "aria-label": "items" }));
  renderChips(); renderAccount(); renderCart(); renderTabs();
  if (window.LucasDiagram) { window.LucasDiagram.setCounts(function () { return store.rowCounts(); }); window.LucasDiagram.refresh(); }
  window.LucasStore = { get store() { return store; } };
})();
