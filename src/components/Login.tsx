import {
  loginWithFirebase,
  registerWithFirebase,
} from '../services/firebaseAuthService';
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Mail, Lock, User as UserIcon, ArrowRight, MapPin, Sparkles, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    const data = isLogin
      ? await loginWithFirebase(email, password)
      : await registerWithFirebase(name, email, password);

    login(data.token, data.user);
  } catch (err: any) {
    setError(err?.message || 'Authentication failed');
  }
};

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg-main">
      <section className="hidden lg:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1600"
          alt="Fine dining"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-brand-primary/35" />
        <div className="relative z-10 h-full p-12 flex flex-col justify-between text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider w-fit">
            <MapPin className="w-4 h-4 text-brand-primary" /> Santacruz • Vile Parle • Nearby live discovery
          </div>
          <div className="space-y-6 max-w-xl">
            <h1 className="text-6xl font-bold leading-tight">Discover real food places around you.</h1>
            <p className="text-stone-200 text-lg">
              Login to search nearby places, sync Google restaurant data, save trusted reviews, and unlock explorer rewards.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Live location', 'Find food spots near your current location'],
                ['Trusted reviews', 'Attach bill / storefront proof before submitting'],
                ['AI assistant', 'Ask for the best dishes around you'],
                ['Firebase ready', 'Mirror users and reviews in real time'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10">
                  <div className="font-bold mb-1">{title}</div>
                  <div className="text-sm text-stone-300">{text}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-stone-200"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Real-data workflow works best after adding Google Maps, Gemini, and Firebase keys.</div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 md:p-8">
        <div className="card w-full max-w-md p-8 shadow-xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-full font-bold text-sm"><Sparkles className="w-4 h-4" /> DineWise Live</div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="text-stone-500 dark:text-stone-400">{isLogin ? 'Sign in to continue exploring nearby food places.' : 'Register once to save reviews, rewards, and profile data.'}</p>
          </div>

          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-stone-500">Full name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input type="text" required placeholder="John Doe" className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input type="email" required placeholder="you@example.com" className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-stone-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input type="password" required placeholder="••••••••" className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20">
              {isLogin ? 'Login' : 'Sign up'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-stone-500 hover:text-brand-primary font-medium transition-colors">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
