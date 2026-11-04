// Checks the page's data, the store model and the HTML: node tests/data.test.js
// If a clone of LucasCheck sits next to this repo (../LucasCheck), the seed data is also compared with its src/lib/schema.ts.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read("assets/data.js"), ctx);
vm.runInContext(read("assets/schema.js"), ctx);
// round-trip through JSON so the objects belong to this realm (deepStrictEqual compares prototypes)
const SEED = JSON.parse(JSON.stringify(ctx.window.LUCAS_SEED)), SCHEMA = JSON.parse(JSON.stringify(ctx.window.LUCAS_SCHEMA));
const M = require("../assets/model.js");
const html = read("index.html");
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("ok", n, name); };

ok("seed has 25 products, 6 categories, 5 customers, 5 orders", () => {
  assert.equal(SEED.products.length, 25); assert.equal(SEED.categories.length, 6);
  assert.equal(SEED.customers.length, 5); assert.equal(SEED.orders.length, 5);
  assert.equal(SEED.customers.filter((c) => c.admin).length, 1);
});
ok("every product has a category, a price, stock and a photo that exists", () => {
  for (const p of SEED.products) {
    assert.ok(SEED.categories.some((c) => c.id === p.category), p.name);
    assert.ok(p.price >= 0 && p.stock >= 0, p.name);
    assert.ok(fs.existsSync(path.join(root, "assets/img", p.image)), p.image);
  }
});
ok("every seed order line points at a real product and customer", () => {
  for (const o of SEED.orders) {
    assert.ok(SEED.customers.some((c) => c.id === o.customer));
    for (const i of o.items) assert.ok(SEED.products.some((p) => p.id === i.product), `order ${o.id}`);
  }
});
ok("seed matches LucasCheck's schema.ts when it is available", () => {
  const f = path.join(root, "..", "LucasCheck", "src", "lib", "schema.ts");
  if (!fs.existsSync(f)) return console.log("   (skipped: ../LucasCheck not found)");
  const src = fs.readFileSync(f, "utf8");
  const rows = [...src.matchAll(/^\s*\["([^"]+)", (\d+), (\d), "([^"]+)", (\d+)\],/gm)];
  assert.equal(rows.length, SEED.products.length);
  rows.forEach((m, i) => {
    const p = SEED.products[i];
    assert.deepEqual([p.name, p.price, p.category, p.stock], [m[1], +m[2], +m[3], +m[5]]);
  });
});

ok("diagram: every relation names real tables and columns", () => {
  for (const era of ["now", "then"]) {
    const ids = SCHEMA[era].tables.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const r of SCHEMA[era].rels) for (const [t, c] of [r.a, r.b]) {
      const tb = SCHEMA[era].tables.find((x) => x.id === t);
      assert.ok(tb, `${r.id}: table ${t}`);
      assert.ok(tb.cols.some((x) => x[0] === c), `${r.id}: ${t}.${c}`);
    }
  }
  assert.equal(SCHEMA.now.tables.length, 8); assert.equal(SCHEMA.then.tables.length, 11);
});
ok("diagram: walkthroughs only use tables and relations that exist", () => {
  for (const sc of SCHEMA.scenes) for (const s of sc.steps) {
    for (const t of s.tables) assert.ok(SCHEMA.now.tables.some((x) => x.id === t), t);
    for (const r of s.rels) assert.ok(SCHEMA.now.rels.some((x) => x.id === r), r);
    assert.ok(s.sql && s.text);
  }
});

