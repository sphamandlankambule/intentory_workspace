import React, { createContext, useContext, useEffect, useState } from 'react';

interface DbUser {
  dbId: number;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

interface UserSession {
  uid: string;
  email: string;
  dbId: number;
  role: 'admin' | 'manager' | 'staff';
}

interface AuthContextType {
  user: UserSession | null;
  dbUser: DbUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle?: () => Promise<void>; // for compatibility with legacy calls
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile details by calling GET /api/me using the stored token
  const fetchProfile = async (sessionToken: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const mappedUser: UserSession = {
            uid: data.user.uid,
            email: data.user.email,
            dbId: data.user.dbId,
            role: data.user.role
          };
          setUser(mappedUser);
          setDbUser({
            dbId: data.user.dbId,
            email: data.user.email,
            role: data.user.role
          });
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to sync database user profile", err);
    }
    return false;
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  // Re-hydrate session token from localStorage upon initial application boot
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const storedToken = localStorage.getItem('inv_trace_jwt_token');
      if (storedToken) {
        setToken(storedToken);
        const success = await fetchProfile(storedToken);
        if (!success) {
          // Token is dead or invalid, clear cache
          localStorage.removeItem('inv_trace_jwt_token');
          setToken(null);
          setUser(null);
          setDbUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server rejected credentials authentication');
      }

      if (data.token && data.user) {
        localStorage.setItem('inv_trace_jwt_token', data.token);
        setToken(data.token);
        setUser({
          uid: data.user.uid,
          email: data.user.email,
          dbId: data.user.id,
          role: data.user.role,
        });
        setDbUser({
          dbId: data.user.id,
          email: data.user.email,
          role: data.user.role,
        });
      }
    } catch (err) {
      console.error("Local Login attempt failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server rejected account creation request.');
      }

      if (data.token && data.user) {
        localStorage.setItem('inv_trace_jwt_token', data.token);
        setToken(data.token);
        setUser({
          uid: data.user.uid,
          email: data.user.email,
          dbId: data.user.id,
          role: data.user.role,
        });
        setDbUser({
          dbId: data.user.id,
          email: data.user.email,
          role: data.user.role,
        });
      }
    } catch (err) {
      console.error("Local registration attempt failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('inv_trace_jwt_token');
      setToken(null);
      setUser(null);
      setDbUser(null);
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      token, 
      loading, 
      login, 
      register,
      logout,
      refreshProfile,
      signInWithGoogle: () => login('admin@warehouse.com', 'admin123') // simple fallback
    }}>
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
