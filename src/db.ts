import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('dinewise.db');
db.pragma('foreign_keys = ON');

// Migration: Ensure columns exist in restaurants table
try {
  const columns = db.prepare("PRAGMA table_info(restaurants)").all() as any[];
  const columnNames = columns.map(c => c.name);
  
  if (!columnNames.includes('view_count')) {
    db.prepare("ALTER TABLE restaurants ADD COLUMN view_count INTEGER DEFAULT 0").run();
  }
  if (!columnNames.includes('contact_number')) {
    db.prepare("ALTER TABLE restaurants ADD COLUMN contact_number TEXT").run();
  }
  if (!columnNames.includes('opening_hours')) {
    db.prepare("ALTER TABLE restaurants ADD COLUMN opening_hours TEXT").run();
  }
  if (!columnNames.includes('gst_percent')) {
    db.prepare("ALTER TABLE restaurants ADD COLUMN gst_percent REAL DEFAULT 5").run();
  }
  if (!columnNames.includes('service_charge_percent')) {
    db.prepare("ALTER TABLE restaurants ADD COLUMN service_charge_percent REAL DEFAULT 5").run();
  }
} catch (e) {
  // Table might not exist yet, which is fine as it will be created below
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    preferences TEXT,
    points INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Cafe, Restaurant, Fast Food, Hotel
    address TEXT NOT NULL,
    area TEXT NOT NULL, -- Santacruz, Vile Parle
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    price_range TEXT, -- $, $$, $$$
    image_url TEXT,
    lat REAL,
    lng REAL,
    gst_percent REAL DEFAULT 5,
    service_charge_percent REAL DEFAULT 5,
    moods TEXT, -- JSON array: Chill, Work, Date, Quick bite
    peak_hours TEXT, -- JSON object: { "7 PM": "Usually crowded" }
    avg_spend REAL,
    value_score REAL DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    contact_number TEXT,
    opening_hours TEXT -- JSON object: { "open": "11:00", "close": "23:00" }
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    dietary_info TEXT, -- JSON array: Veg, Vegan, Jain, Gluten-free, High protein
    portion_size INTEGER DEFAULT 1, -- 1, 2, 3 (sharing)
    spicy_level TEXT DEFAULT 'Mild', -- Mild, Medium, Very Spicy
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER,
    restaurant_id INTEGER,
    PRIMARY KEY (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recent_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    restaurant_id INTEGER,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    badge_type TEXT NOT NULL, -- Cafe Explorer, Street Food Lover, Dessert Critic
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    restaurant_id INTEGER,
    content TEXT,
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dish_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    menu_item_id INTEGER,
    rating INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    restaurant_id INTEGER,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    people INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS crowd_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    user_id INTEGER,
    level TEXT NOT NULL, -- Not crowded, Moderately crowded, Very crowded
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS restaurant_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    tag TEXT NOT NULL, -- Studying, Dates, Friends, Work
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE(restaurant_id, tag)
  );
`);

// Seed some data if empty
const restaurantCount = db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as { count: number };
if (restaurantCount.count === 0) {
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (name, category, address, area, rating, review_count, price_range, image_url, lat, lng, moods, peak_hours, avg_spend, value_score, contact_number, opening_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMenu = db.prepare(`
    INSERT INTO menu_items (restaurant_id, name, description, price, category, rating, rating_count, dietary_info, portion_size, spicy_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const restaurants = [
    {
      name: "Amar Juice Centre",
      category: "Fast Food",
      address: "Gulmohar Road, Vile Parle West",
      area: "Vile Parle West",
      rating: 4.4,
      review_count: 15200,
      price_range: "₹",
      image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
      lat: 19.1065,
      lng: 72.8372,
      moods: JSON.stringify(["Quick bite", "Chill"]),
      peak_hours: JSON.stringify({ "21:00": "Very crowded", "23:00": "Peak hour" }),
      avg_spend: 400,
      value_score: 4.8,
      contact: "022 2624 3863",
      hours: JSON.stringify({ open: "11:00", close: "02:00" }),
      menu: [
        { name: "Pav Bhaji", price: 180, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Medium" },
        { name: "Mosambi Juice", price: 120, category: "Beverages", dietary: ["Veg", "Vegan"], portion: 1, spicy: "Mild" },
        { name: "Sada Dosa", price: 140, category: "Mains", dietary: ["Veg", "Gluten-free"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Anand Stall",
      category: "Street Food",
      address: "Opposite Mithibai College, Vile Parle West",
      area: "Vile Parle West",
      rating: 4.5,
      review_count: 8500,
      price_range: "₹",
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=800",
      lat: 19.1023,
      lng: 72.8421,
      moods: JSON.stringify(["Quick bite", "Chill"]),
      peak_hours: JSON.stringify({ "13:00": "College crowd", "18:00": "Very crowded" }),
      avg_spend: 250,
      value_score: 4.9,
      contact: "098202 22111",
      hours: JSON.stringify({ open: "08:00", close: "23:30" }),
      menu: [
        { name: "Schezwan Vada Pav", price: 40, category: "Snacks", dietary: ["Veg"], portion: 1, spicy: "Very Spicy" },
        { name: "Butter Vada Pav", price: 35, category: "Snacks", dietary: ["Veg"], portion: 1, spicy: "Medium" },
        { name: "Cheese Grill Sandwich", price: 120, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Medium" }
      ]
    },
    {
      name: "Tea Villa Cafe",
      category: "Cafe",
      address: "Vile Parle West, Mumbai",
      area: "Vile Parle West",
      rating: 4.2,
      review_count: 1200,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
      lat: 19.1023,
      lng: 72.8421,
      moods: JSON.stringify(["Chill", "Work", "Date"]),
      peak_hours: JSON.stringify({ "17:00": "Moderate", "19:00": "Crowded" }),
      avg_spend: 800,
      value_score: 4.1,
      contact: "022 2618 2222",
      hours: JSON.stringify({ open: "10:00", close: "23:00" }),
      menu: [
        { name: "Villa Special Tea", price: 150, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Nutella Waffles", price: 350, category: "Desserts", dietary: ["Veg"], portion: 2, spicy: "Mild" },
        { name: "Hummus & Pita", price: 280, category: "Starters", dietary: ["Veg", "Vegan"], portion: 2, spicy: "Mild" }
      ]
    },
    {
      name: "Lucky Restaurant",
      category: "Restaurant",
      address: "S.V. Road, Santacruz West",
      area: "Santacruz West",
      rating: 4.1,
      review_count: 18000,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800",
      lat: 19.0812,
      lng: 72.8415,
      moods: JSON.stringify(["Quick bite", "Family friendly"]),
      peak_hours: JSON.stringify({ "13:30": "Lunch peak", "20:30": "Dinner peak" }),
      avg_spend: 600,
      value_score: 4.5,
      contact: "022 2648 2929",
      hours: JSON.stringify({ open: "08:00", close: "01:00" }),
      menu: [
        { name: "Chicken Biryani", price: 350, category: "Mains", dietary: ["Non-veg"], portion: 1, spicy: "Medium" },
        { name: "Mutton Seekh Kebab", price: 420, category: "Starters", dietary: ["Non-veg"], portion: 2, spicy: "Very Spicy" },
        { name: "Caramel Custard", price: 120, category: "Desserts", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Gajalee",
      category: "Restaurant",
      address: "Hanuman Road, Vile Parle East",
      area: "Vile Parle East",
      rating: 4.6,
      review_count: 9200,
      price_range: "₹₹₹",
      image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800",
      lat: 19.1005,
      lng: 72.8485,
      moods: JSON.stringify(["Family friendly", "Romantic"]),
      peak_hours: JSON.stringify({ "20:00": "Very crowded", "21:00": "Peak" }),
      avg_spend: 2500,
      value_score: 4.3,
      contact: "022 2616 6470",
      hours: JSON.stringify({ open: "11:30", close: "23:30" }),
      menu: [
        { name: "Butter Garlic Crab", price: 1800, category: "Mains", dietary: ["Non-veg"], portion: 2, spicy: "Mild" },
        { name: "Bombil Fry", price: 450, category: "Starters", dietary: ["Non-veg"], portion: 2, spicy: "Medium" },
        { name: "Sol Kadhi", price: 90, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "The Yoga House",
      category: "Cafe",
      address: "Sherly Rajan Road, Santacruz West",
      area: "Santacruz West",
      rating: 4.4,
      review_count: 2100,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1544931580-3d395d421208?auto=format&fit=crop&q=80&w=800",
      lat: 19.0785,
      lng: 72.8312,
      moods: JSON.stringify(["Chill", "Work", "Healthy"]),
      peak_hours: JSON.stringify({ "10:00": "Breakfast peak", "16:00": "Afternoon tea" }),
      avg_spend: 1200,
      value_score: 4.2,
      contact: "022 6554 5001",
      hours: JSON.stringify({ open: "08:00", close: "22:00" }),
      menu: [
        { name: "Quinoa Burger", price: 450, category: "Mains", dietary: ["Veg", "Vegan", "Gluten-free"], portion: 1, spicy: "Mild" },
        { name: "Detox Green Juice", price: 280, category: "Beverages", dietary: ["Veg", "Vegan"], portion: 1, spicy: "Mild" },
        { name: "Almond Flour Pancakes", price: 380, category: "Breakfast", dietary: ["Veg", "Gluten-free"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Rama Krishna",
      category: "Restaurant",
      address: "Tejpal Road, Vile Parle East",
      area: "Vile Parle East",
      rating: 4.3,
      review_count: 12500,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&q=80&w=800",
      lat: 19.0985,
      lng: 72.8492,
      moods: JSON.stringify(["Family friendly", "Quick bite"]),
      peak_hours: JSON.stringify({ "13:00": "Lunch rush", "20:00": "Dinner rush" }),
      avg_spend: 500,
      value_score: 4.7,
      contact: "022 2614 4141",
      hours: JSON.stringify({ open: "07:00", close: "23:00" }),
      menu: [
        { name: "Mysore Masala Dosa", price: 160, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Medium" },
        { name: "Filter Coffee", price: 60, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Idli Sambar", price: 90, category: "Breakfast", dietary: ["Veg", "Gluten-free"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Theobroma",
      category: "Bakery",
      address: "Linking Road, Santacruz West",
      area: "Santacruz West",
      rating: 4.5,
      review_count: 5600,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800",
      lat: 19.0845,
      lng: 72.8385,
      moods: JSON.stringify(["Chill", "Dessert"]),
      peak_hours: JSON.stringify({ "18:00": "Evening rush", "20:00": "Moderate" }),
      avg_spend: 600,
      value_score: 4.4,
      contact: "088000 18181",
      hours: JSON.stringify({ open: "08:00", close: "00:00" }),
      menu: [
        { name: "Overload Brownie", price: 120, category: "Desserts", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Red Velvet Pastry", price: 150, category: "Desserts", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Chicken Tikka Sandwich", price: 220, category: "Snacks", dietary: ["Non-veg"], portion: 1, spicy: "Medium" }
      ]
    },
    {
      name: "Shiv Sagar",
      category: "Fast Food",
      address: "Vile Parle East, Mumbai",
      area: "Vile Parle East",
      rating: 4.1,
      review_count: 8900,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
      lat: 19.1012,
      lng: 72.8512,
      moods: JSON.stringify(["Quick bite", "Family friendly"]),
      peak_hours: JSON.stringify({ "14:00": "Lunch", "21:00": "Dinner" }),
      avg_spend: 550,
      value_score: 4.3,
      contact: "022 2612 4444",
      hours: JSON.stringify({ open: "11:00", close: "23:30" }),
      menu: [
        { name: "Veg Cheese Pizza", price: 280, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Paneer Tikka Masala", price: 320, category: "Mains", dietary: ["Veg"], portion: 2, spicy: "Medium" },
        { name: "Cold Coffee", price: 140, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Natural Ice Cream",
      category: "Dessert Shop",
      address: "Santacruz West, Mumbai",
      area: "Santacruz West",
      rating: 4.7,
      review_count: 12000,
      price_range: "₹",
      image_url: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=800",
      lat: 19.0825,
      lng: 72.8425,
      moods: JSON.stringify(["Chill", "Dessert"]),
      peak_hours: JSON.stringify({ "21:00": "Very crowded", "22:30": "Peak" }),
      avg_spend: 200,
      value_score: 4.9,
      contact: "022 2648 3030",
      hours: JSON.stringify({ open: "11:00", close: "01:00" }),
      menu: [
        { name: "Sitaphal Ice Cream", price: 80, category: "Desserts", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Tender Coconut Ice Cream", price: 80, category: "Desserts", dietary: ["Veg", "Vegan"], portion: 1, spicy: "Mild" },
        { name: "Mango Shake", price: 150, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Prithvi Cafe",
      category: "Cafe",
      address: "Juhu Church Road, Juhu (Near Vile Parle)",
      area: "Vile Parle West",
      rating: 4.6,
      review_count: 15000,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
      lat: 19.1065,
      lng: 72.8258,
      moods: JSON.stringify(["Chill", "Work", "Date"]),
      peak_hours: JSON.stringify({ "17:00": "Very crowded", "19:00": "Peak hour" }),
      avg_spend: 600,
      value_score: 4.8,
      contact: "022 2614 9546",
      hours: JSON.stringify({ open: "11:00", close: "23:00" }),
      menu: [
        { name: "Irish Coffee", price: 180, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Amritsari Kulcha", price: 220, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Medium" },
        { name: "Apple Pie", price: 150, category: "Desserts", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Mini Punjab",
      category: "Restaurant",
      address: "S.V. Road, Santacruz West",
      area: "Santacruz West",
      rating: 4.2,
      review_count: 7800,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800",
      lat: 19.0835,
      lng: 72.8405,
      moods: JSON.stringify(["Family friendly", "Party"]),
      peak_hours: JSON.stringify({ "20:30": "Dinner rush" }),
      avg_spend: 1000,
      value_score: 4.1,
      contact: "022 2648 5650",
      hours: JSON.stringify({ open: "12:00", close: "00:00" }),
      menu: [
        { name: "Butter Chicken", price: 450, category: "Mains", dietary: ["Non-veg"], portion: 2, spicy: "Medium" },
        { name: "Dal Makhani", price: 320, category: "Mains", dietary: ["Veg"], portion: 2, spicy: "Mild" },
        { name: "Garlic Naan", price: 60, category: "Breads", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Tiffin Box",
      category: "Restaurant",
      address: "Santacruz East, Mumbai",
      area: "Santacruz East",
      rating: 4.0,
      review_count: 3400,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&q=80&w=800",
      lat: 19.0912,
      lng: 72.8512,
      moods: JSON.stringify(["Quick bite", "Work"]),
      peak_hours: JSON.stringify({ "13:00": "Lunch peak" }),
      avg_spend: 450,
      value_score: 4.4,
      contact: "022 2611 2233",
      hours: JSON.stringify({ open: "11:00", close: "23:00" }),
      menu: [
        { name: "Veg Thali", price: 250, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Medium" },
        { name: "Chicken Thali", price: 320, category: "Mains", dietary: ["Non-veg"], portion: 1, spicy: "Medium" },
        { name: "Buttermilk", price: 40, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    },
    {
      name: "Shiv Sagar - Vile Parle",
      category: "Fast Food",
      address: "Vile Parle East, Mumbai",
      area: "Vile Parle East",
      rating: 4.1,
      review_count: 6700,
      price_range: "₹₹",
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
      lat: 19.1012,
      lng: 72.8512,
      moods: JSON.stringify(["Quick bite", "Family friendly"]),
      peak_hours: JSON.stringify({ "14:00": "Lunch", "21:00": "Dinner" }),
      avg_spend: 500,
      value_score: 4.3,
      contact: "022 2612 4444",
      hours: JSON.stringify({ open: "11:00", close: "23:30" }),
      menu: [
        { name: "Veg Cheese Pizza", price: 280, category: "Mains", dietary: ["Veg"], portion: 1, spicy: "Mild" },
        { name: "Paneer Tikka Masala", price: 320, category: "Mains", dietary: ["Veg"], portion: 2, spicy: "Medium" },
        { name: "Cold Coffee", price: 140, category: "Beverages", dietary: ["Veg"], portion: 1, spicy: "Mild" }
      ]
    }
  ];

  restaurants.forEach(r => {
    const result = insertRestaurant.run(
      r.name, r.category, r.address, r.area, r.rating, r.review_count, r.price_range, r.image_url, r.lat, r.lng, r.moods, r.peak_hours, r.avg_spend, r.value_score, r.contact, r.hours
    );
    const restaurantId = result.lastInsertRowid;

    r.menu.forEach(m => {
      insertMenu.run(
        restaurantId, m.name, `${m.name} description`, m.price, m.category, 4.5, 100, JSON.stringify(m.dietary), m.portion, m.spicy
      );
    });
  });

  // Seed tags
  const insertTag = db.prepare('INSERT INTO restaurant_tags (restaurant_id, tag, votes) VALUES (?, ?, ?)');
  // Add some tags for the first few restaurants
  insertTag.run(1, 'Quick bite', 85);
  insertTag.run(1, 'Friends', 95);
  insertTag.run(3, 'Work', 40);
  insertTag.run(5, 'Dates', 70);
}

export default db;
