import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Account, RoomSession } from './api';

type SessionState = {
  token: string | null;
  account: Account | null;
  room: RoomSession | null;
  setAuth: (token: string, account: Account) => void;
  setRoom: (room: RoomSession | null) => void;
  updateAccount: (account: Account) => void;
  clearAuth: () => void;
};

export const useSession = create<SessionState>()(persist((set) => ({
  token: null,
  account: null,
  room: null,
  setAuth: (token, account) => set({ token, account }),
  setRoom: (room) => set({ room }),
  updateAccount: (account) => set({ account }),
  clearAuth: () => set({ token: null, account: null, room: null }),
}), {
  name: 'lanora-web-session',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ token: state.token, account: state.account, room: state.room }) as SessionState,
}));

type Preferences = { theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void };
export const usePreferences = create<Preferences>()(persist((set) => ({
  theme: 'light', setTheme: (theme) => set({ theme }),
}), { name: 'lanora-web-preferences', storage: createJSONStorage(() => localStorage) }));
