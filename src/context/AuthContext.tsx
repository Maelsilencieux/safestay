"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import {
  getUser,
  getToken,
  saveSession,
  clearSession,
  Auth,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isClient: boolean;
  isHotel: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = getUser();
    const storedToken = getToken();
    setUser(storedUser);
    setToken(storedToken);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await Auth.login(email, password);
    if (res.ok && res.data.success) {
      const data = res.data as any;
      const u = data.user as User;
      const t = data.token as string;

      saveSession(t, u);
      setUser(u);
      setToken(t);

      // Normalisation du rôle en minuscules pour éviter tout bug de casse
      const userRole = u?.role?.toLowerCase()?.trim();

      // Debugging utile en console navigateur
      console.log("Utilisateur connecté avec le rôle :", userRole, u);

      // Redirection stricte par rôle avec fallback
      switch (userRole) {
        case "superadmin":
          router.push("/admin/dashboard");
          break;
        case "hotel":
          router.push("/hotel/dashboard");
          break;
        case "client":
          router.push("/fiche");
          break;
        default:
          console.warn("Rôle non reconnu, redirection vers /fiche par défaut :", userRole);
          router.push("/fiche");
          break;
      }

      return { success: true };
    }
    return {
      success: false,
      message: res.data?.message || "Identifiants incorrects",
    };
  }, [router]);

  const logout = useCallback(async () => {
    await Auth.logout();
    clearSession();
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const res = await Auth.me();
    if (res.ok && res.data.success) {
      const u = (res.data as any).user || res.data.data;
      if (u) {
        setUser(u);
        const t = getToken();
        if (t) saveSession(t, u);
      }
    }
  }, []);

  const role = user?.role?.toLowerCase()?.trim();

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isClient: role === "client",
        isHotel: role === "hotel",
        isAdmin: role === "superadmin" || role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}