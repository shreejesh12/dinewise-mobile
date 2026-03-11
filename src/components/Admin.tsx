import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Reservation, Restaurant } from '../types';
import { 
  CheckCircle, XCircle, Clock, Calendar, 
  Users, Utensils, Plus, Trash2, Edit, 
  TrendingUp, BarChart3, PieChart as PieChartIcon,
  Activity, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

export default function Admin() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '', category: 'Cafe', address: '', area: 'Santacruz', price_range: '$$', image_url: 'https://picsum.photos/seed/new/800/600'
  });

  useEffect(() => {
    fetchReservations();
    fetchRestaurants();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRestaurants = async () => {
    const res = await fetch('/api/restaurants');
    const data = await res.json();
    setRestaurants(data);
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations/user/1'); // In a real app, this would be an admin endpoint
      const data = await res.json();
      setReservations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRestaurant)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchRestaurants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRestaurant = async (id: number) => {
    if (!confirm('Are you sure you want to delete this restaurant? All associated data (menu, reviews, reservations) will be removed.')) return;
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRestaurants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState('');

  const handleSync = async (area: 'Santacruz' | 'Vile Parle') => {
    if (!googleApiKey) return alert('Please enter your Google Maps API Key');
    setIsSyncing(true);
    try {
      const coords = area === 'Santacruz' ? { lat: 19.0800, lng: 72.8410 } : { lat: 19.1000, lng: 72.8430 };
      const res = await fetch('/api/admin/sync-google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: googleApiKey,
          lat: coords.lat,
          lng: coords.lng,
          areaName: area
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully added ${data.added} new places in ${area}!`);
        fetchRestaurants();
      }
    } catch (e) {
      console.error(e);
      alert('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Are you sure? This will delete ALL data including users, reviews, and restaurants.')) return;
    try {
      const res = await fetch('/api/admin/reset-db', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert('Reset failed');
    }
  };

  if (user?.role !== 'admin' && user?.id !== 1) { // Simple check for demo
    return <div className="p-20 text-center">Access Denied. Admin only.</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[var(--text-main)]">Admin Dashboard</h1>
          <p className="text-stone-500 dark:text-stone-400">Manage restaurant data and reservations</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-[var(--card-bg)] px-4 py-2 rounded-2xl border border-[var(--border-color)]">
            <input 
              type="password" 
              placeholder="Google Maps API Key"
              className="bg-transparent text-sm outline-none w-40"
              value={googleApiKey}
              onChange={e => setGoogleApiKey(e.target.value)}
            />
            <button 
              onClick={() => handleSync('Santacruz')}
              disabled={isSyncing}
              className="text-xs font-bold text-brand-primary hover:underline disabled:opacity-50"
            >
              Sync Santacruz
            </button>
            <button 
              onClick={() => handleSync('Vile Parle')}
              disabled={isSyncing}
              className="text-xs font-bold text-brand-primary hover:underline disabled:opacity-50"
            >
              Sync Vile Parle
            </button>
            <button 
              onClick={handleResetDb}
              className="text-xs font-bold text-red-500 hover:underline ml-4"
            >
              Reset Database
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Restaurant
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6 space-y-2 border-l-4 border-brand-primary">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Total Views</span>
              <Activity className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="text-3xl font-bold text-[var(--text-main)]">
              {analytics.popularRestaurants.reduce((acc: number, r: any) => acc + r.view_count, 0)}
            </div>
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% from last week
            </div>
          </div>
          <div className="card p-6 space-y-2 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Active Bookings</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-[var(--text-main)]">{reservations.length}</div>
            <div className="text-[10px] text-stone-400 font-bold">Across all restaurants</div>
          </div>
          <div className="card p-6 space-y-2 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Avg. Rating</span>
              <Star className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-[var(--text-main)]">4.6</div>
            <div className="text-[10px] text-stone-400 font-bold">Community average</div>
          </div>
          <div className="card p-6 space-y-2 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Top Dish</span>
              <Utensils className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-[var(--text-main)] truncate">{analytics.topDishes[0]?.name || 'N/A'}</div>
            <div className="text-[10px] text-stone-400 font-bold">Most ordered this month</div>
          </div>
        </section>
      )}

      {/* Charts Section */}
      {analytics && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-primary" /> Popular Restaurants
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.popularRestaurants}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(156, 213, 255, 0.1)' }}
                  />
                  <Bar dataKey="view_count" fill="#9CD5FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-brand-primary" /> Peak Hours Distribution
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.peakHours}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="hour"
                  >
                    {analytics.peakHours.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#9CD5FF', '#005461', '#F7F8F0', '#stone-200'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              {analytics.peakHours.slice(0, 4).map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#9CD5FF', '#005461', '#F7F8F0', '#stone-200'][i % 4] }} />
                  <span className="text-xs text-stone-500 font-medium">{h.hour}:00</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="card shadow-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
              <Calendar className="w-5 h-5 text-brand-primary" /> Recent Reservations
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Restaurant</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">{res.restaurant_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-[var(--text-main)]">{res.date}</span>
                        <span className="text-[10px] text-stone-400">{res.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        res.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card shadow-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
              <Utensils className="w-5 h-5 text-brand-primary" /> Manage Restaurants
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Area</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {restaurants.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">{res.name}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-main)]">{res.area}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-main)]">{res.category}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 text-stone-400 hover:text-brand-primary rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRestaurant(res.id)}
                          className="p-2 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add Restaurant Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--card-bg)] w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-main)]">Add New Restaurant</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-brand-primary">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddRestaurant} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={newRestaurant.name}
                    onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-500">Category</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                      value={newRestaurant.category}
                      onChange={e => setNewRestaurant({...newRestaurant, category: e.target.value})}
                    >
                      <option className="bg-[var(--card-bg)]">Cafe</option>
                      <option className="bg-[var(--card-bg)]">Restaurant</option>
                      <option className="bg-[var(--card-bg)]">Fast Food</option>
                      <option className="bg-[var(--card-bg)]">Hotel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-500">Area</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                      value={newRestaurant.area}
                      onChange={e => setNewRestaurant({...newRestaurant, area: e.target.value})}
                    >
                      <option className="bg-[var(--card-bg)]">Santacruz</option>
                      <option className="bg-[var(--card-bg)]">Vile Parle</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Address</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={newRestaurant.address}
                    onChange={e => setNewRestaurant({...newRestaurant, address: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-colors"
                >
                  Save Restaurant
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
