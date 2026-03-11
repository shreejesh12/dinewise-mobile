import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';
import { syncUserProfileToFirebase } from './services/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('dinewise_token');
    const savedUser = localStorage.getItem('dinewise_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('dinewise_token', newToken);
    localStorage.setItem('dinewise_user', JSON.stringify(newUser));
    syncUserProfileToFirebase(newUser).catch(console.error);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dinewise_token');
    localStorage.removeItem('dinewise_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
