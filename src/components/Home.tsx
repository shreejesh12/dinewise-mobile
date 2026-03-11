import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Navigation, Sparkles, Users, Star, Clock, ChevronRight, Filter } from 'lucide-react';
import { Restaurant, cn } from '../types';
import { apiFetch } from '../services/api';

interface HomeProps {
  onSelectRestaurant: (id: number) => void;
}

export default function Home({ onSelectRestaurant }: HomeProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Using saved discovery data');
  const [assistantQuery, setAssistantQuery] = useState('Best biryani near me');
  const [assistantReply, setAssistantReply] = useState('');

  useEffect(() => { fetchRestaurants(); }, [area, category]);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      const text = `${r.name} ${r.address} ${r.area} ${r.category}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [restaurants, search]);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (area) params.append('area', area);
      if (category) params.append('category', category);
      const res = await apiFetch(`/api/restaurants?${params.toString()}`);
      const data = await res.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const useLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported on this device');
      return;
    }
    setLocationStatus('Getting your live location…');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const res = await apiFetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=2500`);
        const data = await res.json();
        setRestaurants(Array.isArray(data) ? data : []);
        setLocationStatus('Showing live nearby places from Google Places / synced database');
      } catch (error) {
        console.error(error);
        setLocationStatus('Could not fetch live places. Check API key / backend.');
      }
    }, () => setLocationStatus('Location permission denied.')); 
  };

  const askAssistant = async () => {
    try {
      const res = await apiFetch('/api/assistant/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: assistantQuery }),
      });
      const data = await res.json();
      setAssistantReply(data.answer || 'No recommendation available right now.');
    } catch (e) {
      console.error(e);
      setAssistantReply('Assistant could not respond right now.');
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <section className="relative rounded-3xl overflow-hidden min-h-[360px] text-white">
        <img
          src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1600"
          alt="Food background"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/35" />
        <div className="relative z-10 p-8 md:p-12 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Navigation className="w-4 h-4 text-brand-primary" /> Live location powered discovery
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Find real food places around you</h1>
          <p className="text-stone-200 text-lg">
            Use your current location to discover cafes, restaurants, hotels, and fast food spots. Google place data stays lightweight, while reviews and rewards stay tied to your signed-in profile.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <button onClick={useLiveLocation} className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-bold inline-flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" /> Use my live location
            </button>
            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-4 text-sm text-stone-100 border border-white/15">
              {locationStatus}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-4">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-primary" /><h2 className="text-2xl font-bold text-[var(--text-main)]">AI Food Assistant</h2></div>
          <p className="text-stone-500">Ask things like: “Where can I get best biryani near me?”</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input value={assistantQuery} onChange={(e)=>setAssistantQuery(e.target.value)} className="flex-1 p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" />
            <button onClick={askAssistant} className="bg-brand-primary text-white px-5 py-3 rounded-xl font-bold">Ask</button>
          </div>
          {assistantReply && <div className="rounded-2xl bg-brand-primary/5 border border-brand-primary/20 p-4 text-[var(--text-main)] whitespace-pre-wrap">{assistantReply}</div>}
        </div>
        <div className="card p-6 space-y-4 bg-brand-secondary text-white border-none">
          <h3 className="text-xl font-bold">Trust + rewards</h3>
          <ul className="space-y-3 text-stone-200 text-sm">
            <li>+10 points for verified place reviews</li>
            <li>+50 points for verified dish ratings with bill proof</li>
            <li>Bill / storefront proof can be reviewed with AI verification when backend keys are configured</li>
            <li>Firebase sync can mirror users and reviews in real time</li>
          </ul>
        </div>
      </section>

      <section className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search eating places, dishes, areas…" className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-main)]" />
        </div>
        <div className="flex items-center gap-2 bg-[var(--card-bg)] px-4 py-3 rounded-2xl border border-[var(--border-color)]">
          <MapPin className="w-4 h-4 text-stone-500" />
          <select value={area} onChange={(e)=>setArea(e.target.value)} className="bg-transparent text-[var(--text-main)] outline-none">
            <option value="">All areas</option>
            <option value="Santacruz">Santacruz</option>
            <option value="Vile Parle">Vile Parle</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-[var(--card-bg)] px-4 py-3 rounded-2xl border border-[var(--border-color)]">
          <Filter className="w-4 h-4 text-stone-500" />
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className="bg-transparent text-[var(--text-main)] outline-none">
            <option value="">All types</option>
            <option value="Cafe">Cafe</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Fast Food">Fast Food</option>
            <option value="Hotel">Hotel</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[360px] rounded-3xl bg-stone-200 dark:bg-stone-800 animate-pulse" />) : filtered.map((restaurant) => (
          <button key={restaurant.id} onClick={() => onSelectRestaurant(restaurant.id)} className="text-left group card overflow-hidden hover:shadow-xl transition-all">
            <div className="relative h-52 overflow-hidden">
              <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-[var(--card-bg)]/90 rounded-full text-xs font-bold text-[var(--text-main)]">{restaurant.category}</span>
                <span className="px-3 py-1 bg-brand-primary text-white rounded-full text-xs font-bold">{restaurant.area}</span>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <h3 className="text-xl font-bold text-[var(--text-main)] group-hover:text-brand-primary">{restaurant.name}</h3>
              <p className="text-sm text-stone-500 flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5" /> {restaurant.address}</p>
              <div className="flex items-center justify-between text-sm text-stone-500">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {Number(restaurant.rating || 0).toFixed(1)}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {restaurant.review_count || 0} reviews</span>
                <span className="font-mono font-bold text-[var(--text-main)]">{restaurant.price_range}</span>
              </div>
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className={cn('text-xs font-bold uppercase tracking-wider', restaurant.current_crowd?.level?.toLowerCase().includes('very') ? 'text-red-500' : 'text-emerald-600')}>
                  <Clock className="w-3 h-3 inline mr-1" /> {restaurant.current_crowd?.level || 'Live status soon'}
                </span>
                <span className="text-brand-primary font-bold text-sm inline-flex items-center gap-1">Details <ChevronRight className="w-4 h-4" /></span>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
