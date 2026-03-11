'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveToken, clearToken, getUser, type AuthUser } from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  businessName: string;
  fullName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
    saveToken(data.token);
    setUser(getUser());
    router.push('/dashboard');
  }

  async function googleLogin(idToken: string) {
    const { data } = await api.post<{ token: string }>('/auth/google', { idToken });
    saveToken(data.token);
    setUser(getUser());
    router.push('/dashboard');
  }

  async function register(data: RegisterData) {
    const res = await api.post<{ token: string }>('/auth/register', data);
    saveToken(res.data.token);
    setUser(getUser());
    router.push('/dashboard');
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
