/* The store's rules, in plain JavaScript: the same behaviour as src/lib/store.ts, src/lib/cart.ts and src/app/actions.ts in
   dhairyab0069/LucasCheck, run on the seed data in data.js instead of a Postgres database. No DOM in here, so node can test it.
   Every action also returns the SQL the real store would have run, which the page shows in its query log. */
(function (root) {
  "use strict";
  var MAX_QUANTITY = 99;

  function StoreError(message) { this.name = "StoreError"; this.message = message; }
  StoreError.prototype = Object.create(Error.prototype);

  var currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  function formatMoney(v) { return currency.format(Number(v)); }
  function formatDate(v) { return dateFmt.format(new Date(v)); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sql(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function lit(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

  function fresh(seed) {
    var stock = {};
    seed.products.forEach(function (p) { stock[p.id] = p.stock; });
    return {
      stock: stock,
      shipments: {},
      nextOrderId: seed.orders.length + 1,
      orders: seed.orders.map(function (o) {
        var total = o.items.reduce(function (s, i) { return s + i.quantity * i.price; }, 0);
        return { id: o.id, customer: o.customer, date: o.date, total: round2(total), items: clone(o.items) };
      })
    };
  }

  function create(seed, saved) {
    var st = saved && saved.stock && saved.orders ? clone(saved) : fresh(seed);
    var byId = {};
    seed.products.forEach(function (p) { byId[p.id] = p; });
    var catName = {};
    seed.categories.forEach(function (c) { catName[c.id] = c.name; });

    function product(id) {
      var p = byId[id];
      if (!p) return null;
      return { id: p.id, name: p.name, price: p.price, category: catName[p.category], image: p.image, stock: st.stock[p.id] };
    }
    function byName(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; }

    /* ---- reading ---- */
    function listProducts(opts) {
      opts = opts || {};
      var term = (opts.search || "").trim().toLowerCase();
      return seed.products.filter(function (p) {
        return (!term || p.name.toLowerCase().indexOf(term) !== -1) && (!opts.category || catName[p.category] === opts.category);
      }).map(function (p) { return product(p.id); }).sort(byName);
    }
    function listCategories() { return seed.categories.map(function (c) { return c.name; }).sort(); }

    function customer(id) {
      for (var i = 0; i < seed.customers.length; i++) if (seed.customers[i].id === id) return seed.customers[i];
      return null;
    }
    function orderView(o) {
      var c = customer(o.customer);
      return {
        id: o.id, date: o.date, total: o.total, customerId: o.customer, customerName: c.first + " " + c.last,
        shippedAt: st.shipments[o.id] || null,
        items: o.items.map(function (i) { return { productId: i.product, productName: byId[i.product].name, quantity: i.quantity, price: i.price }; }).sort(function (a, b) { return a.productName < b.productName ? -1 : 1; })
      };
    }
    function listOrders(opts) {
      opts = opts || {};
      return st.orders.filter(function (o) {
        return (opts.customerId === undefined || o.customer === opts.customerId) && (opts.orderId === undefined || o.id === opts.orderId);
      }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; }).map(orderView);
    }
    function salesByDay() {
      var days = {};
      st.orders.forEach(function (o) {
        var d = o.date.slice(0, 10);
        days[d] = days[d] || { day: d, orders: 0, total: 0 };
        days[d].orders++; days[d].total = round2(days[d].total + o.total);
      });
      return Object.keys(days).sort().reverse().map(function (d) { return days[d]; });
    }

    /* ---- the cart: { productId: quantity }, capped at 99 like the cookie cart ---- */
    function addToCart(cart, id) {
      if (!byId[id]) return cart;
      cart[id] = Math.min((cart[id] || 0) + 1, MAX_QUANTITY);
      return cart;
    }
    function setQuantity(cart, id, quantity) {
      var q = Number(quantity);
      if (!Number.isInteger(q) || q <= 0) delete cart[id]; else cart[id] = Math.min(q, MAX_QUANTITY);
      return cart;
    }
    function removeFromCart(cart, id) { delete cart[id]; return cart; }
    function cartCount(cart) { return Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0); }
    function cartLines(cart) {
      return Object.keys(cart).filter(function (k) { return byId[k]; }).map(function (k) {
        var p = product(Number(k));
        p.quantity = cart[k]; p.subtotal = round2(p.price * cart[k]);
        return p;
      }).sort(byName);
    }
    function cartTotal(cart) { return round2(cartLines(cart).reduce(function (s, l) { return s + l.subtotal; }, 0)); }

    /* ---- accounts ---- */
    function login(userId, password) {
      var u = String(userId || "").trim().toLowerCase();
      var found = null;
      seed.customers.forEach(function (c) { if (c.user.toLowerCase() === u && c.password === password) found = c; });
      var log = [sql("SELECT customer_id AS id, user_id AS \"userId\", first_name || ' ' || last_name AS name, password_hash AS \"passwordHash\", is_admin AS \"isAdmin\" FROM customer WHERE lower(user_id) = lower(" + lit(userId) + ")")];
      if (!found) return { customer: null, sql: log };
      return { customer: { id: found.id, user: found.user, name: found.first + " " + found.last, admin: found.admin }, sql: log };
    }

    /* ---- placing an order: one transaction, prices read from the database (actions.ts checkout, store.ts placeOrder) ---- */
    function placeOrder(customerId, cart) {
      var lines = cartLines(cart);
      if (lines.length === 0) throw new StoreError("Your cart is empty.");
      var id = st.nextOrderId++;
      var total = round2(lines.reduce(function (s, l) { return s + l.price * l.quantity; }, 0));
      var ids = lines.map(function (l) { return l.id; });
      var log = [
        "BEGIN",
        sql("SELECT product_id AS id, price::float8 AS price FROM product WHERE product_id = ANY('{" + ids.join(",") + "}'::int[])"),
        sql("INSERT INTO order_summary (customer_id, total_amount) VALUES (" + customerId + ", '" + total.toFixed(2) + "') RETURNING order_id AS id"),
      ];
      var order = { id: id, customer: customerId, date: new Date().toISOString(), total: total, items: [] };
      lines.forEach(function (l) {
        order.items.push({ product: l.id, quantity: l.quantity, price: l.price });
        log.push(sql("INSERT INTO order_product (order_id, product_id, quantity, price) VALUES (" + id + ", " + l.id + ", " + l.quantity + ", " + l.price + ")"));
      });
      log.push("COMMIT");
      st.orders.push(order);
      return { id: id, total: total, sql: log };
    }

    /* ---- shipping: check every item has stock, take it out, record the shipment, all or nothing (store.ts shipOrder) ---- */
    function shipOrder(orderId) {
      var log = ["BEGIN", sql("SELECT 1 FROM shipment WHERE order_id = " + orderId)];
      function fail(message) {
        log.push("ROLLBACK");
        var e = new StoreError(message); e.sql = log; throw e;
      }
      if (st.shipments[orderId]) fail("Order #" + orderId + " has already shipped.");
      var order = null;
      st.orders.forEach(function (o) { if (o.id === orderId) order = o; });
      log.push(sql("SELECT op.product_id AS \"productId\", p.product_name AS name, op.quantity, i.quantity AS stock FROM order_product op JOIN product p ON p.product_id = op.product_id LEFT JOIN product_inventory i ON i.product_id = op.product_id AND i.warehouse_id = 1 WHERE op.order_id = " + orderId));
      if (!order || order.items.length === 0) fail("Order #" + orderId + " has no items.");
      var short = order.items.filter(function (i) { return (st.stock[i.product] || 0) < i.quantity; });
      if (short.length) {
        fail("Not enough stock to ship order #" + orderId + ": " + short.map(function (i) {
          return byId[i.product].name + " (need " + i.quantity + ", have " + (st.stock[i.product] || 0) + ")";
        }).join(", "));
      }
      order.items.forEach(function (i) {
        st.stock[i.product] -= i.quantity;
        log.push(sql("UPDATE product_inventory SET quantity = quantity - " + i.quantity + " WHERE product_id = " + i.product + " AND warehouse_id = 1 AND quantity >= " + i.quantity + " RETURNING quantity"));
      });
      st.shipments[orderId] = new Date().toISOString();
      log.push(sql("INSERT INTO shipment (order_id, warehouse_id) VALUES (" + orderId + ", 1)"), "COMMIT");
      return { sql: log };
    }

    /* row counts for the diagram's table headers */
    function rowCounts() {
      var lines = 0;
      st.orders.forEach(function (o) { lines += o.items.length; });
      return {
        customer: seed.customers.length, category: seed.categories.length, product: seed.products.length, warehouse: 1,
        product_inventory: seed.products.length, order_summary: st.orders.length, order_product: lines,
        shipment: Object.keys(st.shipments).length
      };
    }

    return {
      MAX_QUANTITY: MAX_QUANTITY, listProducts: listProducts, listCategories: listCategories, getProduct: product,
      listOrders: listOrders, salesByDay: salesByDay, addToCart: addToCart, setQuantity: setQuantity,
      removeFromCart: removeFromCart, cartCount: cartCount, cartLines: cartLines, cartTotal: cartTotal,
      login: login, placeOrder: placeOrder, shipOrder: shipOrder, rowCounts: rowCounts,
      snapshot: function () { return clone(st); }
    };
  }

  var api = { create: create, StoreError: StoreError, formatMoney: formatMoney, formatDate: formatDate, MAX_QUANTITY: MAX_QUANTITY };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LucasModel = api;
})(typeof window !== "undefined" ? window : globalThis);
