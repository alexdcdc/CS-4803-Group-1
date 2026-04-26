export interface Reward {
  id: string;
  title: string;
  description: string;
  minDonation: number;
  /** Simulated file name for the digital reward content */
  fileName?: string;
}

export type VideoStatus =
  | 'pending'
  | 'asset_created'
  | 'preparing'
  | 'ready'
  | 'errored'
  | 'cancelled';

export interface ProjectVideo {
  id: string;
  title: string;
  /** Placeholder color used while the Mux asset isn't ready yet */
  placeholderColor: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status: VideoStatus;
  assetId?: string | null;
  playbackId?: string | null;
  durationSeconds?: number | null;
}

export interface Project {
  id: string;
  title: string;
  creatorName: string;
  description: string;
  goalCredits: number;
  raisedCredits: number;
  backerCount: number;
  videos: ProjectVideo[];
  rewards: Reward[];
  /** Whether the current mock user owns this campaign */
  isOwned: boolean;
}

export interface Transaction {
  id: string;
  type: 'donation' | 'recharge' | 'payout';
  amount: number;
  label: string;
  date: string;
}

export type UserRole = 'backer' | 'creator';

export interface User {
  id: string;
  name: string;
  email: string;
  creditBalance: number;
  transactions: Transaction[];
  role: UserRole;
  hasCompletedOnboarding: boolean;
}

export interface ConnectStatus {
  status: 'not_started' | 'active' | 'transfers_active' | 'pending' | 'restricted' | 'unsupported';
  requirementsDue: string[];
  hasAccount: boolean;
}

export interface CreatorEarnings {
  earnings: number;
  paidOut: number;
  available: number;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}
