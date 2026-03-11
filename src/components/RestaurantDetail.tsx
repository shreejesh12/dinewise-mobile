import React, { useState, useEffect } from 'react';
import { 
  Star, MapPin, Clock, Users, ChevronLeft, Info, 
  MessageSquare, Plus, Minus, Receipt, Calendar, 
  Sparkles, TrendingUp, ThumbsUp, Heart, XCircle,
  Flame, User, Share2, Map, Navigation, Filter,
  Calculator, Zap, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant, MenuItem, Review, cn } from '../types';
import { useAuth } from '../AuthContext';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '../services/api';

interface RestaurantDetailProps {
  id: number;
  onBack: () => void;
}

export default function RestaurantDetail({ id, onBack }: RestaurantDetailProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({ date: '', time: '', people: 2 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '', reviewType: 'place', dishName: '', evidenceType: 'bill_or_storefront', imageBase64: '', mimeType: '' });
  const [plannerForm, setPlannerForm] = useState({ budget: 1000, people: 2 });
  const [splitCount, setSplitCount] = useState(1);
  const [userBudget, setUserBudget] = useState<number | null>(null);

  useEffect(() => {
    fetchDetails();
    fetchSentiment();
    checkIfFavorited();
    addToRecentViews();
    // Get budget from local storage if set in budget planner
    const savedBudget = localStorage.getItem('dinewise_temp_budget');
    if (savedBudget) setUserBudget(parseInt(savedBudget));
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/restaurants/${id}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/favorites/${user.id}`);
      const favorites = await res.json();
      setIsFavorited(favorites.some((f: any) => f.id === id));
    } catch (e) {
      console.error(e);
    }
  };

  const addToRecentViews = async () => {
    if (!user) return;
    try {
      await fetch('/api/recent-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, restaurant_id: id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return alert('Please login to bookmark restaurants');
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, restaurant_id: id })
      });
      const json = await res.json();
      setIsFavorited(json.favorited);
    } catch (e) {
      console.error(e);
    }
  };

  const suggestOrder = () => {
    if (!data) return;
    const { budget, people } = plannerForm;
    const perPerson = budget / people;
    
    // Simple heuristic: pick a mix of categories within budget
    const suggested: MenuItem[] = [];
    let currentTotal = 0;
    
    const sortedMenu = [...data.menu].sort((a, b) => b.rating - a.rating);
    
    // Try to get one main course and one beverage/dessert per person
    for (let i = 0; i < people; i++) {
      const main = sortedMenu.find(m => m.category === 'Main Course' && !suggested.includes(m) && (currentTotal + m.price) <= budget);
      if (main) {
        suggested.push(main);
        currentTotal += main.price;
      }
      const side = sortedMenu.find(m => (m.category === 'Beverages' || m.category === 'Dessert') && !suggested.includes(m) && (currentTotal + m.price) <= budget);
      if (side) {
        suggested.push(side);
        currentTotal += side.price;
      }
    }

    setCart(suggested.map(item => ({ item, quantity: 1 })));
    setIsPlannerOpen(false);
    alert(`Suggested ${suggested.length} items within your budget!`);
  };

  const fetchSentiment = async () => {
    try {
      const res = await fetch(`/api/restaurants/${id}/sentiment`);
      const json = await res.json();
      setSentiment(json.summary);
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing?.quantity === 1) {
        return prev.filter(i => i.item.id !== itemId);
      }
      return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const calculateBill = () => {
    const subtotal = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
    const gst = (subtotal * (data?.gst_percent || 5)) / 100;
    const service = (subtotal * (data?.service_charge_percent || 5)) / 100;
    return { subtotal, gst, service, total: subtotal + gst + service };
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to book a table');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          restaurant_id: id,
          ...bookingForm
        })
      });
      if (res.ok) {
        alert('Reservation request sent!');
        setIsBookingOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to write a review');
    try {
      const res = await apiFetch('/api/reviews/verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          restaurant_id: id,
          restaurant_name: data.name,
          ...reviewForm
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Verification failed');
      alert(payload.message || 'Review submitted successfully!');
      setIsReviewModalOpen(false);
      setReviewForm({ rating: 5, content: '', reviewType: 'place', dishName: '', evidenceType: 'bill_or_storefront', imageBase64: '', mimeType: '' });
      fetchDetails();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Review verification failed');
    }
  };

  const handleDishRating = async (menuItemId: number, rating: number) => {
    if (!user) return alert('Please login to rate dishes');
    try {
      const res = await fetch('/api/dish-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          menu_item_id: menuItemId,
          rating
        })
      });
      if (res.ok) {
        fetchDetails(); // Refresh to show new rating
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!data) return <div>Restaurant not found</div>;

  const bill = calculateBill();

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-brand-primary transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5" /> Back to Discovery
        </button>
        <div className="flex gap-2">
          <button 
            onClick={toggleFavorite}
            className={cn(
              "p-3 rounded-2xl transition-all",
              isFavorited ? "bg-red-50 text-red-500" : "bg-white dark:bg-stone-800 text-stone-400 hover:text-red-500"
            )}
          >
            <Heart className={cn("w-6 h-6", isFavorited && "fill-current")} />
          </button>
          <button className="p-3 rounded-2xl bg-white dark:bg-stone-800 text-stone-400 hover:text-brand-primary transition-all">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & Menu */}
        <div className="lg:col-span-2 space-y-8">
          <section className="relative h-[350px] rounded-3xl overflow-hidden shadow-2xl">
            <img 
              src={data.image_url} 
              alt={data.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-8">
              <div className="text-white space-y-3 w-full">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="bg-brand-primary px-3 py-1 rounded-full text-xs font-bold">{data.category}</span>
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">{data.area}</span>
                      {data.value_score >= 4.5 && (
                        <span className="bg-emerald-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> Best Value
                        </span>
                      )}
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight">{data.name}</h1>
                    <div className="flex items-center gap-4 text-stone-300 text-sm">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {data.address}
                      </p>
                      {data.contact_number && (
                        <p className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> {data.contact_number}
                        </p>
                      )}
                      <p className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                        <Navigation className="w-4 h-4" /> 650m away • 6 min walk
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-brand-primary">Rs. {data.avg_spend || 800}</div>
                    <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Avg. Spend</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center group hover:border-brand-primary transition-colors">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-[var(--text-main)]">{data.rating.toFixed(1)}</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Rating</div>
            </div>
            <div className="card p-4 text-center group hover:border-brand-primary transition-colors">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-[var(--text-main)]">{data.current_crowd?.level || 'Moderate'}</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Crowd Level</div>
            </div>
            <div className="card p-4 text-center group hover:border-brand-primary transition-colors">
              <Clock className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-[var(--text-main)]">
                {data.opening_hours ? `${JSON.parse(data.opening_hours).open} - ${JSON.parse(data.opening_hours).close}` : '11 AM - 11 PM'}
              </div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Timings</div>
            </div>
            <div className="card p-4 text-center group hover:border-brand-primary transition-colors">
              <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-[var(--text-main)]">{data.price_range}</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Price Range</div>
            </div>
          </div>

          {/* AI Sentiment Summary */}
          <section className="bg-brand-secondary text-white p-8 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-brand-primary">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-xl font-bold">AI Review Summary</h2>
            </div>
            {sentiment ? (
              <div className="prose prose-invert max-w-none text-stone-200">
                <ReactMarkdown>{sentiment}</ReactMarkdown>
              </div>
            ) : (
              <div className="animate-pulse flex space-y-2 flex-col">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
              </div>
            )}
          </section>

          {/* Customer Reviews Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--text-main)]">Customer Reviews</h2>
              <button 
                onClick={() => user ? setIsReviewModalOpen(true) : alert('Please login to write a review')}
                className="bg-brand-primary text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-brand-primary/90 transition-colors"
              >
                Write a Review
              </button>
            </div>

            <div className="space-y-4">
              {data.reviews && data.reviews.length > 0 ? (
                data.reviews.map((review: Review) => (
                  <div key={review.id} className="card p-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                          {review.user_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-main)]">{review.user_name}</h4>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-stone-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                      {review.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 card border-dashed">
                  <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No reviews yet. Be the first to share your experience!</p>
                </div>
              )}
            </div>
          </section>

          {/* Menu */}
          <section className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--text-main)]">Menu Highlights</h2>
                <div className="flex gap-2">
                  {['All', 'Main Course', 'Beverages', 'Dessert'].map(cat => (
                    <button key={cat} className="px-4 py-2 rounded-full bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 text-[var(--text-main)]">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Dietary Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'Veg', icon: <div className="w-3 h-3 rounded-full border border-emerald-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div> },
                  { id: 'Vegan', icon: <Zap className="w-3 h-3 text-emerald-500" /> },
                  { id: 'Jain', icon: <Star className="w-3 h-3 text-orange-500" /> },
                  { id: 'Gluten-free', icon: <Info className="w-3 h-3 text-blue-500" /> },
                  { id: 'High protein', icon: <Flame className="w-3 h-3 text-red-500" /> }
                ].map(filter => (
                  <button 
                    key={filter.id}
                    onClick={() => setDietaryFilter(dietaryFilter === filter.id ? null : filter.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0",
                      dietaryFilter === filter.id 
                        ? "bg-brand-primary border-brand-primary text-white" 
                        : "bg-white dark:bg-stone-800 border-[var(--border-color)] text-stone-500 hover:border-brand-primary"
                    )}
                  >
                    {filter.icon}
                    {filter.id}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.menu
                .filter((item: MenuItem) => !dietaryFilter || (item.dietary_info && JSON.parse(item.dietary_info).includes(dietaryFilter)))
                .map((item: MenuItem) => (
                <div key={item.id} className="card p-6 flex items-center justify-between group relative overflow-hidden">
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg text-[var(--text-main)]">{item.name}</h4>
                      {item.spicy_level === 'Very Spicy' && <Flame className="w-4 h-4 text-red-500 fill-current" />}
                      {item.dietary_info && JSON.parse(item.dietary_info).includes('Veg') && (
                        <div className="w-3 h-3 rounded-full border border-emerald-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div>
                      )}
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 text-sm">{item.description}</p>
                    
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-stone-400">
                        <Users className="w-3 h-3" /> Serves {item.portion_size === 3 ? 'Sharing' : item.portion_size}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded",
                        item.spicy_level === 'Mild' ? "bg-emerald-50 text-emerald-600" :
                        item.spicy_level === 'Medium' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                      )}>
                        {item.spicy_level}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-brand-primary">Rs. {item.price}</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-stone-400" /> {item.rating.toFixed(1)} ({item.rating_count})
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDishRating(item.id, star);
                              }}
                              className="group/star"
                            >
                              <Star 
                                className={`w-3 h-3 transition-colors ${star <= Math.round(item.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300 group-hover/star:text-yellow-400'}`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    {cart.find(i => i.item.id === item.id) ? (
                      <div className="flex items-center gap-3 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-[var(--card-bg)] rounded-lg shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 text-[var(--text-main)]">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-4 text-center text-[var(--text-main)]">{cart.find(i => i.item.id === item.id)?.quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary/90">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)}
                        className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-brand-primary/90 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tags & Best For */}
          <section className="card p-8 space-y-6">
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Best For...</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Studying', 'Dates', 'Friends', 'Work'].map(tag => {
                const tagData = data.tags.find((t: any) => t.tag === tag);
                const totalVotes = data.tags.reduce((sum: number, t: any) => sum + t.votes, 0) || 1;
                const percentage = tagData ? Math.round((tagData.votes / totalVotes) * 100) : 0;
                
                return (
                  <div key={tag} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-[var(--text-main)]">{tag}</span>
                      <span className="text-stone-400">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-brand-primary"
                      />
                    </div>
                    <button className="w-full text-[10px] font-bold uppercase text-stone-400 hover:text-brand-primary transition-colors">
                      Vote
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Bill Estimator & Booking */}
        <div className="space-y-6">
          {/* Bill Estimator */}
          <div className="card p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between text-[var(--text-main)]">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                <h2 className="text-xl font-bold">Smart Bill Estimator</h2>
              </div>
              <button 
                onClick={() => setIsPlannerOpen(true)}
                className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors"
                title="Smart Order Planner"
              >
                <Calculator className="w-5 h-5" />
              </button>
            </div>

            {cart.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                  {cart.map(({ item, quantity }) => (
                    <div key={item.id} className="group space-y-1">
                      <div className="flex justify-between text-sm">
                        <div className="flex gap-2">
                          <span className="text-stone-400 font-mono">{quantity}x</span>
                          <span className="font-medium text-[var(--text-main)]">{item.name}</span>
                        </div>
                        <span className="font-mono text-[var(--text-main)]">Rs. {item.price * quantity}</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: splitCount }).map((_, idx) => (
                          <div key={idx} className="h-1 flex-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary/30" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                  <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {bill.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                    <span>GST ({data.gst_percent}%)</span>
                    <span className="font-mono">Rs. {bill.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                    <span>Service Charge ({data.service_charge_percent}%)</span>
                    <span className="font-mono">Rs. {bill.service.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 text-[var(--text-main)]">
                    <span>Total Payable</span>
                    <span className="text-brand-primary font-mono">Rs. {bill.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bill Splitting */}
                <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase text-stone-500">Split Bill</label>
                      <Share2 className="w-3 h-3 text-stone-400" />
                    </div>
                    <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded-lg border border-[var(--border-color)]">
                      <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="text-stone-400 hover:text-brand-primary"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold w-4 text-center text-[var(--text-main)]">{splitCount}</span>
                      <button onClick={() => setSplitCount(splitCount + 1)} className="text-stone-400 hover:text-brand-primary"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {splitCount > 1 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-[var(--border-color)]">
                        <span className="text-sm text-stone-600 dark:text-stone-400">Per Person</span>
                        <span className="font-mono font-bold text-brand-primary">Rs. {(bill.total / splitCount).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-center italic">
                        Items are visually split across {splitCount} people above
                      </p>
                    </div>
                  )}
                </div>

                {/* Budget Warning */}
                {userBudget && bill.total > userBudget && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3"
                  >
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Budget Warning</p>
                      <p className="text-[10px] text-red-600">Total exceeds your planned budget of Rs. {userBudget}</p>
                    </div>
                  </motion.div>
                )}

                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
                  <Info className="w-5 h-5 text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700">
                    This is an estimate. Actual bill may vary slightly based on specific restaurant policies.
                  </p>
                </div>

                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" /> Book a Table
                </button>
              </div>
            ) : (
              <div className="text-center py-10 space-y-4">
                <div className="bg-stone-50 dark:bg-stone-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="w-8 h-8 text-stone-300" />
                </div>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Add items from the menu to estimate your bill</p>
              </div>
            )}
          </div>

          {/* Crowd Status Reporting */}
          <div className="bg-brand-secondary text-white p-6 rounded-3xl space-y-4">
            <h3 className="font-bold">How's the crowd?</h3>
            <p className="text-stone-400 text-xs">Help others by reporting the current status</p>
            <div className="grid grid-cols-1 gap-2">
              {['Not crowded', 'Moderately crowded', 'Very crowded'].map(level => (
                <button 
                  key={level}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Clock className="w-3 h-3" /> Best Time to Visit
              </div>
              <p className="text-sm font-medium">Weekdays, 4 PM - 6 PM</p>
              <p className="text-[10px] text-stone-500">Based on historical crowd trends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Order Planner Modal */}
      <AnimatePresence>
        {isPlannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlannerOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--card-bg)] w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-brand-primary" />
                  <h2 className="text-2xl font-bold text-[var(--text-main)]">Smart Order Planner</h2>
                </div>
                <button onClick={() => setIsPlannerOpen(false)} className="text-stone-400 hover:text-brand-primary">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <p className="text-stone-500 text-sm">
                Enter your budget and number of people, and we'll suggest the best combination of dishes for you!
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Total Budget (Rs.)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={plannerForm.budget}
                    onChange={e => setPlannerForm({...plannerForm, budget: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Number of People</label>
                  <div className="flex items-center gap-4 bg-stone-50 dark:bg-stone-800 p-2 rounded-xl border border-[var(--border-color)]">
                    <button onClick={() => setPlannerForm({...plannerForm, people: Math.max(1, plannerForm.people - 1)})} className="p-2 bg-white dark:bg-stone-700 rounded-lg shadow-sm"><Minus className="w-4 h-4" /></button>
                    <span className="flex-1 text-center font-bold">{plannerForm.people}</span>
                    <button onClick={() => setPlannerForm({...plannerForm, people: plannerForm.people + 1})} className="p-2 bg-white dark:bg-stone-700 rounded-lg shadow-sm"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Per Person Budget</span>
                    <span className="font-bold text-brand-primary">Rs. {Math.round(plannerForm.budget / plannerForm.people)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={suggestOrder}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" /> Generate Suggestion
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--card-bg)] w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-main)]">Reserve a Table</h2>
                <button onClick={() => setIsBookingOpen(false)} className="text-stone-400 hover:text-brand-primary">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={bookingForm.date}
                    onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={bookingForm.time}
                    onChange={e => setBookingForm({...bookingForm, time: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Number of People</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none"
                    value={bookingForm.people}
                    onChange={e => setBookingForm({...bookingForm, people: parseInt(e.target.value)})}
                  >
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="bg-[var(--card-bg)]">{n} People</option>)}
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-colors"
                >
                  Confirm Reservation
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--card-bg)] w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-main)]">Write a Review</h2>
                <button onClick={() => setIsReviewModalOpen(false)} className="text-stone-400 hover:text-brand-primary">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-stone-500">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-1"
                      >
                        <Star 
                          className={`w-8 h-8 ${star <= reviewForm.rating ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-500">Review type</label>
                    <select className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" value={reviewForm.reviewType} onChange={e => setReviewForm({...reviewForm, reviewType: e.target.value, dishName: e.target.value === 'dish' ? reviewForm.dishName : ''})}>
                      <option value="place">Place review (+10)</option>
                      <option value="dish">Dish rating (+50)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-500">Evidence</label>
                    <select className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" value={reviewForm.evidenceType} onChange={e => setReviewForm({...reviewForm, evidenceType: e.target.value})}>
                      <option value="bill_or_storefront">Bill or storefront</option>
                      <option value="bill">Bill</option>
                      <option value="storefront">Storefront</option>
                    </select>
                  </div>
                </div>
                {reviewForm.reviewType === 'dish' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-500">Dish name on bill</label>
                    <input className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" value={reviewForm.dishName} onChange={e => setReviewForm({...reviewForm, dishName: e.target.value})} placeholder="Example: Paneer Tikka Pizza" required />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Your review</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Share your experience..."
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none resize-none"
                    value={reviewForm.content}
                    onChange={e => setReviewForm({...reviewForm, content: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-stone-500">Upload bill / restaurant image</label>
                  <input type="file" accept="image/*" className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const result = String(reader.result || ''); const base64 = result.includes(',') ? result.split(',')[1] : result; setReviewForm(prev => ({ ...prev, imageBase64: base64, mimeType: file.type })); }; reader.readAsDataURL(file); }} />
                  <p className="text-xs text-stone-400">Gemini image verification works when the backend has a GEMINI_API_KEY. Otherwise the app can still store the review using the normal flow.</p>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
