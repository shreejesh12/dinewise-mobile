import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./src/db.ts";
import { GoogleGenAI } from "@google/genai";
import { searchNearbyRestaurants } from "./src/services/googlePlacesService";

const JWT_SECRET = "dinewise_secret_key_123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Error handling middleware to prevent HTML responses on errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });


  function inferCategory(types: string[] = []) {
    if (types.includes('cafe')) return 'Cafe';
    if (types.includes('meal_takeaway') || types.includes('fast_food')) return 'Fast Food';
    if (types.includes('lodging')) return 'Hotel';
    return 'Restaurant';
  }

  function inferArea(address: string = '') {
    const lower = address.toLowerCase();
    if (lower.includes('santacruz')) return 'Santacruz';
    if (lower.includes('vile parle')) return 'Vile Parle';
    return 'Mumbai';
  }

  function priceLevelToRange(level?: number) {
    if (level === undefined || level === null) return '₹₹';
    return '₹'.repeat(Math.min(4, Math.max(1, level + 1)));
  }

  function syncGooglePlaceToDb(place: any) {
    const existing = db.prepare('SELECT * FROM restaurants WHERE name = ? AND address = ?').get(place.name, place.vicinity) as any;
    const mapped = {
      name: place.name,
      category: inferCategory(place.types || []),
      address: place.vicinity || 'Address unavailable',
      area: inferArea(place.vicinity || ''),
      rating: place.rating || 0,
      review_count: place.user_ratings_total || 0,
      price_range: priceLevelToRange(place.price_level),
      image_url: place.photo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200',
      lat: place.geometry?.location?.lat || null,
      lng: place.geometry?.location?.lng || null,
      moods: JSON.stringify(['Chill', 'Quick bite']),
      peak_hours: JSON.stringify({ '19:00': 'Live crowd data coming soon' }),
      avg_spend: 800,
      value_score: place.rating || 4.2,
      contact_number: null,
      opening_hours: JSON.stringify({ open: '10:00', close: '23:00' })
    };
    if (existing) {
      db.prepare(`UPDATE restaurants SET rating=?, review_count=?, price_range=?, image_url=?, lat=?, lng=? WHERE id=?`).run(
        mapped.rating, mapped.review_count, mapped.price_range, mapped.image_url, mapped.lat, mapped.lng, existing.id
      );
      return db.prepare('SELECT * FROM restaurants WHERE id = ?').get(existing.id);
    }
    const result = db.prepare(`INSERT INTO restaurants (name, category, address, area, rating, review_count, price_range, image_url, lat, lng, moods, peak_hours, avg_spend, value_score, contact_number, opening_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      mapped.name, mapped.category, mapped.address, mapped.area, mapped.rating, mapped.review_count, mapped.price_range, mapped.image_url, mapped.lat, mapped.lng, mapped.moods, mapped.peak_hours, mapped.avg_spend, mapped.value_score, mapped.contact_number, mapped.opening_hours
    );
    return db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid);
  }

  async function verifyWithGemini(payload: any) {
    if (!process.env.GEMINI_API_KEY || !payload.imageBase64) {
      return { approved: true, reason: 'Saved without AI verification. Add GEMINI_API_KEY for image checks.' };
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = payload.reviewType === 'dish'
      ? `You are checking whether a restaurant bill image supports a dish rating. Dish to verify: ${payload.dishName}. Restaurant: ${payload.restaurant_name}. Reply in JSON only with keys approved(boolean), reason(string). Approve only if the bill likely mentions the dish or restaurant.`
      : `You are checking whether an uploaded image likely proves a real visit for restaurant ${payload.restaurant_name}. The image may be a storefront, interior, or bill. Reply in JSON only with keys approved(boolean), reason(string).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: prompt },
          { inlineData: { mimeType: payload.mimeType || 'image/jpeg', data: payload.imageBase64 } }
        ]
      });
      const raw = String(response.text || '').trim();
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      const json = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
      return { approved: Boolean(json.approved), reason: json.reason || 'AI verification complete.' };
    } catch (error: any) {
      return { approved: true, reason: 'AI verification unavailable, saved in fallback mode.' };
    }
  }

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
      const token = jwt.sign({ id: result.lastInsertRowid, email, role: 'user' }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, name, email, role: 'user' } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // --- Restaurant Routes ---
  app.get("/api/restaurants", (req, res) => {
    try {
      const { area, category, search, mood } = req.query;
      let query = "SELECT * FROM restaurants WHERE 1=1";
      const params: any[] = [];

      if (area) {
        query += " AND area = ?";
        params.push(area);
      }
      if (category) {
        query += " AND category = ?";
        params.push(category);
      }
      if (search) {
        query += " AND name LIKE ?";
        params.push(`%${search}%`);
      }
      if (mood) {
        query += " AND moods LIKE ?";
        params.push(`%${mood}%`);
      }

      const restaurants = db.prepare(query).all(...params) as any[];
      
      // Add tags to each restaurant
      const restaurantsWithTags = restaurants.map(r => {
        const tags = db.prepare("SELECT tag, votes FROM restaurant_tags WHERE restaurant_id = ?").all(r.id);
        return { ...r, tags };
      });

      res.json(restaurantsWithTags);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/restaurants/:id", (req, res) => {
    try {
      const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(req.params.id) as any;
      if (!restaurant) return res.status(404).json({ error: "Not found" });
      
      // Increment view count
      db.prepare("UPDATE restaurants SET view_count = view_count + 1 WHERE id = ?").run(req.params.id);

      const menu = db.prepare("SELECT * FROM menu_items WHERE restaurant_id = ?").all(req.params.id);
      const reviews = db.prepare(`
        SELECT r.*, u.name as user_name 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.restaurant_id = ? 
        ORDER BY r.created_at DESC
      `).all(req.params.id);
      const tags = db.prepare("SELECT tag, votes FROM restaurant_tags WHERE restaurant_id = ?").all(req.params.id);
      const crowd = db.prepare("SELECT level, timestamp FROM crowd_reports WHERE restaurant_id = ? ORDER BY timestamp DESC LIMIT 1").get(req.params.id);

      res.json({ ...restaurant, menu, reviews, tags, current_crowd: crowd });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Review & Rating Routes ---
  app.post("/api/reviews", (req, res) => {
    const { user_id, restaurant_id, content, rating } = req.body;
    try {
      db.prepare("INSERT INTO reviews (user_id, restaurant_id, content, rating) VALUES (?, ?, ?, ?)").run(user_id, restaurant_id, content, rating);
      
      // Update restaurant average rating
      const stats = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE restaurant_id = ?").get(restaurant_id) as any;
      db.prepare("UPDATE restaurants SET rating = ?, review_count = ? WHERE id = ?").run(stats.avg, stats.count, restaurant_id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to post review. Ensure you are logged in and the restaurant exists." });
    }
  });

  app.post("/api/dish-ratings", (req, res) => {
    const { user_id, menu_item_id, rating } = req.body;
    try {
      db.prepare("INSERT INTO dish_ratings (user_id, menu_item_id, rating) VALUES (?, ?, ?)").run(user_id, menu_item_id, rating);
      
      const stats = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM dish_ratings WHERE menu_item_id = ?").get(menu_item_id) as any;
      db.prepare("UPDATE menu_items SET rating = ?, rating_count = ? WHERE id = ?").run(stats.avg, stats.count, menu_item_id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to rate dish. Ensure you are logged in and the dish exists." });
    }
  });

  // --- Reservation Routes ---
  app.post("/api/reservations", (req, res) => {
    const { user_id, restaurant_id, date, time, people } = req.body;
    try {
      db.prepare("INSERT INTO reservations (user_id, restaurant_id, date, time, people) VALUES (?, ?, ?, ?, ?)").run(user_id, restaurant_id, date, time, people);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to book table. Ensure you are logged in and the restaurant exists." });
    }
  });

  app.get("/api/reservations/user/:userId", (req, res) => {
    const reservations = db.prepare(`
      SELECT r.*, res.name as restaurant_name 
      FROM reservations r 
      JOIN restaurants res ON r.restaurant_id = res.id 
      WHERE r.user_id = ?
    `).all(req.params.userId);
    res.json(reservations);
  });

  // --- Crowd & Tags ---
  app.post("/api/crowd-report", (req, res) => {
    try {
      const { restaurant_id, user_id, level } = req.body;
      db.prepare("INSERT INTO crowd_reports (restaurant_id, user_id, level) VALUES (?, ?, ?)").run(restaurant_id, user_id, level);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to report crowd. Ensure you are logged in." });
    }
  });

  app.post("/api/vote-tag", (req, res) => {
    try {
      const { restaurant_id, tag } = req.body;
      const existing = db.prepare("SELECT * FROM restaurant_tags WHERE restaurant_id = ? AND tag = ?").get(restaurant_id, tag) as any;
      if (existing) {
        db.prepare("UPDATE restaurant_tags SET votes = votes + 1 WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO restaurant_tags (restaurant_id, tag, votes) VALUES (?, ?, 1)").run(restaurant_id, tag);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to vote. Ensure the restaurant exists." });
    }
  });

  // --- AI Sentiment Summary ---
  app.get("/api/restaurants/:id/sentiment", async (req, res) => {
    const reviews = db.prepare("SELECT content FROM reviews WHERE restaurant_id = ?").all(req.params.id) as any[];
    if (reviews.length === 0) return res.json({ summary: "No reviews yet." });

    const reviewText = reviews.map(r => r.content).join("\n");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize these restaurant reviews into a few bullet points highlighting ambience, service, pricing, and food quality: \n${reviewText}`,
      });
      res.json({ summary: response.text });
    } catch (e) {
      res.json({ summary: "Could not generate summary at this time." });
    }
  });

  // --- Budget Recommendation ---
  app.post("/api/recommendations", (req, res) => {
    const { budget, people, area } = req.body;
    const perPerson = budget / people;
    
    // Find restaurants where average dish price * 1.5 (for a full meal) is within perPerson
    // This is a simple heuristic
    const restaurants = db.prepare(`
      SELECT r.*, AVG(m.price) as avg_price
      FROM restaurants r
      JOIN menu_items m ON r.id = m.restaurant_id
      WHERE r.area = ?
      GROUP BY r.id
      HAVING avg_price * 1.2 <= ?
      ORDER BY r.rating DESC
      LIMIT 5
    `).all(area, perPerson);

    res.json(restaurants);
  });

  app.post("/api/admin/restaurants", (req, res) => {
    const { name, category, address, area, price_range, image_url } = req.body;
    try {
      db.prepare("INSERT INTO restaurants (name, category, address, area, price_range, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(name, category, address, area, price_range, image_url);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to add restaurant", details: e.message });
    }
  });

  app.delete("/api/admin/restaurants/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM restaurants WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ 
        error: "Failed to delete restaurant", 
        details: e.message,
        suggestion: "If this is a foreign key error, try 'Reset Database' in Admin panel to fix schema constraints." 
      });
    }
  });

  app.post("/api/admin/sync-google-places", async (req, res) => {
    const { apiKey, lat, lng, areaName } = req.body;
    const effectiveApiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!effectiveApiKey) return res.status(400).json({ error: "Google Maps API Key is required" });

    try {
      const places = await searchNearbyRestaurants(effectiveApiKey, lat, lng);
      const insertRestaurant = db.prepare(`
        INSERT INTO restaurants (name, category, address, area, rating, review_count, price_range, image_url, lat, lng, moods, peak_hours, avg_spend, value_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let count = 0;
      for (const place of places) {
        const existing = db.prepare("SELECT id FROM restaurants WHERE name = ? AND area = ?").get(place.name, areaName);
        if (existing) continue;

        const category = place.types.includes('cafe') ? 'Cafe' : 
                         place.types.includes('bakery') ? 'Bakery' : 'Restaurant';
        
        const priceRange = place.price_level ? '₹'.repeat(place.price_level) : '₹₹';
        const imageUrl = `https://picsum.photos/seed/${place.place_id}/800/600`;

        insertRestaurant.run(
          place.name,
          category,
          place.vicinity,
          areaName,
          place.rating || 0,
          place.user_ratings_total || 0,
          priceRange,
          imageUrl,
          place.geometry.location.lat,
          place.geometry.location.lng,
          JSON.stringify(["Quick bite"]),
          JSON.stringify({}),
          place.price_level ? place.price_level * 400 : 600,
          place.rating || 0
        );
        count++;
      }

      res.json({ success: true, added: count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to sync with Google Places" });
    }
  });

  app.post("/api/admin/reset-db", (req, res) => {
    try {
      db.exec(`
        DROP TABLE IF EXISTS restaurant_tags;
        DROP TABLE IF EXISTS crowd_reports;
        DROP TABLE IF EXISTS reservations;
        DROP TABLE IF EXISTS dish_ratings;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS badges;
        DROP TABLE IF EXISTS recent_views;
        DROP TABLE IF EXISTS favorites;
        DROP TABLE IF EXISTS menu_items;
        DROP TABLE IF EXISTS restaurants;
        DROP TABLE IF EXISTS users;
      `);
      res.json({ success: true, message: "Database reset. Please refresh the page in a few seconds." });
      setTimeout(() => process.exit(0), 1000); 
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to reset database" });
    }
  });

  // --- Favorites & Recent Views ---
  app.get("/api/favorites/:userId", (req, res) => {
    try {
      const favorites = db.prepare(`
        SELECT r.* FROM restaurants r
        JOIN favorites f ON r.id = f.restaurant_id
        WHERE f.user_id = ?
      `).all(req.params.userId);
      res.json(favorites);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/favorites/toggle", (req, res) => {
    try {
      const { user_id, restaurant_id } = req.body;
      const existing = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND restaurant_id = ?").get(user_id, restaurant_id);
      if (existing) {
        db.prepare("DELETE FROM favorites WHERE user_id = ? AND restaurant_id = ?").run(user_id, restaurant_id);
        res.json({ favorited: false });
      } else {
        db.prepare("INSERT INTO favorites (user_id, restaurant_id) VALUES (?, ?)").run(user_id, restaurant_id);
        res.json({ favorited: true });
      }
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to toggle favorite. Ensure you are logged in." });
    }
  });

  app.post("/api/recent-views", (req, res) => {
    try {
      const { user_id, restaurant_id } = req.body;
      db.prepare("INSERT INTO recent_views (user_id, restaurant_id) VALUES (?, ?)").run(user_id, restaurant_id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Internal server error" });
    }
  });

  app.get("/api/recent-views/:userId", (req, res) => {
    try {
      const views = db.prepare(`
        SELECT DISTINCT r.* FROM restaurants r
        JOIN recent_views rv ON r.id = rv.restaurant_id
        WHERE rv.user_id = ?
        ORDER BY rv.viewed_at DESC
        LIMIT 10
      `).all(req.params.userId);
      res.json(views);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Leaderboard & Badges ---
  app.get("/api/leaderboard", (req, res) => {
    try {
      const topUsers = db.prepare("SELECT id, name, points, total_reviews FROM users ORDER BY points DESC LIMIT 10").all();
      res.json(topUsers);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/badges/:userId", (req, res) => {
    try {
      const badges = db.prepare("SELECT * FROM badges WHERE user_id = ?").all(req.params.userId);
      res.json(badges);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Admin Analytics ---
  app.get("/api/admin/analytics", (req, res) => {
    try {
      const popularRestaurants = db.prepare("SELECT name, view_count FROM restaurants ORDER BY view_count DESC LIMIT 5").all();
      const topDishes = db.prepare("SELECT name, rating, rating_count FROM menu_items ORDER BY rating DESC, rating_count DESC LIMIT 5").all();
      const peakHours = [
        { hour: 12, count: 45 },
        { hour: 13, count: 52 },
        { hour: 19, count: 88 },
        { hour: 20, count: 95 },
        { hour: 21, count: 70 }
      ];
      res.json({ popularRestaurants, topDishes, peakHours });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get('/api/places/nearby', async (req, res) => {
    try {
      const { lat, lng, radius } = req.query as any;
      if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        const local = db.prepare('SELECT * FROM restaurants ORDER BY rating DESC LIMIT 20').all();
        return res.json(local);
      }
      const places = await searchNearbyRestaurants(process.env.GOOGLE_MAPS_API_KEY, Number(lat), Number(lng), Number(radius || 2500));
      const synced = places.map((p: any) => syncGooglePlaceToDb(p));
      res.json(synced);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch nearby places', details: e.message });
    }
  });

  app.post('/api/assistant/recommend', async (req, res) => {
    try {
      const { query } = req.body;
      const rows = db.prepare('SELECT * FROM restaurants ORDER BY rating DESC, review_count DESC LIMIT 10').all() as any[];
      const ranked = rows.slice(0, 3);
      const answer = `Top picks for "${query}":\n` + ranked.map((r, i) => `${i + 1}. ${r.name} ⭐${Number(r.rating || 0).toFixed(1)} — ${r.address}`).join("\n");
      res.json({ answer, results: ranked });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Assistant failed', details: e.message });
    }
  });

  app.post('/api/reviews/verified', async (req, res) => {
    const { user_id, restaurant_id, content, rating, reviewType, dishName } = req.body;
    try {
      const verification = await verifyWithGemini(req.body);
      if (!verification.approved) return res.status(400).json({ error: verification.reason || 'Proof check failed' });
      db.prepare('INSERT INTO reviews (user_id, restaurant_id, content, rating) VALUES (?, ?, ?, ?)').run(user_id, restaurant_id, content, rating);
      const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE restaurant_id = ?').get(restaurant_id) as any;
      db.prepare('UPDATE restaurants SET rating = ?, review_count = ? WHERE id = ?').run(stats.avg, stats.count, restaurant_id);
      const reward = reviewType === 'dish' ? 50 : 10;
      db.prepare('UPDATE users SET points = COALESCE(points, 0) + ?, total_reviews = COALESCE(total_reviews, 0) + 1 WHERE id = ?').run(reward, user_id);
      if (reviewType === 'dish' && dishName) {
        const menuItem = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? AND name LIKE ? LIMIT 1').get(restaurant_id, `%${dishName}%`) as any;
        if (menuItem) {
          db.prepare('INSERT INTO dish_ratings (user_id, menu_item_id, rating) VALUES (?, ?, ?)').run(user_id, menuItem.id, rating);
          const dishStats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM dish_ratings WHERE menu_item_id = ?').get(menuItem.id) as any;
          db.prepare('UPDATE menu_items SET rating = ?, rating_count = ? WHERE id = ?').run(dishStats.avg, dishStats.count, menuItem.id);
        }
      }
      res.json({ success: true, message: `${verification.reason} Reward credited: +${reward} points.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to save verified review', details: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
