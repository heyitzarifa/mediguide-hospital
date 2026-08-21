import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, AuthSession } from '../types';
import { SmartCareAPI } from '../services/api';

interface AuthContextType extends AuthSession {
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: UserRole, department?: string, hospitalId?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('smartcare_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('smartcare_token');
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('smartcare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('smartcare_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('smartcare_token', token);
    } else {
      localStorage.removeItem('smartcare_token');
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await SmartCareAPI.login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name: string, email: string, password: string, role: UserRole, department?: string, hospitalId?: string): Promise<User> => {
    const effectiveHospitalId = hospitalId || localStorage.getItem('smartcare_hospital_id') || undefined;
    const res = await SmartCareAPI.register(name, email, password, role, effectiveHospitalId, department);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smartcare_user');
    localStorage.removeItem('smartcare_token');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
