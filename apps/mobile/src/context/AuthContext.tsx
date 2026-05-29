import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

const API_BASE = "http://localhost:5000/api";

interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  college?: string;
  branch?: string;
  semester?: number;
  isPremium?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  collegeId: string;
  stream: string;
  branch: string;
  semester: number;
  skills?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const posthog = usePostHog();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("cc_token");
      if (storedToken) {
        setToken(storedToken);
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          Sentry.setUser({ id: userData.id, email: userData.email });
          posthog?.identify(userData.id, { email: userData.email, name: userData.name });
        } else {
          await AsyncStorage.removeItem("cc_token");
        }
      }
    } catch {
      // Silent fail on startup
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    setToken(data.token);
    Sentry.setUser({ id: data.user.id, email: data.user.email });
    posthog?.identify(data.user.id, { email: data.user.email, name: data.user.name });
    await AsyncStorage.setItem("cc_token", data.token);
  }

  async function register(regData: RegisterData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    setToken(data.token);
    Sentry.setUser({ id: data.user.id, email: data.user.email });
    posthog?.identify(data.user.id, { email: data.user.email, name: data.user.name });
    await AsyncStorage.setItem("cc_token", data.token);
  }

  async function logout() {
    setUser(null);
    setToken(null);
    Sentry.setUser(null);
    posthog?.reset();
    await AsyncStorage.removeItem("cc_token");
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { API_BASE };
