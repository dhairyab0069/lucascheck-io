# lucascheck-io

The project page for [Lucas-Check](https://github.com/dhairyab0069/LucasCheck), a mock sporting goods store that began as the
COSC 304 (Introduction to Database Systems) term project of Group 4 and was rebuilt in 2026 on Next.js 16 and Postgres for Vercel.

Live at **<https://dhairyab0069.github.io/lucascheck-io/>** (GitHub Pages, from the repo root). The real store's live demo is
<https://lucascheck.vercel.app>.

It is a static site: HTML, CSS and vanilla JavaScript, no build step, no libraries, no web fonts and no external requests.

## What is on the page

- **The store, in miniature.** The real product, stock, customer and order data, and the real rules from `src/lib/store.ts`:
  browse and search 25 products in six categories, add to a cart (ids and quantities only, capped at 99, priced from the product
  table), log in with one of the five sample accounts to check out, get a receipt, see your orders, and, as `arnold`, use the Admin tab
  (revenue, sales by day, a Ship button that refuses when any line is short of stock and ships an order only once). Below it, a log
  shows the SQL the real store would send for each click.
- **The database.** An SVG diagram of the 8 tables of `src/lib/schema.ts` (and, with one switch, the 11 tables of the original SQL
  Server script, with what the rebuild dropped or changed marked). Three walkthroughs (browse, place an order, ship an order) step
  through the tables and foreign keys a query touches, with a dot running along each relation and the statement shown. Select a
  table to see its relations and its `CREATE TABLE`. Row counts on the table headers follow what you do in the store.
- **Then and now.** A timeline and a wipe slider between the JSP course project and the rebuild, nine real differences.

The store on the page is a plain JavaScript re-implementation, not the Next.js app, so the page can run on GitHub Pages. Orders you place
are kept in this browser's local storage (when allowed); "Reset the store" clears them. The sample passwords are public on purpose, as
in the store's own README.

## Sound

The Sound switch (top bar, off by default, remembered in `localStorage`) turns on small sounds made live with the Web Audio API: a
scanner beep when something goes in the cart, a till drawer and bell when an order is placed, a box thud and tape for shipping, a buzz
for errors, a ping per diagram step. There are no audio files. Nothing plays while the tab is hidden.

## Motion and accessibility

The swaying tag, the flowing relation lines, the travelling dot, the wipe's intro sweep and the diagram's auto-play are skipped when the
system asks for reduced motion (the diagram keeps Step and Back). Everything is a real button, link or input with a visible focus ring;
tabs use arrow keys; diagram tables are focusable buttons; changes are announced through a live region; the diagram scrolls sideways on
small screens.

## Run and test

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
node tests/data.test.js       # data, store rules, diagram, HTML and no-external-requests checks (Node 20+)
```

If a clone of LucasCheck sits next to this repo, the test also compares the seed data with its `src/lib/schema.ts`.

## Layout

| File | What it is |
|---|---|
| `index.html` | the page |
| `assets/data.js` | seed data from `schema.ts` (products, prices, stock, customers, orders) |
| `assets/model.js` | the store's rules, with no DOM, so node can test them |
| `assets/schema.js` | the diagram's tables, relations and walkthroughs |
| `assets/app.js`, `diagram.js`, `dom.js` | the store UI, the diagram, small helpers |
| `assets/sound.js` | the synthesized sounds |
| `assets/style.css` | styles |
| `assets/img/` | product photos, shrunk to 360 px WebP |

Product photos were collected by the Lucas-Check group from retailers' public listings for the course project; brand names in the photos
belong to their owners.
