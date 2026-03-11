import React, { useMemo, useState } from 'react';
import { MapPin, Phone, Crown, TicketPercent, Save, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const initial = useMemo(() => {
    const saved = localStorage.getItem('dinewise_profile');
    return saved ? JSON.parse(saved) : { phone: '', address: '', plan: 'Free' };
  }, []);
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState(false);

  const coupons = [
    { code: 'WELCOME10', text: '10% off on first verified review reward redemption' },
    { code: 'NIGHTBITE', text: 'Late-night quick-bite discovery bonus' },
    { code: 'EXPLORE50', text: 'Extra points weekend campaign' },
  ];

  const saveProfile = () => {
    localStorage.setItem('dinewise_profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <section className="rounded-3xl overflow-hidden relative min-h-[240px] text-white">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=1600"
          alt="Dining background"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
        <div className="relative p-8 md:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-brand-primary" /> Verified Food Explorer
          </div>
          <h1 className="text-4xl font-bold">{user?.name || 'Your profile'}</h1>
          <p className="text-stone-200 max-w-2xl">
            Save your identity once, unlock premium dining tools, and build a trustworthy review history with bill/storefront verification.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Account details</h2>
            {saved && <span className="text-sm text-emerald-600 font-semibold">Saved</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500">Name</label>
              <input value={user?.name || ''} disabled className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-stone-50 dark:bg-stone-900 text-[var(--text-main)]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500">Email</label>
              <input value={user?.email || ''} disabled className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-stone-50 dark:bg-stone-900 text-[var(--text-main)]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
              <input value={profile.phone} onChange={(e)=>setProfile({...profile, phone:e.target.value})} placeholder="Enter mobile number" className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</label>
              <input value={profile.address} onChange={(e)=>setProfile({...profile, address:e.target.value})} placeholder="Home / hostel / work area" className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)]" />
            </div>
          </div>

          <button onClick={saveProfile} className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold">
            <Save className="w-4 h-4" /> Save profile
          </button>
        </section>

        <section className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 text-[var(--text-main)]">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-xl">Premium plans</h3>
            </div>
            {[['Free','Basic discovery, manual reviews'],['Gold','Priority AI assistant, crowd alerts'],['Platinum','Verified reviewer badge, premium insights']].map(([plan,desc]) => (
              <button key={plan} onClick={()=>setProfile({...profile, plan})} className={`w-full text-left p-4 rounded-2xl border ${profile.plan===plan?'border-brand-primary bg-brand-primary/5':'border-[var(--border-color)]'}`}>
                <div className="font-bold text-[var(--text-main)]">{plan}</div>
                <div className="text-sm text-stone-500">{desc}</div>
              </button>
            ))}
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 text-[var(--text-main)]">
              <TicketPercent className="w-5 h-5 text-brand-primary" />
              <h3 className="font-bold text-xl">Coupons</h3>
            </div>
            {coupons.map((coupon) => (
              <div key={coupon.code} className="p-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-stone-50 dark:bg-stone-900/50">
                <div className="font-mono font-bold text-brand-primary">{coupon.code}</div>
                <div className="text-sm text-stone-500">{coupon.text}</div>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3 bg-brand-secondary text-white border-none">
            <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-brand-primary" /><h3 className="font-bold text-xl">Rewards snapshot</h3></div>
            <p className="text-stone-300 text-sm">+10 points for verified place reviews, +50 points for verified dish ratings with bill proof.</p>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 rounded-full px-3 py-1"><Sparkles className="w-4 h-4 text-brand-primary" /> Food Explorer Mode enabled</div>
          </div>
        </section>
      </div>
    </div>
  );
}
