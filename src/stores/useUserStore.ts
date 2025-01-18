import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppUser, UserAnalytics } from '../types/user';
import { AnalyticsService } from '../services/analyticsService';
import { API_URL } from '../config/constants';

interface UserState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  updateAnalytics: (data: Partial<UserAnalytics>) => Promise<void>;
  getAnalytics: () => UserAnalytics;
  getAllUsers: () => Promise<AppUser[]>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateAnalytics: async (data) => {
        set((state) => {
          if (!state.user) return state;
          
          const newState = {
            user: {
              ...state.user,
              analytics: {
                ...state.user.analytics,
                ...data,
                lastActiveDate: new Date().toISOString(),
              },
            }
          };
          
          AnalyticsService.updateAnalytics(
            newState.user.id,
            newState.user.analytics
          );
          
          return newState;
        });
      },
      getAnalytics: () => {
        return get().user?.analytics || {
          totalRecordingMinutes: 0,
          totalExports: 0,
          totalShares: 0,
          lastActiveDate: new Date().toISOString(),
        };
      },
      getAllUsers: async () => {
        try {
          const response = await fetch(`${API_URL}/analytics/users`);
          const data = await response.json();
          return data.users;
        } catch (error) {
          console.error('Failed to fetch users:', error);
          return [];
        }
      },
    }),
    {
      name: 'user-storage',
    }
  )
);