import { createContext, useContext, useState, type ReactNode } from "react";

import { demoUsers, type Role, type User } from "../types/user";

interface AuthContextValue {
  user: User;
  users: User[];
  setRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(demoUsers[1]);

  const setRole = (role: Role) => {
    const nextUser = demoUsers.find((candidate) => candidate.role === role);
    if (nextUser) {
      setUser(nextUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, users: demoUsers, setRole }}>
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
