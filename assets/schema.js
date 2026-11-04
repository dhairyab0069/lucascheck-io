/* The database diagram's data. src/lib/schema.ts (Postgres, 8 tables). Columns are listed as [name, type, flags] with flags
   pk, fk and uq. Boxes are 210 wide with a 28 header and 18 per row; x and y place them on the drawing. */
window.LUCAS_SCHEMA = (function () {
  function T(id, x, y, cols, extra) { var t = { id: id, x: x, y: y, cols: cols }; for (var k in extra) t[k] = extra[k]; return t; }
  var now = {
    width: 1080, height: 430,
    tables: [
      T("customer", 20, 20, [["customer_id", "SERIAL", "pk"], ["first_name", "VARCHAR(40)"], ["last_name", "VARCHAR(40)"], ["email", "VARCHAR(50)"], ["phone", "VARCHAR(20)"], ["address", "VARCHAR(50)"], ["city", "VARCHAR(40)"], ["state", "VARCHAR(20)"], ["postal_code", "VARCHAR(20)"], ["country", "VARCHAR(40)"], ["user_id", "VARCHAR(20)", "uq"], ["password_hash", "TEXT"], ["is_admin", "BOOLEAN"]]),
      T("order_summary", 290, 20, [["order_id", "SERIAL", "pk"], ["order_date", "TIMESTAMPTZ"], ["total_amount", "NUMERIC(10,2)"], ["customer_id", "INT", "fk"]]),
      T("shipment", 290, 190, [["shipment_id", "SERIAL", "pk"], ["order_id", "INT", "fk uq"], ["shipment_date", "TIMESTAMPTZ"], ["warehouse_id", "INT", "fk"]]),
      T("warehouse", 290, 340, [["warehouse_id", "SERIAL", "pk"], ["warehouse_name", "VARCHAR(30)"]]),
      T("order_product", 560, 20, [["order_id", "INT", "pk fk"], ["product_id", "INT", "pk fk"], ["quantity", "INT"], ["price", "NUMERIC(10,2)"]]),
      T("product", 560, 150, [["product_id", "SERIAL", "pk"], ["product_name", "VARCHAR(40)"], ["product_desc", "VARCHAR(1000)"], ["price", "NUMERIC(10,2)"], ["category_id", "INT", "fk"], ["image_url", "VARCHAR(100)"]]),
      T("product_inventory", 560, 330, [["product_id", "INT", "pk fk"], ["warehouse_id", "INT", "pk fk"], ["quantity", "INT"]]),
      T("category", 830, 150, [["category_id", "SERIAL", "pk"], ["category_name", "VARCHAR(50)", "uq"]])
    ],
    rels: [
      { id: "r_cust", a: ["order_summary", "customer_id", "l"], b: ["customer", "customer_id", "r"], mx: 260, ends: ["N", "1"], note: "A customer places many orders; every order belongs to one customer." },
      { id: "r_ol_o", a: ["order_product", "order_id", "l"], b: ["order_summary", "order_id", "r"], mx: 530, ends: ["N", "1"], note: "An order has many lines (its primary key is order_id plus product_id)." },
      { id: "r_ol_p", a: ["order_product", "product_id", "b", 30], b: ["product", "product_id", "t", 30], ends: ["N", "1"], note: "Each line is one product, stored with the price it sold at." },
      { id: "r_ship_o", a: ["shipment", "order_id", "t", 60], b: ["order_summary", "order_id", "b", 60], ends: ["0..1", "1"], note: "order_id is UNIQUE in shipment, so an order ships at most once." },
      { id: "r_ship_w", a: ["shipment", "warehouse_id", "b", 60], b: ["warehouse", "warehouse_id", "t", 60], ends: ["N", "1"], note: "Every shipment leaves from a warehouse." },
      { id: "r_inv_p", a: ["product_inventory", "product_id", "t", 30], b: ["product", "product_id", "b", 30], ends: ["N", "1"], note: "Stock is counted per product and warehouse; the store reads warehouse 1." },
      { id: "r_inv_w", a: ["product_inventory", "warehouse_id", "l"], b: ["warehouse", "warehouse_id", "r"], mx: 530, ends: ["N", "1"], note: "The other half of the inventory key: which warehouse holds the stock." },
      { id: "r_cat", a: ["product", "category_id", "r"], b: ["category", "category_id", "l"], mx: 800, ends: ["N", "1"], note: "A category groups many products." }
    ]
  };
  /* Walkthroughs: each step lights some tables and relations and shows the SQL the store runs there. */
  var scenes = [
    { id: "browse", label: "Browse the shop", steps: [
      { tables: ["product", "category"], rels: ["r_cat"], text: "The shop page joins each product to its category.", sql: "SELECT p.product_id AS id, p.product_name AS name, p.price::float8 AS price, c.category_name AS category,\n       COALESCE(i.quantity, 0) AS stock\nFROM product p\nJOIN category c ON c.category_id = p.category_id\nLEFT JOIN product_inventory i ON i.product_id = p.product_id AND i.warehouse_id = 1\nORDER BY p.product_name" },
      { tables: ["product", "product_inventory"], rels: ["r_inv_p"], text: "Live stock comes from product_inventory, warehouse 1. A LEFT JOIN, so a product with no stock row shows 0 rather than vanishing.", sql: "LEFT JOIN product_inventory i\n  ON i.product_id = p.product_id AND i.warehouse_id = 1" }
    ] },
    { id: "order", label: "Place an order", steps: [
      { tables: ["product"], rels: [], text: "Prices are read from the database, never taken from the browser.", sql: "SELECT product_id AS id, price::float8 AS price\nFROM product WHERE product_id = ANY($1::int[])" },
      { tables: ["customer", "order_summary"], rels: ["r_cust"], text: "The order row belongs to the logged-in customer.", sql: "INSERT INTO order_summary (customer_id, total_amount)\nVALUES ($1, $2) RETURNING order_id AS id" },
      { tables: ["order_summary", "order_product", "product"], rels: ["r_ol_o", "r_ol_p"], text: "One row per cart line, with the price the product had at that moment.", sql: "INSERT INTO order_product (order_id, product_id, quantity, price)\nVALUES ($1, $2, $3, $4)" },
      { tables: ["customer", "order_summary", "order_product", "product"], rels: ["r_cust", "r_ol_o", "r_ol_p"], text: "All of it in one transaction: either the whole order exists or none of it does.", sql: "COMMIT" }
    ] },
    { id: "ship", label: "Ship an order", steps: [
      { tables: ["shipment", "order_summary"], rels: ["r_ship_o"], text: "First check the order has not shipped already.", sql: "SELECT 1 FROM shipment WHERE order_id = $1" },
      { tables: ["order_product", "product", "product_inventory"], rels: ["r_ol_p", "r_inv_p"], text: "Read each line against the warehouse stock. If any line is short, the shipment is refused and nothing changes.", sql: "SELECT op.product_id, p.product_name, op.quantity, i.quantity AS stock\nFROM order_product op\nJOIN product p ON p.product_id = op.product_id\nLEFT JOIN product_inventory i ON i.product_id = op.product_id AND i.warehouse_id = 1\nWHERE op.order_id = $1" },
      { tables: ["product_inventory", "warehouse"], rels: ["r_inv_w"], text: "Take the stock out. The quantity >= guard means two admins shipping at once cannot push stock below zero.", sql: "UPDATE product_inventory SET quantity = quantity - $1\nWHERE product_id = $2 AND warehouse_id = 1 AND quantity >= $1\nRETURNING quantity" },
      { tables: ["shipment", "order_summary", "warehouse"], rels: ["r_ship_o", "r_ship_w"], text: "Record the shipment. order_id is UNIQUE, so shipping the same order twice at once fails here.", sql: "INSERT INTO shipment (order_id, warehouse_id) VALUES ($1, 1)" }
    ] }
  ];
  return { now: now, scenes: scenes };
})();
