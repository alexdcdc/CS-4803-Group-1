import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useToast } from '@/components/toast/toast-context';
import * as api from '@/services/api-client';
import { supabase } from '@/services/api-client';
import { Comment, ConnectStatus, CreatorEarnings, Project, Reward, User, UserRole } from '@/data/types';
import { makeTempId } from '@/utils/optimistic';

interface PendingState {
  /** Number of in-flight donate calls per project, used to drive UI indicators. */
  donations: Record<string, number>;
  /** Temp project ids that have not yet been confirmed by the server. */
  newProjects: string[];
  /** Per project, the set of temp reward ids that have not yet been confirmed. */
  newRewards: Record<string, string[]>;
  /** Per video, the set of temp comment ids that have not yet been confirmed. */
  comments: Record<string, string[]>;
  /** True while a role toggle is awaiting server confirmation. */
  roleSwap: boolean;
  /** True while updateAccount is in flight. */
  accountSave: boolean;
  /**
   * Set when the user kicks off Stripe Checkout. While present, AppProvider
   * polls /users/me until the balance reflects the recharge or the timeout
   * elapses. Frontend shows a "pending recharge" indicator on the wallet.
   */
  checkout: { credits: number; expectedMinBalance: number; startedAt: number } | null;
}

const EMPTY_PENDING: PendingState = {
  donations: {},
  newProjects: [],
  newRewards: {},
  comments: {},
  roleSwap: false,
  accountSave: false,
  checkout: null,
};

interface AppState {
  user: User | null;
  projects: Project[];
  loading: boolean;
  pending: PendingState;
  /** Cached comment lists per video id; populated on demand by loadVideoComments. */
  commentsByVideo: Record<string, Comment[]>;
  /** Per-video comment counts. Seeded from the feed payload, then kept in sync with mutations. */
  commentCounts: Record<string, number>;
}

interface AppActions {
  refresh: () => Promise<void>;
  donate: (projectId: string, amount: number) => Promise<{ success: boolean; rewardsUnlocked: Reward[] }>;
  startCreditCheckout: (credits: number, returnUrl: string) => Promise<{ url: string; sessionId: string }>;
  /** Begin polling /users/me for an expected balance bump after Stripe Checkout. */
  beginCheckoutPolling: (credits: number) => void;
  /** Stop the polling loop (called when the user cancels checkout). */
  cancelCheckoutPolling: () => void;
  createCampaign: (data: { title: string; description: string; goalCredits: number }) => Promise<Project>;
  addReward: (projectId: string, reward: Omit<Reward, 'id'>) => Promise<void>;
  searchProjects: (query: string) => Promise<Project[]>;
  convertCredits: (amount: number) => Promise<{ dollarAmount: number }>;
  getCreatorEarningsSummary: () => Promise<CreatorEarnings>;
  getConnectStatus: () => Promise<ConnectStatus>;
  startCreatorOnboarding: () => Promise<{ url: string }>;
  setUserRole: (role: UserRole) => Promise<void>;
  toggleUserRole: () => Promise<void>;
  recordInteraction: (videoId: string, type: 'like' | 'dislike' | 'view') => Promise<void>;
  loadVideoComments: (videoId: string) => Promise<void>;
  addVideoComment: (videoId: string, text: string) => Promise<Comment | null>;
  deleteVideoComment: (videoId: string, commentId: string) => Promise<void>;
  /** Seed the per-video comment count (called from the feed loader). */
  setCommentCount: (videoId: string, count: number) => void;
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

const CHECKOUT_TIMEOUT_MS = 60_000;
const CHECKOUT_POLL_MS = 1_000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingState>(EMPTY_PENDING);
  const [commentsByVideo, setCommentsByVideo] = useState<Record<string, Comment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Refs that always hold the latest state for use inside async closures.
  const userRef = useRef<User | null>(null);
  const projectsRef = useRef<Project[]>([]);
  userRef.current = user;
  projectsRef.current = projects;

  const refresh = useCallback(async () => {
    const [u, p] = await Promise.all([api.getUser(), api.getProjects()]);
    setUser(u);
    setProjects(p);
    setLoading(false);
  }, []);

