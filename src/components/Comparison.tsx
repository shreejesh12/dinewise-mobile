import React, { useState, useEffect } from 'react';
import { Restaurant } from '../types';
import { Star, MapPin, TrendingUp, Users, Check, X, Scale } from 'lucide-react';
import { motion } from 'motion/react';

export default function Comparison() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => {
        setRestaurants(data);
        setIsLoading(false);
      });
  }, []);

  const toggleSelect = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(i => i !== id));
    } else if (selected.length < 2) {
      setSelected([...selected, id]);
    }
  };

  const r1 = restaurants.find(r => r.id === selected[0]);
  const r2 = restaurants.find(r => r.id === selected[1]);

  return (
    <div className="space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-[var(--text-main)]">Restaurant Comparison</h1>
        <p className="text-stone-500 dark:text-stone-400">Select two restaurants to compare them side-by-side</p>
      </div>

      {/* Selection Grid */}
      <div className="flex flex-wrap gap-4 justify-center">
        {restaurants.map(r => (
          <button
            key={r.id}
            onClick={() => toggleSelect(r.id)}
            className={`px-6 py-3 rounded-2xl border-2 transition-all flex items-center gap-2 font-bold ${
              selected.includes(r.id) 
                ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                : 'border-[var(--border-color)] bg-[var(--card-bg)] text-stone-600 dark:text-stone-400 hover:border-brand-primary'
            }`}
          >
            {selected.includes(r.id) && <Check className="w-4 h-4" />}
            {r.name}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      {selected.length === 2 && r1 && r2 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card shadow-xl overflow-hidden"
        >
          <div className="grid grid-cols-3 divide-x divide-[var(--border-color)]">
            <div className="p-8 bg-stone-50 dark:bg-stone-800"></div>
            <div className="p-8 text-center space-y-4">
              <img src={r1.image_url} alt={r1.name} className="w-24 h-24 rounded-2xl mx-auto object-cover" referrerPolicy="no-referrer" />
              <h3 className="text-xl font-bold text-[var(--text-main)]">{r1.name}</h3>
            </div>
            <div className="p-8 text-center space-y-4">
              <img src={r2.image_url} alt={r2.name} className="w-24 h-24 rounded-2xl mx-auto object-cover" referrerPolicy="no-referrer" />
              <h3 className="text-xl font-bold text-[var(--text-main)]">{r2.name}</h3>
            </div>

            {/* Rows */}
            {[
              { label: 'Rating', icon: <Star className="w-4 h-4" />, val1: r1.rating.toFixed(1), val2: r2.rating.toFixed(1) },
              { label: 'Category', icon: <TrendingUp className="w-4 h-4" />, val1: r1.category, val2: r2.category },
              { label: 'Area', icon: <MapPin className="w-4 h-4" />, val1: r1.area, val2: r2.area },
              { label: 'Price Range', icon: <TrendingUp className="w-4 h-4" />, val1: r1.price_range, val2: r2.price_range },
              { label: 'Crowd Level', icon: <Users className="w-4 h-4" />, val1: r1.current_crowd?.level || 'Moderate', val2: r2.current_crowd?.level || 'Moderate' },
            ].map((row, i) => (
              <React.Fragment key={i}>
                <div className="p-6 bg-stone-50 dark:bg-stone-800 flex items-center gap-2 font-bold text-stone-500 dark:text-stone-400 text-sm uppercase tracking-wider">
                  {row.icon} {row.label}
                </div>
                <div className="p-6 text-center font-medium text-[var(--text-main)] border-t border-[var(--border-color)]">{row.val1}</div>
                <div className="p-6 text-center font-medium text-[var(--text-main)] border-t border-[var(--border-color)]">{row.val2}</div>
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-[var(--border-color)] rounded-3xl">
          <Scale className="w-12 h-12 mb-4" />
          <p>Please select exactly 2 restaurants to compare</p>
        </div>
      )}
    </div>
  );
}
