import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import * as api from '@/services/api-client';
import { supabase } from '@/services/api-client';
import { ConnectStatus, CreatorEarnings, Project, Reward, User, UserRole } from '@/data/types';

interface AppState {
  user: User | null;
  projects: Project[];
  loading: boolean;
}

interface AppActions {
  refresh: () => Promise<void>;
  donate: (projectId: string, amount: number) => Promise<{ success: boolean; rewardsUnlocked: Reward[] }>;
  startCreditCheckout: (credits: number, returnUrl: string) => Promise<{ url: string; sessionId: string }>;
  createCampaign: (data: { title: string; description: string; goalCredits: number }) => Promise<Project>;
  uploadContent: (projectId: string, title: string) => Promise<void>;
  addReward: (projectId: string, reward: Omit<Reward, 'id'>) => Promise<void>;
  searchProjects: (query: string) => Promise<Project[]>;
  convertCredits: (amount: number) => Promise<{ dollarAmount: number }>;
  getCreatorEarningsSummary: () => Promise<CreatorEarnings>;
  getConnectStatus: () => Promise<ConnectStatus>;
  startCreatorOnboarding: () => Promise<{ url: string }>;
  setUserRole: (role: UserRole) => Promise<void>;
  toggleUserRole: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateAccount: (data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [u, p] = await Promise.all([api.getUser(), api.getProjects()]);
    setUser(u);
    setProjects(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') refresh();
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProjects([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const donateFn: AppActions['donate'] = useCallback(
    async (projectId, amount) => {
      const result = await api.donate(projectId, amount);
      await refresh();
      return result;
    },
    [refresh],
  );

  const startCreditCheckoutFn: AppActions['startCreditCheckout'] = useCallback(async (credits, returnUrl) => {
    return api.startCreditCheckout(credits, returnUrl);
  }, []);

  const createCampaignFn: AppActions['createCampaign'] = useCallback(
    async (data) => {
      const campaign = await api.createCampaign(data);
      await refresh();
      return campaign;
    },
    [refresh],
  );

  const uploadContentFn: AppActions['uploadContent'] = useCallback(
    async (projectId, title) => {
      await api.uploadContent(projectId, title);
      await refresh();
    },
    [refresh],
  );

  const addRewardFn: AppActions['addReward'] = useCallback(
    async (projectId, reward) => {
      await api.addReward(projectId, reward);
      await refresh();
    },
    [refresh],
  );

  const searchFn: AppActions['searchProjects'] = useCallback(async (query) => {
    return api.searchProjects(query);
  }, []);

  const convertFn: AppActions['convertCredits'] = useCallback(
    async (amount) => {
      const result = await api.convertCreditsToMoney(amount);
      await refresh();
      return result;
    },
    [refresh],
  );

  const setUserRoleFn: AppActions['setUserRole'] = useCallback(
    async (role) => {
      await api.setUserRole(role);
      await refresh();
    },
    [refresh],
  );

  const toggleUserRoleFn: AppActions['toggleUserRole'] = useCallback(async () => {
    await api.toggleUserRole();
    await refresh();
  }, [refresh]);

  const loginFn: AppActions['login'] = useCallback(
    async (email, password) => {
      const result = await api.login(email, password);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const signupFn: AppActions['signup'] = useCallback(
    async (name, email, password) => {
      const result = await api.signup(name, email, password);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const logoutFn: AppActions['logout'] = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const forgotPasswordFn: AppActions['forgotPassword'] = useCallback(async (email) => {
    return api.forgotPassword(email);
  }, []);

  const updateAccountFn: AppActions['updateAccount'] = useCallback(
    async (data) => {
      const result = await api.updateAccount(data);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const deleteAccountFn: AppActions['deleteAccount'] = useCallback(async () => {
    await api.deleteAccount();
    setUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        projects,
        loading,
        refresh,
        donate: donateFn,
        startCreditCheckout: startCreditCheckoutFn,
        createCampaign: createCampaignFn,
        uploadContent: uploadContentFn,
        addReward: addRewardFn,
        searchProjects: searchFn,
        convertCredits: convertFn,
        getCreatorEarningsSummary: api.getCreatorEarningsSummary,
        getConnectStatus: api.getConnectStatus,
        startCreatorOnboarding: api.startCreatorOnboarding,
        setUserRole: setUserRoleFn,
        toggleUserRole: toggleUserRoleFn,
        login: loginFn,
        signup: signupFn,
        logout: logoutFn,
        forgotPassword: forgotPasswordFn,
        updateAccount: updateAccountFn,
        deleteAccount: deleteAccountFn,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
