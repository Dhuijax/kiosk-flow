'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  const logout = useCallback(() => {
    setToken(null);
    setTenantId(null);
    setBranchIdState(null);
    setUser(null);
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('branch_id');
      localStorage.removeItem('user');
    }
    
    // Remove cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    }
  }, []);

  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return undefined;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    const initializeAuth = () => {
      try {
        const savedToken = getCookie('auth_token');
        const savedTenant = localStorage.getItem('tenant_id');
        const savedBranch = localStorage.getItem('branch_id');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedTenant) {
          setToken(savedToken);
          setTenantId(savedTenant);
          setBranchIdState(savedBranch);
          if (savedUser) setUser(JSON.parse(savedUser));
        } else {
          // Clean up if something is missing
          if (!savedToken) logout();
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);

  const login = (newToken: string, newTenantId: string, bId: string, newUser: AuthUser) => {
    setToken(newToken);
    setTenantId(newTenantId);
    setBranchIdState(bId);
    setUser(newUser);
    
    // Store metadata in localStorage
    localStorage.setItem('tenant_id', newTenantId);
    localStorage.setItem('branch_id', bId);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Set cookie for middleware with stricter attributes
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    document.cookie = `auth_token=${newToken}; path=/; max-age=86400; SameSite=Strict; ${secure}`;
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
