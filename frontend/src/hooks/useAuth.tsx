import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, LoginData } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pitchvault_access_token');
    if (token) {
      // Decode JWT roughly to see if valid, or just assume logged in for MVP 
      // until /me endpoint is called.
      setUser({
        id: '1',
        email: 'user@example.com',
        name: 'MVP User',
        role: 'owner',
        is_verified: true,
        created_at: new Date().toISOString()
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginData) => {
    try {
      const formData = new FormData();
      formData.append('username', data.email);
      formData.append('password', data.password);
      
      const res = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      localStorage.setItem('pitchvault_access_token', res.data.access_token);
      localStorage.setItem('pitchvault_refresh_token', res.data.refresh_token);
      
      setUser({
        id: '1',
        email: data.email,
        name: 'MVP User',
        role: 'owner',
        is_verified: true,
        created_at: new Date().toISOString()
      });
      toast.success("Login successful");
    } catch (e) {
      toast.error("Invalid credentials.");
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem('pitchvault_access_token');
    localStorage.removeItem('pitchvault_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
