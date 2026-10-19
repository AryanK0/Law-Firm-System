import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { setAuthToken, switchPersona } from "../services/api";
import { demoUsers, type Role, type User } from "../types/user";

interface AuthContextValue {
  user: User;
  users: User[];
  setRole: (role: Role) => void;
  selectUser: (userId: number) => void;
  isLoading: boolean;
  tokenReady: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const savedId =
      typeof window !== "undefined"
        ? Number(localStorage.getItem("lfms_employee_id"))
        : null;
    const found = demoUsers.find((candidate) => candidate.id === savedId);
    return found || demoUsers[1]; // Defaults to Harvey Specter
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tokenReady, setTokenReady] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    switchPersona(user.id)
      .then((tokenData) => {
        if (active && tokenData?.access_token) {
          setAuthToken(tokenData.access_token, user.id);
          setTokenReady(true);
        }
      })
      .catch((err) => {
        console.warn("Persona switch sync error:", err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  const setRole = (role: Role) => {
    const nextUser = demoUsers.find((candidate) => candidate.role === role);
    if (nextUser) {
      setUser(nextUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("lfms_employee_id", String(nextUser.id));
      }
    }
  };

  const selectUser = (userId: number) => {
    const nextUser = demoUsers.find((candidate) => candidate.id === userId);
    if (nextUser) {
      setUser(nextUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("lfms_employee_id", String(nextUser.id));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users: demoUsers,
        setRole,
        selectUser,
        isLoading,
        tokenReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
