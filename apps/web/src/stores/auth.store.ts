import type { PublicUser } from "@codesense/shared";
import { create } from "zustand";

import { tokenStorage } from "@/lib/token-storage";

export type AuthStatus =
  | "uninitialized"
  | "loading"
  | "authenticated"
  | "unauthenticated";

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  status: AuthStatus;
  setLoading: () => void;
  setSession: (token: string, user: PublicUser) => void;
  setUser: (user: PublicUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: tokenStorage.get(),
  status: "uninitialized",

  setLoading: () => set({ status: "loading" }),

  setSession: (token, user) => {
    tokenStorage.set(token);
    set({ token, user, status: "authenticated" });
  },

  setUser: (user) => set({ user, status: "authenticated" }),

  clearSession: () => {
    tokenStorage.clear();
    set({ token: null, user: null, status: "unauthenticated" });
  }
}));
