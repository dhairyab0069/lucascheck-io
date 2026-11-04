/* Seed data of the Lucas-Check store, extracted from src/lib/schema.ts in dhairyab0069/LucasCheck (product names, prices, stock,
   categories, the five sample customers and the five seed orders). The sample passwords are public on purpose: it is a demo store. */
window.LUCAS_SEED = {
 "categories": [
  {
   "id": 1,
   "name": "Clothing"
  },
  {
   "id": 2,
   "name": "Hard Goods"
  },
  {
   "id": 3,
   "name": "Soft Goods"
  },
  {
   "id": 4,
   "name": "Footwear"
  },
  {
   "id": 5,
   "name": "Kids"
  },
  {
   "id": 6,
   "name": "Supplements"
  }
 ],
 "products": [
  {
   "id": 1,
   "name": "Baseball Bat",
   "price": 106,
   "category": 2,
   "image": "baseball-bat.webp",
   "stock": 20
  },
  {
   "id": 2,
   "name": "Basketball",
   "price": 35,
   "category": 2,
   "image": "basketball.webp",
   "stock": 50
  },
  {
   "id": 3,
   "name": "Bike Helmet",
   "price": 72,
   "category": 2,
   "image": "bikehelmet.webp",
   "stock": 40
  },
  {
   "id": 4,
   "name": "Hockey Stick",
   "price": 360,
   "category": 2,
   "image": "hockey-stick.webp",
   "stock": 74
  },
  {
   "id": 5,
   "name": "Lacrosse Stick",
   "price": 250,
   "category": 2,
   "image": "lacrosse-racquet.webp",
   "stock": 32
  },
  {
   "id": 6,
   "name": "Softball",
   "price": 5,
   "category": 2,
   "image": "softball.webp",
   "stock": 101
  },
  {
   "id": 7,
   "name": "Squash Racquet",
   "price": 85,
   "category": 2,
   "image": "squash-racquet.webp",
   "stock": 12
  },
  {
   "id": 8,
   "name": "Baseball Glove",
   "price": 165,
   "category": 2,
   "image": "baseball-glove.webp",
   "stock": 69
  },
  {
   "id": 9,
   "name": "Hockey Puck",
   "price": 6,
   "category": 2,
   "image": "hockey-puck.webp",
   "stock": 157
  },
  {
   "id": 10,
   "name": "Boxing Bag",
   "price": 275,
   "category": 2,
   "image": "boxing-bag.webp",
   "stock": 10
  },
  {
   "id": 11,
   "name": "Swimming Shorts",
   "price": 25,
   "category": 1,
   "image": "swimming-shorts.webp",
   "stock": 43
  },
  {
   "id": 12,
   "name": "Snow Pants",
   "price": 85,
   "category": 1,
   "image": "snow-pants.webp",
   "stock": 23
  },
  {
   "id": 13,
   "name": "Hoodie",
   "price": 60,
   "category": 1,
   "image": "hoodie.webp",
   "stock": 98
  },
  {
   "id": 14,
   "name": "Gym Shorts",
   "price": 45,
   "category": 1,
   "image": "gym-shorts.webp",
   "stock": 56
  },
  {
   "id": 15,
   "name": "Protein Bar",
   "price": 2,
   "category": 6,
   "image": "protein-bar.webp",
   "stock": 187
  },
  {
   "id": 16,
   "name": "BCAA",
   "price": 28,
   "category": 6,
   "image": "bccaa.webp",
   "stock": 35
  },
  {
   "id": 17,
   "name": "Pre-workout",
   "price": 36,
   "category": 6,
   "image": "preworkout.webp",
   "stock": 54
  },
  {
   "id": 18,
   "name": "Multivitamins",
   "price": 20,
   "category": 6,
   "image": "multivitamins.webp",
   "stock": 67
  },
  {
   "id": 19,
   "name": "Soccer Cleats",
   "price": 170,
   "category": 4,
   "image": "soccer-cleats.webp",
   "stock": 69
  },
  {
   "id": 20,
   "name": "Snow Shoes",
   "price": 202,
   "category": 4,
   "image": "snow-shoes.webp",
   "stock": 52
  },
  {
   "id": 21,
   "name": "Running Shoes",
   "price": 135,
   "category": 4,
   "image": "running-shoes.webp",
   "stock": 56
  },
  {
   "id": 22,
   "name": "Training Shoes",
   "price": 120,
   "category": 4,
   "image": "training-shoes.webp",
   "stock": 34
  },
  {
   "id": 23,
   "name": "Kids Shorts",
   "price": 20,
   "category": 5,
   "image": "kids-shorts.webp",
   "stock": 65
  },
  {
   "id": 24,
   "name": "Kids T-shirt",
   "price": 15,
   "category": 5,
   "image": "kid-tshirt.webp",
   "stock": 42
  },
  {
   "id": 25,
   "name": "Kids Winter Jacket",
   "price": 85,
   "category": 5,
   "image": "kids-winter-jacket.webp",
   "stock": 69
  }
 ],
 "customers": [
  {
   "id": 1,
   "first": "Arnold",
   "last": "Anderson",
   "email": "a.anderson@gmail.com",
   "city": "Winnipeg",
   "state": "MB",
   "country": "Canada",
   "user": "arnold",
   "password": "test",
   "admin": true
  },
  {
   "id": 2,
   "first": "Bobby",
   "last": "Brown",
   "email": "bobby.brown@hotmail.ca",
   "city": "Boston",
   "state": "MA",
   "country": "United States",
   "user": "bobby",
   "password": "bobby",
   "admin": false
  },
  {
   "id": 3,
   "first": "Candace",
   "last": "Cole",
   "email": "cole@charity.org",
   "city": "Chicago",
   "state": "IL",
   "country": "United States",
   "user": "candace",
   "password": "password",
   "admin": false
  },
  {
   "id": 4,
   "first": "Darren",
   "last": "Doe",
   "email": "oe@doe.com",
   "city": "Kelowna",
   "state": "BC",
   "country": "Canada",
   "user": "darren",
   "password": "pw",
   "admin": false
  },
  {
   "id": 5,
   "first": "Elizabeth",
   "last": "Elliott",
   "email": "engel@uiowa.edu",
   "city": "Iowa City",
   "state": "IA",
   "country": "United States",
   "user": "beth",
   "password": "test",
   "admin": false
  }
 ],
 "orders": [
  {
   "id": 1,
   "customer": 1,
   "date": "2019-10-15T10:25:55Z",
   "items": [
    {
     "product": 1,
     "quantity": 1,
     "price": 18
    },
    {
     "product": 5,
     "quantity": 2,
     "price": 21.35
    },
    {
     "product": 10,
     "quantity": 1,
     "price": 31
    }
   ]
  },
  {
   "id": 2,
   "customer": 2,
   "date": "2019-10-16T18:00:00Z",
   "items": [
    {
     "product": 5,
     "quantity": 5,
     "price": 21.35
    }
   ]
  },
  {
   "id": 3,
   "customer": 3,
   "date": "2019-10-15T03:30:22Z",
   "items": [
    {
     "product": 6,
     "quantity": 2,
     "price": 25
    },
    {
     "product": 7,
     "quantity": 3,
     "price": 30
    }
   ]
  },
  {
   "id": 4,
   "customer": 2,
   "date": "2019-10-17T05:45:11Z",
   "items": [
    {
     "product": 3,
     "quantity": 4,
     "price": 10
    },
    {
     "product": 8,
     "quantity": 3,
     "price": 40
    },
    {
     "product": 13,
     "quantity": 3,
     "price": 23.25
    }
   ]
  },
  {
   "id": 5,
   "customer": 5,
   "date": "2019-10-15T10:25:55Z",
   "items": [
    {
     "product": 5,
     "quantity": 4,
     "price": 21.35
    },
    {
     "product": 19,
     "quantity": 2,
     "price": 81
    },
    {
     "product": 20,
     "quantity": 3,
     "price": 10
    }
   ]
  }
 ]
};