const fresh = () => M.create(SEED);
ok("model: search, category filter and sort", () => {
  const s = fresh();
  assert.deepEqual(s.listProducts({ search: "SHORTS" }).map((p) => p.name), ["Gym Shorts", "Kids Shorts", "Swimming Shorts"]);
  assert.deepEqual(s.listProducts({ category: "Supplements" }).map((p) => p.name), ["BCAA", "Multivitamins", "Pre-workout", "Protein Bar"]);
  assert.equal(s.listProducts({}).length, 25);
  assert.deepEqual(s.listProducts({ category: "Soft Goods" }), []);
});
ok("model: cart caps at 99, ignores unknown ids, removes at zero", () => {
  const s = fresh(), cart = {};
  for (let i = 0; i < 120; i++) s.addToCart(cart, 2);
  assert.equal(cart[2], 99);
  s.addToCart(cart, 9999); assert.equal(Object.keys(cart).length, 1);
  s.setQuantity(cart, 2, 500); assert.equal(cart[2], 99);
  s.setQuantity(cart, 2, 0); assert.equal(cart[2], undefined);
  s.setQuantity(cart, 9, 2); s.setQuantity(cart, 2, 3);
  assert.equal(s.cartTotal(cart), 12 + 105);
});
ok("model: login is case-insensitive on the username, exact on the password", () => {
  const s = fresh();
  assert.equal(s.login("ARNOLD", "test").customer.admin, true);
  assert.equal(s.login("arnold", "wrong").customer, null);
  assert.equal(s.login("nobody", "x").customer, null);
});
ok("model: placing an order prices from the product table and logs the transaction", () => {
  const s = fresh(), cart = { 2: 2, 15: 4 };
  const r = s.placeOrder(2, cart);
  assert.equal(r.id, 6); assert.equal(r.total, 78);
  assert.equal(r.sql[0], "BEGIN"); assert.equal(r.sql[r.sql.length - 1], "COMMIT");
  const o = s.listOrders({ orderId: 6 })[0];
  assert.equal(o.shippedAt, null); assert.equal(o.customerId, 2);
  assert.equal(s.listOrders({ customerId: 3 }).some((x) => x.id === 6), false);
  assert.throws(() => s.placeOrder(1, {}), /Your cart is empty/);
});
ok("model: seed order totals are the sum of their lines", () => {
  const s = fresh();
  for (const o of s.listOrders()) assert.ok(Math.abs(o.total - o.items.reduce((t, i) => t + i.quantity * i.price, 0)) < 0.005);
});
ok("model: shipping takes stock out once and refuses a second time", () => {
  const s = fresh(), before = s.getProduct(6).stock, id = s.placeOrder(1, { 6: 3 }).id;
  const r = s.shipOrder(id);
  assert.equal(s.getProduct(6).stock, before - 3);
  assert.ok(r.sql.some((q) => /quantity >= 3/.test(q)));
  assert.throws(() => s.shipOrder(id), /already shipped/);
  assert.equal(s.getProduct(6).stock, before - 3);
});
ok("model: shipping is refused, with nothing changed, when any line is short", () => {
  const s = fresh(), id = s.placeOrder(1, { 2: 1, 10: 11 }).id;
  assert.throws(() => s.shipOrder(id), (e) => e instanceof M.StoreError && /Boxing Bag \(need 11, have 10\)/.test(e.message) && e.sql.includes("ROLLBACK"));
  assert.equal(s.getProduct(10).stock, 10); assert.equal(s.getProduct(2).stock, 50);
  assert.equal(s.listOrders({ orderId: id })[0].shippedAt, null);
});
ok("model: state survives snapshot and restore; row counts follow", () => {
  const s = fresh(); s.shipOrder(s.placeOrder(1, { 6: 1 }).id);
  const t = M.create(SEED, s.snapshot());
  assert.deepEqual(t.rowCounts(), s.rowCounts());
  assert.equal(t.rowCounts().shipment, 1); assert.equal(t.rowCounts().order_summary, 6);
});

ok("html: canonical, Open Graph, favicon and og image are in place", () => {
  assert.match(html, /rel="canonical" href="https:\/\/dhairyab0069\.github\.io\/lucascheck-io\/"/);
  assert.match(html, /og:image" content="https:\/\/dhairyab0069\.github\.io\/lucascheck-io\/assets\/og-image\.png"/);
  for (const f of ["assets/favicon-64.png", "assets/og-image.png", ".nojekyll"]) assert.ok(fs.existsSync(path.join(root, f)), f);
});
ok("html: every local script, stylesheet and image reference exists", () => {
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
});
ok("no external requests: only links go off-site, never scripts, styles, images, fonts or fetches", () => {
  assert.doesNotMatch(html, /<(script|img|iframe)[^>]+src="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"[^>]+href="https?:/i);
  for (const f of fs.readdirSync(path.join(root, "assets")).filter((x) => x.endsWith(".js") || x.endsWith(".css"))) {
    const src = read("assets/" + f).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|@import|url\(\s*["']?https?:|new WebSocket|sendBeacon/, f);
  }
});
ok("four symbol controls, sound/motion/effects on by default, versioned keys, no audio files", () => {
  for (const id of ["sound", "motion", "fx"]) assert.match(html, new RegExp('id="ctl-' + id + '" aria-pressed="true"'));
  assert.match(html, /id="ctl-quiet" aria-pressed="false"/);
  assert.match(html, /prefix: "lucascheck2"/);
  assert.match(read("assets/controls.js"), /sound: s\.sound !== 'off'/);
  const files = fs.readdirSync(path.join(root, "assets"), { recursive: true });
  assert.equal(files.filter((f) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(f)).length, 0);
});
ok("reduced motion is respected in CSS and script", () => {
  assert.match(read("assets/style.css"), /prefers-reduced-motion: reduce/);
  assert.match(read("assets/dom.js"), /prefers-reduced-motion: reduce/);
});
ok("theme: shared key, early script and radiogroup are in place", () => {
  assert.ok(html.indexOf("getItem('theme')") > 0 && html.indexOf("getItem('theme')") < html.indexOf("assets/style.css"));
  assert.match(html, /role="radiogroup" aria-label="Color theme"/);
  assert.equal((html.match(/role="radio"/g) || []).length, 3);
});

console.log(`\n${n} checks passed`);