  // Background-only refresh: same as refresh() but doesn't surface failures
  // (callers use this after a successful mutation to reconcile server state).
  const refreshSilently = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([api.getUser(), api.getProjects()]);
      setUser(u);
      setProjects(p);
    } catch {
      // ignore — caller already handled the user-facing outcome
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') refresh();
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProjects([]);
        setPending(EMPTY_PENDING);
        setCommentsByVideo({});
        setCommentCounts({});
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  // ── Optimistic helpers ────────────────────────────────────────

  const bumpPendingDonation = useCallback((projectId: string, delta: 1 | -1) => {
    setPending((prev) => {
      const next = (prev.donations[projectId] ?? 0) + delta;
      const donations = { ...prev.donations };
      if (next <= 0) delete donations[projectId];
      else donations[projectId] = next;
      return { ...prev, donations };
    });
  }, []);

  // ── Mutations ─────────────────────────────────────────────────

  const donateFn: AppActions['donate'] = useCallback(
    async (projectId, amount) => {
      const currentUser = userRef.current;
      const currentProjects = projectsRef.current;
      const project = currentProjects.find((p) => p.id === projectId);
      if (!currentUser || !project) {
        return { success: false, rewardsUnlocked: [] };
      }
      if (currentUser.creditBalance < amount) {
        return { success: false, rewardsUnlocked: [] };
      }

      // Apply optimistic deltas. backerCount is only incremented on the
      // user's first donation to this project — we approximate by checking
      // for an existing donation transaction matching the project title.
      const isFirstBack = !currentUser.transactions.some(
        (t) => t.type === 'donation' && t.label.includes(project.title),
      );
      setUser((u) => (u ? { ...u, creditBalance: u.creditBalance - amount } : u));
      setProjects((ps) =>
        ps.map((p) =>
          p.id === projectId
            ? {
                ...p,
                raisedCredits: p.raisedCredits + amount,
                backerCount: p.backerCount + (isFirstBack ? 1 : 0),
              }
            : p,
        ),
      );
      bumpPendingDonation(projectId, 1);

      try {
        const result = await api.donate(projectId, amount);
        // Server is authoritative now — pull fresh user (for unlocked rewards
        // and accurate transaction list) and projects (for stats).
        refreshSilently();
        return result;
      } catch (err) {
        // Revert optimistic deltas.
        setUser((u) => (u ? { ...u, creditBalance: u.creditBalance + amount } : u));
        setProjects((ps) =>
          ps.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  raisedCredits: Math.max(0, p.raisedCredits - amount),
                  backerCount: Math.max(0, p.backerCount - (isFirstBack ? 1 : 0)),
                }
              : p,
          ),
        );
        toast.show(
          err instanceof Error && err.message.includes('insufficient')
            ? 'Insufficient credits'
            : `Donation failed — restored ${amount} credits`,
          'error',
        );
        return { success: false, rewardsUnlocked: [] };
      } finally {
        bumpPendingDonation(projectId, -1);
      }
    },
    [bumpPendingDonation, refreshSilently, toast],
  );

  const startCreditCheckoutFn: AppActions['startCreditCheckout'] = useCallback(
    (credits, returnUrl) => api.startCreditCheckout(credits, returnUrl),
    [],
  );

  const beginCheckoutPolling: AppActions['beginCheckoutPolling'] = useCallback((credits) => {
    const balance = userRef.current?.creditBalance ?? 0;
    setPending((prev) => ({
      ...prev,
      checkout: { credits, expectedMinBalance: balance + credits, startedAt: Date.now() },
    }));
  }, []);

  const cancelCheckoutPolling: AppActions['cancelCheckoutPolling'] = useCallback(() => {
    setPending((prev) => ({ ...prev, checkout: null }));
  }, []);

  // Polling loop: when checkout is pending, hit /users/me every second until
  // the balance has risen by the purchased amount (Stripe webhook landed) or
  // the timeout elapses.
  useEffect(() => {
    const checkout = pending.checkout;
    if (!checkout) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - checkout.startedAt > CHECKOUT_TIMEOUT_MS) {
        setPending((prev) => (prev.checkout === checkout ? { ...prev, checkout: null } : prev));
        toast.show('Stripe is taking longer than usual — pull to refresh.', 'info');
        return;
      }
      const fresh = await api.getUser().catch(() => null);
      if (cancelled) return;
      if (fresh && fresh.creditBalance >= checkout.expectedMinBalance) {
        setUser(fresh);
        setPending((prev) => (prev.checkout === checkout ? { ...prev, checkout: null } : prev));
        toast.show(`+${checkout.credits.toLocaleString()} credits added`, 'success');
      }
    };

    tick();
    const id = setInterval(tick, CHECKOUT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pending.checkout, toast]);

  const createCampaignFn: AppActions['createCampaign'] = useCallback(
    async (data) => {
      const tempId = makeTempId('proj');
      const tempProject: Project = {
        id: tempId,
        title: data.title,
        description: data.description,
        goalCredits: data.goalCredits,
        creatorName: userRef.current?.name ?? 'You',
        raisedCredits: 0,
        backerCount: 0,
        videos: [],
        rewards: [],
        isOwned: true,
      };
      setProjects((ps) => [tempProject, ...ps]);
      setPending((prev) => ({ ...prev, newProjects: [...prev.newProjects, tempId] }));

      try {
        const real = await api.createCampaign(data);
        // Swap the temp project for the server one.
        setProjects((ps) => ps.map((p) => (p.id === tempId ? real : p)));
        return real;
      } catch (err) {
        setProjects((ps) => ps.filter((p) => p.id !== tempId));
        toast.show('Could not create campaign — try again', 'error');
        throw err;
      } finally {
        setPending((prev) => ({
          ...prev,
          newProjects: prev.newProjects.filter((id) => id !== tempId),
        }));
      }
    },
    [toast],
  );

  const addRewardFn: AppActions['addReward'] = useCallback(
    async (projectId, reward) => {
      const tempId = makeTempId('reward');
      const tempReward: Reward = { id: tempId, ...reward };
      setProjects((ps) =>
        ps.map((p) =>
          p.id === projectId ? { ...p, rewards: [...p.rewards, tempReward] } : p,
        ),
      );
      setPending((prev) => ({
        ...prev,
        newRewards: {
          ...prev.newRewards,
          [projectId]: [...(prev.newRewards[projectId] ?? []), tempId],
        },
      }));

      try {
        await api.addReward(projectId, reward);
        // Server stored the reward but we don't get its real id back from the
        // API — refresh in the background to swap the temp reward for the real
        // one (so future donations match by id).
        refreshSilently();
      } catch (err) {
        setProjects((ps) =>
          ps.map((p) =>
            p.id === projectId
              ? { ...p, rewards: p.rewards.filter((r) => r.id !== tempId) }
              : p,
          ),
        );
        toast.show('Could not add reward — try again', 'error');
        throw err;
      } finally {
        setPending((prev) => {
          const list = (prev.newRewards[projectId] ?? []).filter((id) => id !== tempId);
          const newRewards = { ...prev.newRewards };
          if (list.length === 0) delete newRewards[projectId];
          else newRewards[projectId] = list;
          return { ...prev, newRewards };
        });
      }
    },
    [refreshSilently, toast],
  );

  const searchFn: AppActions['searchProjects'] = useCallback((query) => api.searchProjects(query), []);

  const convertFn: AppActions['convertCredits'] = useCallback(
    async (amount) => {
      const result = await api.convertCreditsToMoney(amount);
      // Cashout affects the transaction ledger; pull fresh data in background.
      refreshSilently();
      return result;
    },
    [refreshSilently],
  );

  const setUserRoleFn: AppActions['setUserRole'] = useCallback(
    async (role) => {
      const previous = userRef.current?.role;
      setUser((u) => (u ? { ...u, role, hasCompletedOnboarding: true } : u));
      try {
        await api.setUserRole(role);
      } catch (err) {
        if (previous) {
          setUser((u) => (u ? { ...u, role: previous } : u));
        }
        toast.show('Could not set role', 'error');
        throw err;
      }
    },
    [toast],
  );

  const toggleUserRoleFn: AppActions['toggleUserRole'] = useCallback(async () => {
    const previous = userRef.current?.role;
    if (!previous) return;
    const next: UserRole = previous === 'creator' ? 'backer' : 'creator';
    setUser((u) => (u ? { ...u, role: next } : u));
    setPending((prev) => ({ ...prev, roleSwap: true }));
    try {
      await api.toggleUserRole();
    } catch (err) {
      setUser((u) => (u ? { ...u, role: previous } : u));
      toast.show('Could not switch role', 'error');
    } finally {
      setPending((prev) => ({ ...prev, roleSwap: false }));
    }
  }, [toast]);

  const recordInteractionFn: AppActions['recordInteraction'] = useCallback(
    async (videoId, type) => {
      try {
        await api.recordInteraction(videoId, type);
      } catch {
        // Interactions are low-stakes; surface a quiet toast and let the
        // caller decide whether to revert local UI state.
        if (type !== 'view') toast.show('Could not save reaction', 'info');
      }
    },
    [toast],
  );

  const setCommentCountFn: AppActions['setCommentCount'] = useCallback((videoId, count) => {
    setCommentCounts((prev) => (prev[videoId] === count ? prev : { ...prev, [videoId]: count }));
  }, []);

  const loadVideoCommentsFn: AppActions['loadVideoComments'] = useCallback(async (videoId) => {
    try {
      const list = await api.getVideoComments(videoId);
      setCommentsByVideo((prev) => ({ ...prev, [videoId]: list }));
      setCommentCounts((prev) => ({ ...prev, [videoId]: list.length }));
    } catch {
      // Silent — the modal will show whatever cached/empty state it has.
    }
  }, []);

  const addVideoCommentFn: AppActions['addVideoComment'] = useCallback(
    async (videoId, text) => {
      const currentUser = userRef.current;
      if (!currentUser) {
        toast.show('Sign in to comment', 'info');
        return null;
      }
      const trimmed = text.trim();
      if (!trimmed) return null;

      const tempId = makeTempId('comment');
      const tempComment: Comment = {
        id: tempId,
        videoId,
        userId: currentUser.id,
        userName: currentUser.name,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      setCommentsByVideo((prev) => ({
        ...prev,
        [videoId]: [tempComment, ...(prev[videoId] ?? [])],
      }));
      setCommentCounts((prev) => ({ ...prev, [videoId]: (prev[videoId] ?? 0) + 1 }));
      setPending((prev) => ({
        ...prev,
        comments: { ...prev.comments, [videoId]: [...(prev.comments[videoId] ?? []), tempId] },
      }));

      try {
        const real = await api.addVideoComment(videoId, trimmed);
        setCommentsByVideo((prev) => ({
          ...prev,
          [videoId]: (prev[videoId] ?? []).map((c) => (c.id === tempId ? real : c)),
        }));
        return real;
      } catch {
        setCommentsByVideo((prev) => ({
          ...prev,
          [videoId]: (prev[videoId] ?? []).filter((c) => c.id !== tempId),
        }));
        setCommentCounts((prev) => ({
          ...prev,
          [videoId]: Math.max(0, (prev[videoId] ?? 1) - 1),
        }));
        toast.show('Could not post comment', 'error');
        return null;
      } finally {
        setPending((prev) => {
          const list = (prev.comments[videoId] ?? []).filter((id) => id !== tempId);
          const comments = { ...prev.comments };
          if (list.length === 0) delete comments[videoId];
          else comments[videoId] = list;
          return { ...prev, comments };
        });
      }
    },
    [toast],
  );

  const deleteVideoCommentFn: AppActions['deleteVideoComment'] = useCallback(
    async (videoId, commentId) => {
      const list = commentsByVideo[videoId] ?? [];
      const index = list.findIndex((c) => c.id === commentId);
      if (index < 0) return;
      const removed = list[index];

      setCommentsByVideo((prev) => ({
        ...prev,
        [videoId]: (prev[videoId] ?? []).filter((c) => c.id !== commentId),
      }));
      setCommentCounts((prev) => ({
        ...prev,
        [videoId]: Math.max(0, (prev[videoId] ?? 1) - 1),
      }));

      try {
        await api.deleteVideoComment(commentId);
      } catch {
        setCommentsByVideo((prev) => {
          const current = prev[videoId] ?? [];
          const next = current.slice();
          next.splice(Math.min(index, next.length), 0, removed);
          return { ...prev, [videoId]: next };
        });
        setCommentCounts((prev) => ({ ...prev, [videoId]: (prev[videoId] ?? 0) + 1 }));
        toast.show('Could not delete comment', 'error');
      }
    },
    [commentsByVideo, toast],
  );

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
    setProjects([]);
    setPending(EMPTY_PENDING);
    setCommentsByVideo({});
    setCommentCounts({});
  }, []);

  const forgotPasswordFn: AppActions['forgotPassword'] = useCallback(
    (email) => api.forgotPassword(email),
    [],
  );

  const updateAccountFn: AppActions['updateAccount'] = useCallback(
    async (data) => {
      const previous = userRef.current;
      // Apply local profile edits immediately (only fields that affect display).
      if (previous && (data.name || data.email)) {
        setUser({
          ...previous,
          name: data.name?.trim() || previous.name,
          email: data.email?.trim() || previous.email,
        });
      }
      setPending((prev) => ({ ...prev, accountSave: true }));
      try {
        const result = await api.updateAccount(data);
        if (!result.success && previous) {
          setUser(previous);
        } else {
          // Pull canonical user (e.g. server may sanitize email).
          refreshSilently();
        }
        return result;
      } catch (err) {
        if (previous) setUser(previous);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Update failed',
        };
      } finally {
        setPending((prev) => ({ ...prev, accountSave: false }));
      }
    },
    [refreshSilently],
  );

  const deleteAccountFn: AppActions['deleteAccount'] = useCallback(async () => {
    await api.deleteAccount();
    setUser(null);
    setProjects([]);
    setPending(EMPTY_PENDING);
    setCommentsByVideo({});
    setCommentCounts({});
  }, []);

  const value = useMemo<AppState & AppActions>(
    () => ({
      user,
      projects,
      loading,
      pending,
      commentsByVideo,
      commentCounts,
      refresh,
      donate: donateFn,
      startCreditCheckout: startCreditCheckoutFn,
      beginCheckoutPolling,
      cancelCheckoutPolling,
      createCampaign: createCampaignFn,
      addReward: addRewardFn,
      searchProjects: searchFn,
      convertCredits: convertFn,
      getCreatorEarningsSummary: api.getCreatorEarningsSummary,
      getConnectStatus: api.getConnectStatus,
      startCreatorOnboarding: api.startCreatorOnboarding,
      setUserRole: setUserRoleFn,
      toggleUserRole: toggleUserRoleFn,
      recordInteraction: recordInteractionFn,
      loadVideoComments: loadVideoCommentsFn,
      addVideoComment: addVideoCommentFn,
      deleteVideoComment: deleteVideoCommentFn,
      setCommentCount: setCommentCountFn,
      login: loginFn,
      signup: signupFn,
      logout: logoutFn,
      forgotPassword: forgotPasswordFn,
      updateAccount: updateAccountFn,
      deleteAccount: deleteAccountFn,
    }),
    [
      user,
      projects,
      loading,
      pending,
      commentsByVideo,
      commentCounts,
      refresh,
      donateFn,
      startCreditCheckoutFn,
      beginCheckoutPolling,
      cancelCheckoutPolling,
      createCampaignFn,
      addRewardFn,
      searchFn,
      convertFn,
      setUserRoleFn,
      toggleUserRoleFn,
      recordInteractionFn,
      loadVideoCommentsFn,
      addVideoCommentFn,
      deleteVideoCommentFn,
      setCommentCountFn,
      loginFn,
      signupFn,
      logoutFn,
      forgotPasswordFn,
      updateAccountFn,
      deleteAccountFn,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
