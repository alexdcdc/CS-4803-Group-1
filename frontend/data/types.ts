export interface Reward {
  id: string;
  title: string;
  description: string;
  minDonation: number;
  /** Simulated file name for the digital reward content */
  fileName?: string;
}

export interface ProjectVideo {
  id: string;
  title: string;
  /** Placeholder color for the wireframe video area */
  placeholderColor: string;
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
