import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, MessageSquare, Award, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';

interface LeaderboardUser {
  id: number;
  name: string;
  points: number;
  total_reviews: number;
  rank: number;
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [lbRes, badgeRes] = await Promise.all([
        fetch('/api/leaderboard'),
        user ? fetch(`/api/badges/${user.id}`) : Promise.resolve({ json: () => [] })
      ]);
      
      const lbData = await lbRes.json();
      setLeaderboard(lbData);
      
      if (user) {
        const bData = await badgeRes.json();
        setBadges(bData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <section className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-full font-bold text-sm"
        >
          <Trophy className="w-4 h-4" /> Community Leaderboard
        </motion.div>
        <h1 className="text-4xl font-bold text-[var(--text-main)]">Top Food Explorers</h1>
        <p className="text-stone-500 max-w-lg mx-auto">
          Join the community of food lovers in Mumbai. Review restaurants, earn points, and unlock exclusive badges!
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[var(--text-main)]">Rankings</h2>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Updated Hourly</span>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {leaderboard.map((u, i) => (
                <motion.div 
                  key={u.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-6 flex items-center gap-6 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${u.id === user?.id ? 'bg-brand-primary/5' : ''}`}
                >
                  <div className="w-10 flex flex-col items-center justify-center">
                    {i === 0 ? <Trophy className="w-6 h-6 text-yellow-500" /> :
                     i === 1 ? <Medal className="w-6 h-6 text-stone-400" /> :
                     i === 2 ? <Medal className="w-6 h-6 text-amber-600" /> :
                     <span className="text-lg font-bold text-stone-300">#{i + 1}</span>}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-500 font-bold text-xl">
                      {u.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                        {u.name}
                        {u.id === user?.id && <span className="text-[10px] bg-brand-primary text-white px-2 py-0.5 rounded-full">You</span>}
                      </h4>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {u.total_reviews} Reviews
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-primary">{u.points}</div>
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* User Stats & Badges */}
        <section className="space-y-6">
          {user && (
            <div className="card p-8 shadow-xl space-y-8 bg-brand-secondary text-white border-none">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Your Progress</h2>
                <p className="text-stone-400 text-sm">Keep exploring to unlock more!</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <div className="text-2xl font-bold text-brand-primary">{user.points || 0}</div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Total Points</div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <div className="text-2xl font-bold text-brand-primary">{badges.length}</div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Badges</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Your Badges</h3>
                <div className="grid grid-cols-3 gap-3">
                  {badges.map(b => (
                    <div key={b.id} className="group relative">
                      <div className="aspect-square rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-brand-primary/20 transition-all cursor-help">
                        <Award className="w-8 h-8 text-brand-primary" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-stone-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                        <p className="font-bold">{b.name}</p>
                        <p className="text-stone-400">{b.description}</p>
                      </div>
                    </div>
                  ))}
                  {badges.length === 0 && (
                    <div className="col-span-3 py-8 text-center border-2 border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-stone-500">No badges yet. Write a review to start!</p>
                    </div>
                  )}
                </div>
              </div>

              <button className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> View All Badges
              </button>
            </div>
          )}

          <div className="card p-8 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-[var(--text-main)]">How to earn points?</h3>
            <div className="space-y-4">
              {[
                { label: 'Write a Review', points: '+50', icon: <MessageSquare className="w-4 h-4" /> },
                { label: 'Add a Photo', points: '+30', icon: <Award className="w-4 h-4" /> },
                { label: 'Rate a Dish', points: '+10', icon: <Star className="w-4 h-4" /> },
                { label: 'Book a Table', points: '+100', icon: <ChevronRight className="w-4 h-4" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-stone-700 rounded-lg text-brand-primary shadow-sm">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-main)]">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-brand-primary">{item.points}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
