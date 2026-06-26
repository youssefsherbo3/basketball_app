import React, { createContext, useContext, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { UserMe } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserMe | null | undefined;
  isLoading: boolean;
  isHeadCoach: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
    },
  });

  const isHeadCoach = user?.role === "head_coach";

  return (
    <AuthContext.Provider value={{ user, isLoading, isHeadCoach }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
