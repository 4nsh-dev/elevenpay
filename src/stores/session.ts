import { create } from 'zustand';

interface SessionState {
  userId: string | null;
  email: string | null;
  username: string | null;
  fullName: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (session: {
    userId: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  }) => void;
  setBootstrapping: (isBootstrapping: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  email: null,
  username: null,
  fullName: null,
  isAuthenticated: false,
  isBootstrapping: true,
  setSession: ({ userId, email, username, fullName }) =>
    set({ userId, email, username, fullName, isAuthenticated: true, isBootstrapping: false }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clearSession: () =>
    set({
      userId: null,
      email: null,
      username: null,
      fullName: null,
      isAuthenticated: false,
      isBootstrapping: false,
    }),
}));
