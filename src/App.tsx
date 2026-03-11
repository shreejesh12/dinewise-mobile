import React, { useEffect, useState } from 'react';
import { Home as HomeIcon, LogOut, Moon, Scale, Sun, Trophy, User, UtensilsCrossed, LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Home from './components/Home';
import RestaurantDetail from './components/RestaurantDetail';
import Login from './components/Login';
import Comparison from './components/Comparison';
import Admin from './components/Admin';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('dinewise_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('dinewise_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  if (isLoading) return null;
  if (!user) return <Login />;

  const renderContent = () => {
    if (selectedRestaurantId) return <RestaurantDetail id={selectedRestaurantId} onBack={() => setSelectedRestaurantId(null)} />;
    switch (activeTab) {
      case 'home': return <Home onSelectRestaurant={setSelectedRestaurantId} />;
      case 'compare': return <Comparison />;
      case 'leaderboard': return <Leaderboard />;
      case 'profile': return <Profile />;
      case 'admin': return <Admin />;
      default: return <Home onSelectRestaurant={setSelectedRestaurantId} />;
    }
  };

  const navItems = [
    { id: 'home', label: 'Discovery', icon: HomeIcon },
    { id: 'compare', label: 'Compare', icon: Scale },
    { id: 'leaderboard', label: 'Rewards', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];
  if (user?.role === 'admin' || user?.id === 1) navItems.push({ id: 'admin', label: 'Admin', icon: LayoutDashboard });

  return (
    <div className="min-h-screen bg-bg-main text-[var(--text-main)]">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[var(--card-bg)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <button className="flex items-center gap-2" onClick={() => { setActiveTab('home'); setSelectedRestaurantId(null); }}>
            <div className="bg-brand-primary p-1.5 rounded-lg"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold tracking-tight">DineWise <span className="text-brand-primary">Live</span></span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map(({ id, label }) => (
              <button key={id} onClick={() => { setActiveTab(id); setSelectedRestaurantId(null); }} className={`text-sm font-bold uppercase tracking-wider ${activeTab === id ? 'text-brand-primary' : 'text-stone-500 hover:text-brand-primary'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-stone-600" />}
            </button>
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold">{user.name}</div>
              <div className="text-[10px] uppercase font-bold text-stone-400">{user.role}</div>
            </div>
            <button onClick={logout} className="p-2 text-stone-400 hover:text-red-500" title="Logout"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-24 min-h-screen">{renderContent()}</main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] border-t border-[var(--border-color)] px-6 py-3 flex justify-between items-center z-40">
        {navItems.slice(0, 4).map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id); setSelectedRestaurantId(null); }} className={activeTab === id ? 'text-brand-primary' : 'text-stone-400'}>
            <Icon className="w-6 h-6" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
