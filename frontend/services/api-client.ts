import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { Comment, ConnectStatus, CreatorEarnings, Project, ProjectVideo, Reward, User, UserRole } from '@/data/types';
import { API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/config';

// ─── Supabase Client (auth only) ──────────────────────────────

const storage =
  Platform.OS === 'web'
    ? undefined // Use default localStorage on web
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    persistSession: true,
  },
});

// ─── Authenticated Fetch Helper ────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; needsEmailVerification?: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, needsEmailVerification: !data.session };
}

export async function resendSignupEmail(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function forgotPassword(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  await supabase.auth.resetPasswordForEmail(email);
  return { success: true };
}

export async function updateAccount(data: {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  return apiFetch('/auth/account', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(): Promise<void> {
  await apiFetch('/auth/account', { method: 'DELETE' });
  await supabase.auth.signOut();
}

// ─── User ──────────────────────────────────────────────────────

export async function getUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    return await apiFetch<User>('/users/me');
  } catch {
    return null;
  }
}

export async function setUserRole(role: UserRole): Promise<void> {
  await apiFetch('/users/me/role', {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function toggleUserRole(): Promise<UserRole> {
  const resp = await apiFetch<{ role: UserRole }>('/users/me/toggle-role', {
    method: 'POST',
  });
  return resp.role;
}

// ─── Projects ──────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export async function getProject(id: string): Promise<Project | undefined> {
  try {
    return await apiFetch<Project>(`/projects/${id}`);
  } catch {
    return undefined;
  }
}

export async function searchProjects(query: string): Promise<Project[]> {
  return apiFetch<Project[]>(`/projects/search?q=${encodeURIComponent(query)}`);
}

export async function createCampaign(data: {
  title: string;
  description: string;
  goalCredits: number;
}): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface CreateVideoUploadResponse {
  video: ProjectVideo;
  uploadUrl: string;
  uploadId: string;
}

export async function createVideoUpload(
  projectId: string,
  videoTitle: string,
): Promise<CreateVideoUploadResponse> {
  return apiFetch<CreateVideoUploadResponse>(`/projects/${projectId}/videos`, {
    method: 'POST',
    body: JSON.stringify({ title: videoTitle }),
  });
}

/**
 * PUT the picked file directly to the Mux upload URL. Works with a local file
 * URI from expo-image-picker on native, or a blob URL on web.
 */
export async function putVideoFile(
  uploadUrl: string,
  fileUri: string,
  contentType?: string,
): Promise<void> {
  const fileRes = await fetch(fileUri);
  const blob = await fileRes.blob();
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    body: blob,
  });
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    throw new Error(`Mux upload failed (${putRes.status}): ${body}`);
  }
}

export async function getProjectVideo(
  projectId: string,
  videoId: string,
): Promise<ProjectVideo> {
  return apiFetch<ProjectVideo>(`/projects/${projectId}/videos/${videoId}`);
}

export async function addReward(
  projectId: string,
  reward: Omit<Reward, 'id'>,
): Promise<void> {
  await apiFetch(`/projects/${projectId}/rewards`, {
    method: 'POST',
    body: JSON.stringify(reward),
  });
}

// ─── Wallet ────────────────────────────────────────────────────

export async function donate(
  projectId: string,
  amount: number,
): Promise<{ success: boolean; rewardsUnlocked: Reward[] }> {
  return apiFetch('/wallet/donate', {
    method: 'POST',
    body: JSON.stringify({ projectId, amount }),
  });
}

export async function startCreditCheckout(
  credits: number,
  returnUrl: string,
): Promise<{ url: string; sessionId: string }> {
  return apiFetch('/wallet/checkout-session', {
    method: 'POST',
    body: JSON.stringify({ credits, returnUrl }),
  });
}

export async function convertCreditsToMoney(
  amount: number,
): Promise<{ dollarAmount: number }> {
  return apiFetch('/wallet/convert', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function getCreatorEarnings(): Promise<number> {
  const resp = await apiFetch<CreatorEarnings>('/wallet/earnings');
  return resp.available;
}

export async function getCreatorEarningsSummary(): Promise<CreatorEarnings> {
  return apiFetch<CreatorEarnings>('/wallet/earnings');
}

export async function getConnectStatus(): Promise<ConnectStatus> {
  return apiFetch<ConnectStatus>('/wallet/connect/status');
}

export async function startCreatorOnboarding(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/wallet/connect/onboarding-link', {
    method: 'POST',
  });
}

// ─── Feed ──────────────────────────────────────────────────────

export interface FeedItem {
  video: ProjectVideo & { videoUrl: string | null };
  project: {
    id: string;
    title: string;
    creatorName: string;
    raisedCredits: number;
    goalCredits: number;
    backerCount: number;
  };
  interaction: {
    liked: boolean;
    disliked: boolean;
  };
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
}

export async function getFeed(limit = 10, offset = 0): Promise<FeedItem[]> {
  return apiFetch<FeedItem[]>(`/feed?limit=${limit}&offset=${offset}`);
}

export async function recordInteraction(
  videoId: string,
  type: 'like' | 'dislike' | 'view',
): Promise<void> {
  await apiFetch('/feed/interactions', {
    method: 'POST',
    body: JSON.stringify({ videoId, type }),
  });
}

// ─── Comments ──────────────────────────────────────────────────

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/videos/${videoId}/comments`);
}

export async function addVideoComment(videoId: string, text: string): Promise<Comment> {
  return apiFetch<Comment>(`/videos/${videoId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function deleteVideoComment(commentId: string): Promise<void> {
  await apiFetch(`/videos/comments/${commentId}`, { method: 'DELETE' });
}
