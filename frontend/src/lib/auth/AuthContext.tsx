'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface AuthContextType {
  token: string | null;
  tenantId: string | null;
  branchId: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, tenantId: string, branchId: string, user: AuthUser) => void;
  logout: () => void;
  setBranchId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    const initializeAuth = () => {
      const savedToken = getCookie('auth_token');
      const savedTenant = localStorage.getItem('tenant_id');
      const savedBranch = localStorage.getItem('branch_id');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedTenant) {
        setToken(savedToken);
        setTenantId(savedTenant);
        setBranchIdState(savedBranch);
        if (savedUser) setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    };

    // Use a microtask to avoid synchronous setState warning in effect
    void Promise.resolve().then(initializeAuth);
  }, []);

  const login = (token: string, tenantId: string, bId: string, user: AuthUser) => {
    setToken(token);
    setTenantId(tenantId);
    setBranchIdState(bId);
    setUser(user);
    
    // Store metadata in localStorage, but NOT the token
    localStorage.setItem('tenant_id', tenantId);
    localStorage.setItem('branch_id', bId);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Set cookie for middleware with stricter attributes
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    // SameSite=Strict is safer for POS systems
    document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict; ${secure}`;
  };

  const logout = () => {
    setToken(null);
    setTenantId(null);
    setBranchIdState(null);
    setUser(null);
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('user');
    
    // Remove cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
  };

  const setBranchId = (id: string) => {
    setBranchIdState(id);
    localStorage.setItem('branch_id', id);
  };

  return (
    <AuthContext.Provider value={{ token, tenantId, branchId, user, loading, login, logout, setBranchId }}>
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
